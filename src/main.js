const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const { googleLogin, linkedinLogin } = require('./auth');

let mainWindow;
let loginWindow;

const MONGO_URI = "mongodb+srv://SpaceWalletRootUser:VvhEnifxJUkA4918@clusterspacewallet.kwbw5gv.mongodb.net/?retryWrites=true&w=majority&tls=true";
const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB successfully!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectToMongoDB();

// Objeto com as URLs dos sites
const sites = {
    chatgpt: 'https://chatgpt.com/auth/login',
    whatsapp: 'https://web.whatsapp.com/',
    telegram: 'https://web.telegram.org/k/',
    gmail: 'https://accounts.google.com/signin/v2/identifier?service=mail',
    outlook: 'https://login.live.com/',
    linkedin: 'https://www.linkedin.com/login',
    messenger: 'https://www.messenger.com',
    wechat: 'https://www.wechat.com',
    snapchat: 'https://www.snapchat.com',
    line: 'https://line.me',
    discord: 'https://discord.com/login',
    skype: 'https://www.skype.com',
    slack: 'https://slack.com/get-started?entry_point=nav_menu#/createnew',
    viber: 'https://www.viber.com',
    kik: 'https://www.kik.com',
    hangouts: 'https://hangouts.google.com',
    microsoftTeams: 'https://www.microsoft.com/en/microsoft-teams/group-chat-software',
    home: `file://${path.join(__dirname, 'home.html')}`
};

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, './assets/spaceapp.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: true,
            webviewTag: true,
            partition: 'persist:mainSession' // Manter sessões persistentes
        }
    });

    // mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.maximize(); 

    // Configurar session para todos os sites
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    session.defaultSession.setUserAgent(userAgent);
    app.commandLine.appendSwitch('ssl-version-min', 'tls1.2');
    
    // Desabilitar restrições de CSP
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"]
            }
        });
    });
    
    // Controlar a abertura de novas janelas
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Verificar se é uma URL que queremos abrir internamente
        const shouldOpenInternally = Object.values(sites).some(siteUrl => 
            url.startsWith(siteUrl) || 
            // Verificar domínios comuns que devem permanecer na aplicação
            ['whatsapp.com', 'web.telegram.org', 'accounts.google.com', 
             'login.live.com', 'linkedin.com', 'messenger.com'].some(domain => 
                url.includes(domain)
            )
        );
            
        if (shouldOpenInternally) {
            // Abrir dentro da aplicação atual
            mainWindow.webContents.loadURL(url);
            return { action: 'deny' };
        }
        
        // Para URLs externas, pode deixar abrir no navegador padrão
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

function createLoginWindow() {
    loginWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, './assets/spaceapp.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    //loginWindow.setMenu(null);
    loginWindow.loadFile(path.join(__dirname, 'login.html'));
}

async function handleUserRegistration(event, name, email, password) {
    const db = client.db('SpaceWalletDB').collection('users');
    if (await db.findOne({ email })) {
        return event.reply('register-failure', 'E-mail já cadastrado');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insertOne({ name, email, password: hashedPassword });
    event.reply('register-success', 'Usuário cadastrado com sucesso');
    loginWindow.loadFile(path.join(__dirname, 'login.html'));
}

function handleLogout() {
    if (mainWindow) mainWindow.close();
    createLoginWindow();
}

app.on('ready', createLoginWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Configurar handler para o evento 'navigate'
ipcMain.on('navigate', (event, siteKey) => {
    if (!sites[siteKey]) return;
    
    // Informe o renderer que estamos mudando de site
    event.reply('site-loading', { title: siteKey });
    
    if (siteKey === 'home') {
        // Carregar página home diretamente na janela principal
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
        return;
    }
    
    // Configurar partição de sessão específica para o site
    const partitionName = `persist:${siteKey}`;
    const siteSession = session.fromPartition(partitionName);
    siteSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    // Desabilitar CSP para esta sessão específica
    siteSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"]
            }
        });
    });

    // Tratamento especial para links que abrem em novas janelas
    siteSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        // Permitir todos os requests, mas monitorando para debugging
        console.log(`Request URL: ${details.url} in ${partitionName}`);
        callback({ cancel: false });
    });
    
    // Carregar a URL diretamente no WebContents da janela principal
    mainWindow.loadURL(sites[siteKey], { 
        partition: partitionName,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' 
    }).catch(err => {
        console.error(`Erro ao carregar ${siteKey}:`, err);
        event.reply('load-error', { error: err.message, site: siteKey });
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
    });
});

// Método alternativo usando webview
ipcMain.on('navigate-webview', (event, siteKey) => {
    if (sites[siteKey]) {
        // Enviar a URL para o renderer process para ser carregada no webview
        event.reply('load-url', { 
            url: sites[siteKey], 
            title: siteKey,
            partition: `persist:${siteKey}`
        });
    }
});

ipcMain.on('login-success', (_, username) => {
    loginWindow.close();
    createMainWindow();
});

ipcMain.on('google-login', async (event) => {
     createMainWindow();
    // try {
    //     const tokens = await googleLogin();
    //     loginWindow.close();
    //     createMainWindow();
    //     event.reply('login-success', tokens);
    // } catch (error) {
    //     console.error('❌ Erro no login do Google:', error);
    //     event.reply('login-failed', 'Falha no login do Google');
    // }
});

ipcMain.on('linkedin-login', async (event) => {
    try {
        const tokens = await linkedinLogin();
        loginWindow.close();
        createMainWindow();
        event.reply('login-success', tokens);
    } catch (error) {
        console.error('❌ Erro no login do LinkedIn:', error);
        event.reply('login-failed', 'Falha no login do LinkedIn');
    }
});

ipcMain.on('open-external', (event, url) => {
    // Verificar se a URL é segura antes de abrir
    if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
    } else {
        console.warn(`Tentativa de abrir URL potencialmente insegura: ${url}`);
    }
});

ipcMain.on('register-user', handleUserRegistration);
ipcMain.on('logout-success', handleLogout);
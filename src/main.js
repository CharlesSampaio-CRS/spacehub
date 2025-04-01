const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const { googleLogin, linkedinLogin } = require('./auth');
const fs = require('fs');
const os = require('os');

let mainWindow;
let loginWindow;
let registerWindow;

// Path for cached session data
const SESSION_CACHE_DIR = path.join(os.homedir(), '.spacewallet', 'sessions');
const GOOGLE_SESSION_FILE = path.join(SESSION_CACHE_DIR, 'google-session.json');

const MONGO_URI = "mongodb+srv://SpaceWalletRootUser:VvhEnifxJUkA4918@clusterspacewallet.kwbw5gv.mongodb.net/?retryWrites=true&w=majority&tls=true";
const client = new MongoClient(MONGO_URI, { tlsAllowInvalidCertificates: true });

// Ensure session cache directory exists
function ensureCacheDirExists() {
    if (!fs.existsSync(SESSION_CACHE_DIR)) {
        fs.mkdirSync(SESSION_CACHE_DIR, { recursive: true });
    }
}

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB successfully!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectToMongoDB();
ensureCacheDirExists();

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
    home: `file://${path.join(__dirname, 'pages/home.html')}`
};

// Save Google session data to disk
function saveGoogleSession(sessionData) {
    try {
        fs.writeFileSync(GOOGLE_SESSION_FILE, JSON.stringify(sessionData, null, 2));
        console.log('Google session data saved successfully');
    } catch (error) {
        console.error('Error saving Google session data:', error);
    }
}

// Load Google session data from disk
function loadGoogleSession() {
    try {
        if (fs.existsSync(GOOGLE_SESSION_FILE)) {
            const data = fs.readFileSync(GOOGLE_SESSION_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading Google session data:', error);
    }
    return null;
}

// Apply Google session to the session object
async function applyGoogleSession(sessionInstance) {
    const sessionData = loadGoogleSession();
    if (!sessionData) return false;
    
    try {
        // Check if session is expired
        if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
            console.log('Google session expired, needs refresh');
            return false;
        }
        
        // Apply cookies from the saved session
        if (sessionData.cookies && sessionData.cookies.length > 0) {
            for (const cookie of sessionData.cookies) {
                await sessionInstance.cookies.set(cookie);
            }
            console.log('Google session cookies applied successfully');
            
            // Store localStorage data if needed
            if (sessionData.localStorage) {
                // This will be used when loading Google services
                global.googleLocalStorage = sessionData.localStorage;
            }
            
            return true;
        }
    } catch (error) {
        console.error('Error applying Google session:', error);
    }
    
    return false;
}

// Capture and save Google session data
async function captureGoogleSession(sessionInstance) {
    try {
        // Get all cookies from Google domains
        const cookies = await sessionInstance.cookies.get({
            domain: '.google.com'
        });
        
        // Add additional domains if needed
        const additionalCookies = await sessionInstance.cookies.get({
            domain: 'accounts.google.com'
        });
        
        const allCookies = [...cookies, ...additionalCookies];
        
        // Prepare session data with expiration (24 hours from now)
        const expiration = new Date();
        expiration.setHours(expiration.getHours() + 24);
        
        const sessionData = {
            cookies: allCookies,
            expiresAt: expiration.toISOString()
        };
        
        saveGoogleSession(sessionData);
        return true;
    } catch (error) {
        console.error('Error capturing Google session:', error);
        return false;
    }
}

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

    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'pages/index.html'));
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
     // Fechar a janela de registro se existir
    if (registerWindow && !registerWindow.isDestroyed()) {
        registerWindow.close();
    }
    loginWindow.setMenu(null);
    loginWindow.loadFile(path.join(__dirname, 'pages/login.html'));
}

async function handleUserRegistration(event, name, email, password) {
    const db = client.db('SpaceWalletDB').collection('users');
    if (await db.findOne({ email })) {
        return event.reply('register-failure', 'E-mail já cadastrado');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insertOne({ name, email, password: hashedPassword });
    event.reply('register-success', 'Usuário cadastrado com sucesso');
    registerWindow.close();
    loginWindow.loadFile(path.join(__dirname, 'login.html'));
}

function handleLogout() {
    if (mainWindow) mainWindow.close();
    createLoginWindow();
}

app.on('ready', createLoginWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });


ipcMain.on('show-register', () => {
    // Fechar a janela de login se existir
    if (loginWindow) {
        loginWindow.close();
    }
    
    // Criar nova janela de registro
    const registerWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        resizable: false,

        icon: path.join(__dirname, './assets/spaceapp.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    registerWindow.setMenu(null);    
    registerWindow.loadFile(path.join(__dirname, 'pages/register.html'));
    
    // Centralizar a janela
    registerWindow.center();
    
    // Limpar referência quando a janela é fechada
    registerWindow.on('closed', () => {
        registerWindow = null;
        // Reabrir a janela de login se necessário
        if (!mainWindow) {
            createLoginWindow();
        }
    });
});

// Configurar handler para o evento 'navigate'
ipcMain.on('navigate', async (event, siteKey) => {
    if (!sites[siteKey]) return;
    
    // Informe o renderer que estamos mudando de site
    event.reply('site-loading', { title: siteKey });
    
    if (siteKey === 'home') {
        // Carregar página home diretamente na janela principal
        mainWindow.loadFile(path.join(__dirname, 'pages/index.html'));
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

    // Verificar se é um serviço do Google e tentar usar sessão armazenada
    if (['gmail', 'hangouts'].includes(siteKey)) {
        const sessionLoaded = await applyGoogleSession(siteSession);
        if (sessionLoaded) {
            console.log(`Using cached Google session for ${siteKey}`);
            
            // Após carregar o site, configurar para interceptar e executar código para restaurar localStorage
            siteSession.webRequest.onCompleted({ urls: ['*://*.google.com/*'] }, () => {
                if (global.googleLocalStorage) {
                    mainWindow.webContents.executeJavaScript(`
                        try {
                            const storageData = ${JSON.stringify(global.googleLocalStorage)};
                            for (const key in storageData) {
                                localStorage.setItem(key, storageData[key]);
                            }
                            console.log('Google localStorage restored');
                        } catch (e) {
                            console.error('Error restoring localStorage:', e);
                        }
                    `);
                }
            });
        }
    }

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
        mainWindow.loadFile(path.join(__dirname, 'pages/index.html'));
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
    try {
        // Check if we have a valid cached session first
        const googleSession = session.fromPartition('persist:gmail');
        const hasCachedSession = await applyGoogleSession(googleSession);
        
        if (hasCachedSession) {
            console.log('✅ Using cached Google session');
            loginWindow.close();
            createMainWindow();
            event.reply('login-success', { provider: 'google', cached: true });
            return;
        }
        
        // If no cached session, proceed with new login
        console.log('No valid cached session, proceeding with Google login flow');
        const googleAuthWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: false,
                partition: 'persist:gmail'
            }
        });
        
        // Load Google login page
        googleAuthWindow.loadURL('https://accounts.google.com/signin');
        
        // Wait for successful login detection
        googleAuthWindow.webContents.on('did-navigate', async (_, url) => {
            if (url.includes('myaccount.google.com') || url.includes('accounts.google.com/signin/v2/challenge/pwd')) {
                // Successfully logged in or in the process
                console.log('Google login detected, capturing session');
                
                // Capture localStorage
                const localStorage = await googleAuthWindow.webContents.executeJavaScript(`
                    Object.keys(localStorage).reduce((obj, key) => {
                        obj[key] = localStorage.getItem(key);
                        return obj;
                    }, {})
                `);
                
                // Salvar localStorage na sessão
                if (localStorage) {
                    const sessionData = loadGoogleSession() || {};
                    sessionData.localStorage = localStorage;
                    saveGoogleSession(sessionData);
                }
                
                // Capture and save session
                await captureGoogleSession(googleSession);
                
                // Close window and continue
                googleAuthWindow.close();
                loginWindow.close();
                createMainWindow();
                event.reply('login-success', { provider: 'google', cached: false });
            }
        });
        
        // Handle window close without login
        googleAuthWindow.on('closed', () => {
            // Check if login was successful by looking for saved session
            const hasSession = fs.existsSync(GOOGLE_SESSION_FILE);
            if (!hasSession) {
                event.reply('login-failed', 'Google login window was closed');
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no login do Google:', error);
        event.reply('login-failed', 'Falha no login do Google');
    }
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
ipcMain.on('show-login', createLoginWindow);

// Add event to clear cached sessions
ipcMain.on('clear-sessions', async (event) => {
    try {
        // Clear Google session file
        if (fs.existsSync(GOOGLE_SESSION_FILE)) {
            fs.unlinkSync(GOOGLE_SESSION_FILE);
        }
        
        // Clear session cookies
        await session.defaultSession.clearStorageData();
        
        // Clear specific partitions
        const partitions = ['persist:gmail', 'persist:hangouts'];
        for (const partition of partitions) {
            const partSession = session.fromPartition(partition);
            await partSession.clearStorageData();
        }
        
        event.reply('sessions-cleared', 'Todas as sessões foram limpas com sucesso');
    } catch (error) {
        console.error('Error clearing sessions:', error);
        event.reply('sessions-cleared', 'Erro ao limpar sessões: ' + error.message);
    }
});
const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const { googleLogin } = require('./auth');

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

function createBrowserViews(sites) {
    const views = {};
    for (const [name, url] of Object.entries(sites)) {
        const view = new BrowserView();
        view.webContents.loadURL(url);
        views[name] = view;
    }
    return views;
}

function setupViewNavigation(views) {
    Object.keys(views).forEach(siteKey => {
        ipcMain.on(`show-${siteKey}`, () => {
            mainWindow.setBrowserView(views[siteKey]);
            updateBounds();
        });
    });
    ipcMain.on('navigate', (_, siteKey) => {
        const activeView = views[siteKey];
        if (activeView) {
            mainWindow.setBrowserView(activeView);
            updateBounds();
        }
    });
}

function updateBounds() {
    const { width, height } = mainWindow.getContentBounds();
    const sidebarWidth = 80;
    const contentWidth = width - sidebarWidth;
    const activeView = mainWindow.getBrowserView();
    if (activeView) activeView.setBounds({ x: sidebarWidth, y: 0, width: contentWidth, height });
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
        }
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.on('resize', updateBounds);
    mainWindow.maximize(); 

    session.defaultSession.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    );
    app.commandLine.appendSwitch('ssl-version-min', 'tls1.2');
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
    const views = createBrowserViews(sites);
    mainWindow.setBrowserView(views.home);
    updateBounds();
    setupViewNavigation(views);
    mainWindow.on('resize', updateBounds);
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
    loginWindow.setMenu(null);
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

ipcMain.on('login-success', (_, username) => {
    loginWindow.close();
    createMainWindow();
});

ipcMain.on('google-login', async (event) => {
    try {
        const tokens = await googleLogin();
        loginWindow.close();
        createMainWindow();
        event.reply('login-success', tokens);
    } catch (error) {
        console.error('❌ Erro no login do Google:', error);
        event.reply('login-failed', 'Falha no login do Google');
    }
});

ipcMain.on('register-user', handleUserRegistration);
ipcMain.on('logout-success', handleLogout);

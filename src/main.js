const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

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

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: true,
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

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
        discord: 'https://discord.com',
        skype: 'https://www.skype.com',
        slack: 'https://slack.com',
        viber: 'https://www.viber.com',
        kik: 'https://www.kik.com',
        hangouts: 'https://hangouts.google.com',
        microsoftTeams: 'https://www.microsoft.com/en/microsoft-teams/group-chat-software'
    };

    const views = {};
    for (const [name, url] of Object.entries(sites)) {
        const view = new BrowserView();
        view.webContents.loadURL(url);
        views[name] = view;
        // Adicionando o view como BrowserView na janela principal
        mainWindow.setBrowserView(view);
        view.setBounds({ x: 0, y: 0, width: 1200, height: 800 });
    }

    function updateBounds() {
        const { width, height } = mainWindow.getContentBounds();
        const sidebarWidth = 80;
        const contentWidth = width - sidebarWidth;
        const activeView = mainWindow.getBrowserView();
        if (activeView) activeView.setBounds({ x: sidebarWidth, y: 0, width: contentWidth, height });
    }

    // Set default view to ChatGPT
    updateBounds();
    mainWindow.on('resize', updateBounds);

    // Update the ipcMain events to use the new site names
    ipcMain.on('navigate', (_, siteKey) => {
        const activeView = views[siteKey];
        if (activeView) {
            mainWindow.setBrowserView(activeView);
            updateBounds();
        }
    });

    ipcMain.on('show-chatgpt', () => { mainWindow.setBrowserView(views.chatgpt); updateBounds(); });
    ipcMain.on('show-whatsapp', () => { mainWindow.setBrowserView(views.whatsapp); updateBounds(); });
    ipcMain.on('show-telegram', () => { mainWindow.setBrowserView(views.telegram); updateBounds(); });
    ipcMain.on('show-gmail', () => { mainWindow.setBrowserView(views.gmail); updateBounds(); });
    ipcMain.on('show-outlook', () => { mainWindow.setBrowserView(views.outlook); updateBounds(); });
    ipcMain.on('show-linkedin', () => { mainWindow.setBrowserView(views.linkedin); updateBounds(); });
    ipcMain.on('show-messenger', () => { mainWindow.setBrowserView(views.messenger); updateBounds(); });
    ipcMain.on('show-wechat', () => { mainWindow.setBrowserView(views.wechat); updateBounds(); });
    ipcMain.on('show-snapchat', () => { mainWindow.setBrowserView(views.snapchat); updateBounds(); });
    ipcMain.on('show-line', () => { mainWindow.setBrowserView(views.line); updateBounds(); });
    ipcMain.on('show-discord', () => { mainWindow.setBrowserView(views.discord); updateBounds(); });
    ipcMain.on('show-skype', () => { mainWindow.setBrowserView(views.skype); updateBounds(); });
    ipcMain.on('show-slack', () => { mainWindow.setBrowserView(views.slack); updateBounds(); });
    ipcMain.on('show-viber', () => { mainWindow.setBrowserView(views.viber); updateBounds(); });
    ipcMain.on('show-kik', () => { mainWindow.setBrowserView(views.kik); updateBounds(); });
    ipcMain.on('show-hangouts', () => { mainWindow.setBrowserView(views.hangouts); updateBounds(); });
    ipcMain.on('show-microsoftTeams', () => { mainWindow.setBrowserView(views.microsoftTeams); updateBounds(); });

  }

function createLoginWindow() {
    loginWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    loginWindow.setMenu(null);
    loginWindow.loadFile(path.join(__dirname, 'login.html'));
}

app.on('ready', createLoginWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.on('login-success', (_, username) => {
    loginWindow.close();
    createMainWindow();
});

ipcMain.on('register-user', async (event, name, email, password) => {
    const db = client.db('SpaceWalletDB').collection('users');

    if (await db.findOne({ email })) {
        return event.reply('register-failure', 'E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insertOne({ name, email, password: hashedPassword });

    event.reply('register-success', 'Usuário cadastrado com sucesso');
    loginWindow.loadFile(path.join(__dirname, 'login.html'));
});

ipcMain.on('logout-success', () => {
    if (mainWindow) mainWindow.close();
    createLoginWindow();
});

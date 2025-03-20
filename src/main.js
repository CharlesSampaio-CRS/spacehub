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

    session.defaultSession.cookies.set({
        url: 'https://www.mercadolivre.com.br',
        name: 'accept-cookies',
        value: 'true',
    }).then(() => {
        console.log('Cookies accepted automatically');
    }).catch(error => {
        console.error('Failed to set cookies:', error);
    });

    const sites = {
        meli: 'https://www.mercadolivre.com.br/vendas',
        amazon: 'https://sellercentral.amazon.com.br/',
        magalu: 'https://universo.magalu.com/',
        shopee: 'https://seller.shopee.com.br/'
    };

    const views = {};
    for (const [name, url] of Object.entries(sites)) {
        const view = new BrowserView();
        view.webContents.loadURL(url);
        views[name] = view;
    }

    function updateBounds() {
        const { width, height } = mainWindow.getContentBounds();
        const sidebarWidth = 80;
        const contentWidth = width - sidebarWidth;
        const activeView = mainWindow.getBrowserView();
        if (activeView) activeView.setBounds({ x: sidebarWidth, y: 0, width: contentWidth, height });
    }

    mainWindow.setBrowserView(views.meli);
    updateBounds();
    mainWindow.on('resize', updateBounds);

    ipcMain.on('show-meli', () => { mainWindow.setBrowserView(views.meli); updateBounds(); });
    ipcMain.on('show-amazon', () => { mainWindow.setBrowserView(views.amazon); updateBounds(); });
    ipcMain.on('show-magalu', () => { mainWindow.setBrowserView(views.magalu); updateBounds(); });
    ipcMain.on('show-shopee', () => { mainWindow.setBrowserView(views.shopee); updateBounds(); });
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

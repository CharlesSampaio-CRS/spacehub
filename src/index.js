const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow = null;
let loginWindow = null;
let registerWindow = null;

require('dotenv').config();

function closeWindow(winRef) {
    if (winRef && !winRef.isDestroyed()) winRef.close();
    return null;
}

function closeAllWindowsExcept(except) {
    if (except !== 'main') mainWindow = closeWindow(mainWindow);
    if (except !== 'login') loginWindow = closeWindow(loginWindow);
    if (except !== 'register') registerWindow = closeWindow(registerWindow);
}

function createMainWindow() {
    closeAllWindowsExcept('main');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, './assets/spaceapp.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            partition: 'persist:mainSession'
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));
    mainWindow.maximize();

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

function createLoginWindow() {
    closeAllWindowsExcept('login');

    loginWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, './assets/spaceapp.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    loginWindow.loadFile(path.join(__dirname, 'pages/login/login.html'));
    loginWindow.on('closed', () => { loginWindow = null; });
}

function createRegisterWindow() {
    closeAllWindowsExcept('register');

    registerWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        resizable: false,
        icon: path.join(__dirname, './assets/spaceapp.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    //registerWindow.setMenu(null);
    registerWindow.loadFile(path.join(__dirname, 'pages/register/register.html'));
    registerWindow.center();

    registerWindow.on('closed', () => { registerWindow = null; });
}

function handleLogout() {
    mainWindow = closeWindow(mainWindow);
    createLoginWindow();
}

app.whenReady().then(() => {
    createLoginWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC HANDLERS
ipcMain.on('login-success', (event, token) => {
    store.set('token', token);
    loginWindow = closeWindow(loginWindow);
    createMainWindow();
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('set-token', token);
    });
});

ipcMain.on('show-register', createRegisterWindow);
ipcMain.on('show-login', createLoginWindow);
ipcMain.on('logout-success', handleLogout);

ipcMain.on('clear-sessions', async (event) => {
    try {
        await session.defaultSession.clearStorageData();
        event.reply('sessions-cleared', 'Sessões limpas com sucesso');
    } catch (error) {
        event.reply('sessions-cleared', 'Erro: ' + error.message);
    }
});

ipcMain.on('open-external', (event, url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

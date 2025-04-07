const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');

let mainWindow;
let loginWindow;
let registerWindow;

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
            partition: 'persist:mainSession' 
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));
    mainWindow.maximize(); 

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    session.defaultSession.setUserAgent(userAgent);
    app.commandLine.appendSwitch('ssl-version-min', 'tls1.2');

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"]
            }
        });
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const shouldOpenInternally = Object.values(sites).some(siteUrl => 
            url.startsWith(siteUrl) ||
            ['whatsapp.com', 'web.telegram.org', 'login.live.com', 'linkedin.com', 'messenger.com'].some(domain => 
                url.includes(domain)
            )
        );

        if (shouldOpenInternally) {
            mainWindow.webContents.loadURL(url);
            return { action: 'deny' };
        }

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

    if (registerWindow && !registerWindow.isDestroyed()) {
        registerWindow.close();
    }

    loginWindow.loadFile(path.join(__dirname, 'pages/login/login.html'));
}

function handleLogout() {
    if (mainWindow) mainWindow.close();
    createLoginWindow();
}

app.on('ready', createLoginWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.on('show-register', () => {
    if (loginWindow) {
        loginWindow.close();
    }

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
    registerWindow.loadFile(path.join(__dirname, 'pages/register/register.html'));
    registerWindow.center();

    registerWindow.on('closed', () => {
        registerWindow = null;
        if (!mainWindow) {
            createLoginWindow();
        }
    });
});

ipcMain.on('navigate', async (event, siteKey) => {
    if (!sites[siteKey]) return;

    event.reply('site-loading', { title: siteKey });

    if (siteKey === 'home') {
        mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));
        return;
    }

    const partitionName = `persist:${siteKey}`;
    const siteSession = session.fromPartition(partitionName);
    siteSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    siteSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"]
            }
        });
    });

    siteSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        console.log(`Request URL: ${details.url} in ${partitionName}`);
        callback({ cancel: false });
    });

    mainWindow.loadURL(sites[siteKey], { 
        partition: partitionName,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' 
    }).catch(err => {
        console.error(`Erro ao carregar ${siteKey}:`, err);
        event.reply('load-error', { error: err.message, site: siteKey });
        mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));
    });
});

ipcMain.on('navigate-webview', (event, siteKey) => {
    if (sites[siteKey]) {
        event.reply('load-url', { 
            url: sites[siteKey], 
            title: siteKey,
            partition: `persist:${siteKey}`
        });
    }
});

ipcMain.on('login-success', () => {
    loginWindow.close();
    createMainWindow();
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
    if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
    } else {
        console.warn(`Tentativa de abrir URL potencialmente insegura: ${url}`);
    }
});

ipcMain.on('logout-success', handleLogout);
ipcMain.on('show-login', createLoginWindow);

ipcMain.on('clear-sessions', async (event) => {
    try {
        await session.defaultSession.clearStorageData();
        event.reply('sessions-cleared', 'Todas as sessões foram limpas com sucesso');
    } catch (error) {
        console.error('Error clearing sessions:', error);
        event.reply('sessions-cleared', 'Erro ao limpar sessões: ' + error.message);
    }
});

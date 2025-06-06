const path = require('path');
const { app, BrowserWindow, ipcMain, Menu, session, shell } = require('electron');
const Store = require('electron-store');
const axios = require('axios');
const qs = require('querystring');
const { autoUpdater } = require('electron-updater');
require('dotenv').config();

const config = require(path.join(__dirname, '../config'));
const store = new Store();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


let mainWindow, loginWindow, registerWindow, authWindow;
let isUpdating = false;
let updateAvailableWindow = null;
let updateReadyWindow = null;

global.sharedObject = {
  env: {
    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI: config.GOOGLE_REDIRECT_URI,
    GOOGLE_CLIENT_SECRET: config.GOOGLE_CLIENT_SECRET
  }
};

ipcMain.handle('get-token', () => store.get('token'));
ipcMain.handle('get-userUuid', () => store.get('userUuid'));

ipcMain.handle('show-context-menu', async (event, currentViewId) => {
  if (!currentViewId) {
    return;
  }

  let template = [];

  if (currentViewId === 'webview-home') {
    template = [
      {
        label: 'Atualizar',
        click: () => {
          event.sender.send('context-menu-command', 'reload-applications');
        },
        icon: path.join(__dirname, 'assets', 'reload.png'),
      },
      { type: 'separator' },
      {
        label: 'Fechar',
        click: () => {
          event.sender.send('context-menu-command', 'close-all-webviews');
        },
        icon: path.join(__dirname, 'assets', 'close.png')
      }
    ];
  } else {
    template = [
      {
        label: 'Atualizar',
        click: () => {
          event.sender.send('context-menu-command', 'reload-current-webview', currentViewId);
        },
        icon: path.join(__dirname, 'assets', 'reload.png')
      },
      { type: 'separator' },
      {
        label: 'Fechar',
        click: () => {
          event.sender.send('context-menu-command', 'close-current-webview', currentViewId);
        },
        icon: path.join(__dirname, 'assets', 'close.png')
      }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup({
    window: event.sender.getOwnerBrowserWindow(),
    x: event.x,
    y: event.y,
    positioningItem: 0
  });
});

function saveToken(token) {
  if (token) {
    const payload = parseJwt(token);
    if (payload) {
      store.set('token', token);
      if (payload.uuid) {
        store.set('userUuid', payload.uuid);
      } else {
        console.warn('UUID not found in token.');
      }
    }
  }
}

function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1];
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (e) {
    console.error('Failed to parse JWT', e);
    return null;
  }
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

  closeAllWindowsExcept('main');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets', 'spacehub.png'),
    title: '',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:mainSession',
      webviewTag: true,
      sandbox: false,
      nativeWindowOpen: true,
      webSecurity: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));
  //mainWindow.setMenu(null);
  mainWindow.maximize();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) || url.includes('accounts.google.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.once('did-finish-load', () => {
    checkForUpdates(); 
  
    setInterval(() => {
      checkForUpdates();
    }, 1800000); 
  });  
}

function createLoginWindow() {
  closeAllWindowsExcept('login');

  loginWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '',
    icon: path.join(__dirname, 'assets', 'spacehub.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  loginWindow.setMenu(null);
  loginWindow.loadFile(path.join(__dirname, 'pages/login/login.html'));
  loginWindow.on('closed', () => { loginWindow = null; });
}

function createRegisterWindow(userData) {
  closeAllWindowsExcept('register');

  registerWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '',
    resizable: false,
    icon: path.join(__dirname, 'assets', 'spacehub.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  registerWindow.setMenu(null);
  registerWindow.loadFile(path.join(__dirname, 'pages/register/register.html'));
  registerWindow.center();

  registerWindow.webContents.on('did-finish-load', () => {
    if (userData) registerWindow.webContents.send('google-user-data', userData);
  });

  registerWindow.on('closed', () => { registerWindow = null; });
}

function closeWindow(winRef) {
  if (winRef && !winRef.isDestroyed()) winRef.close();
  return null;
}

function closeAllWindowsExcept(except) {
  if (except !== 'main') mainWindow = closeWindow(mainWindow);
  if (except !== 'login') loginWindow = closeWindow(loginWindow);
  if (except !== 'register') registerWindow = closeWindow(registerWindow);
  if (except !== 'auth') authWindow = closeWindow(authWindow);
}

function generateFakePassword(email) {
  return `${email}_googleAuth!`;
}

function handleLogout() {
  closeWindow(mainWindow);
  createLoginWindow();
}

ipcMain.on('reload-applications', () => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('reload-applications');
  }
});

ipcMain.on('start-google-login', () => {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.focus();
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${qs.stringify({
    client_id: global.sharedObject.env.GOOGLE_CLIENT_ID,
    redirect_uri: global.sharedObject.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'profile email openid',
    access_type: 'offline',
    prompt: 'consent'
  })}`;

  authWindow = new BrowserWindow({
    width: 500,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:mainSession',
      enableBlinkFeatures: "Popups"
    }
  });

  authWindow.setMenu(null);
  authWindow.loadURL(authUrl);

  authWindow.on('closed', () => { authWindow = null; });

  authWindow.webContents.on('will-redirect', async (event, url) => {
    if (!url.startsWith('http://localhost')) return;

    event.preventDefault();

    try {
      const code = new URL(url).searchParams.get('code');

      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', qs.stringify({
        code,
        client_id: global.sharedObject.env.GOOGLE_CLIENT_ID,
        redirect_uri: global.sharedObject.env.GOOGLE_REDIRECT_URI,
        client_secret: global.sharedObject.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'authorization_code'
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const accessToken = tokenRes.data.access_token;

      const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const { id: googleId, name, email } = userRes.data;
      const fakePassword = generateFakePassword(email);

      try {
        await axios.post('https://spaceapp-digital-api.onrender.com/register', {
          name, email, password: fakePassword, googleId
        });
      } catch (err) {
        if (err.response?.status !== 409) {
          const msg = err.response?.status === 500
            ? 'Error logging in with Google. Please try again.'
            : 'Unexpected error registering with Google.';
          loginWindow.webContents.executeJavaScript(`alert("${msg}");`);
          closeWindow(loginWindow);
          createLoginWindow();
          return;
        }
      }

      const loginRes = await axios.post('https://spaceapp-digital-api.onrender.com/login', {
        email, password: fakePassword
      });

      const token = loginRes.data.token;
      saveToken(token);
      if (loginWindow) loginWindow.webContents.send('google-login-success', { token });
    } catch (error) {
      console.error('Google login error:', error);
      loginWindow?.webContents.send('google-login-failed', error.message);
      closeWindow(loginWindow);
      createLoginWindow();
    } finally {
      closeWindow(authWindow);
    }
  });
});

ipcMain.on('login-success', (event, token) => {
  saveToken(token);
  closeWindow(loginWindow);
  createMainWindow();

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('set-token', token);
  });
});

ipcMain.on('show-register', () => createRegisterWindow());
ipcMain.on('show-login', createLoginWindow);
ipcMain.on('logout-success', handleLogout);
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('cancel-update', (event) => {
  const window = BrowserWindow.getFocusedWindow(); // ou mantenha a referência correta da janela
  if (window) {
    window.close();
  }
});

ipcMain.on('clear-sessions', async (event) => {
  try {
    await session.defaultSession.clearStorageData();
    event.reply('sessions-cleared', 'Sessions cleared successfully');
  } catch (error) {
    event.reply('sessions-cleared', 'Error: ' + error.message);
  }
});

ipcMain.on('open-external', (event, url) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

function checkForUpdates() {
  autoUpdater.checkForUpdates();

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents?.send('update-available', 'A new version is available!');
    showUpdateAvailableWindow();
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents?.send('update-not-available', `App is already on latest version (${app.getVersion()})`);
  });

  autoUpdater.on('error', (err) => {
    console.error('Update check error:', err);
    mainWindow?.webContents?.send('update-error', 'Error checking for updates.');
  });
}

function showUpdateAvailableWindow() {
  if (updateAvailableWindow && !updateAvailableWindow.isDestroyed()) {
    updateAvailableWindow.focus();
    return;
  }

  updateAvailableWindow = new BrowserWindow({
    width: 400,
    height: 250,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  updateAvailableWindow.on('closed', () => {
    updateAvailableWindow = null;
  });
}

autoUpdater.on('update-downloaded', (info) => {
  // Close update available window if open
  if (updateAvailableWindow && !updateAvailableWindow.isDestroyed()) {
    updateAvailableWindow.close();
  }

  // Don't open multiple update ready windows
  if (updateReadyWindow && !updateReadyWindow.isDestroyed()) {
    return;
  }

  updateReadyWindow = new BrowserWindow({
    width: 450,
    height: 450,
    title: 'Update Ready',
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  updateReadyWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Atualização Pronta</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 30px; background-color: #f5f5f5; color: #333; }
        h1 { color: #2c3e50; margin-bottom: 20px; }
        p { margin-bottom: 30px; line-height: 1.5; }
        .button-container { display: flex; justify-content: center; gap: 15px; }
        button { padding: 10px 25px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; transition: background-color 0.3s; }
        #restartBtn { background-color: #27ae60; color: white; }
        #restartBtn:hover { background-color: #2ecc71; }
      </style>
    </head>
    <body>
      <h1>Atualização Pronta para Instalar</h1>
      <p>A versão ${info.version} foi baixada e está pronta para ser instalada.</p>
      <div class="button-container">
        <button id="restartBtn">Reiniciar Agora</button>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        document.getElementById('restartBtn').addEventListener('click', () => {
          ipcRenderer.send('restart-for-update');
        });
      </script>
    </body>
    </html>
  `)}`);


  updateReadyWindow.on('closed', () => {
    updateReadyWindow = null;
  });
});

ipcMain.on('restart-for-update', () => {
  if (isUpdating) return;
  isUpdating = true;

  // Close all windows properly
  const closePromises = BrowserWindow.getAllWindows().map(win => {
    if (!win.isDestroyed()) {
      return new Promise(resolve => {
        win.on('closed', resolve);
        win.close();
      });
    }
    return Promise.resolve();
  });

  Promise.all(closePromises).then(() => {
    autoUpdater.quitAndInstall(true, true);
  }).catch(err => {
    console.error('Error during window closing:', err);
    isUpdating = false;
    createMainWindow();
  });
});

app.whenReady().then(() => {
  createLoginWindow();

  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;
  
  autoUpdater.logger = {
    info: (message) => console.log('AutoUpdater:', message),
    warn: (message) => console.warn('AutoUpdater:', message),
    error: (message) => console.error('AutoUpdater:', message)
  };

  // Initial update check
  autoUpdater.checkForUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

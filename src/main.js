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
ipcMain.handle('get-user-info', () => {
  const user = store.get('user');
  return user || null;
});

ipcMain.handle('update-user-info', (event, userInfo) => {
  store.set('user', userInfo);
  return true;
});

ipcMain.handle('context-menu-command', async (event, command, targetId) => {
  switch (command) {
    case 'reload-applications':
      event.sender.send('context-menu-command', 'reload-applications');
      break;
    case 'close-all-webviews':
      event.sender.send('context-menu-command', 'close-all-webviews');
      break;
    case 'reload-current-webview':
      event.sender.send('context-menu-command', 'reload-current-webview', targetId);
      break;
    case 'close-current-webview':
      event.sender.send('context-menu-command', 'close-current-webview', targetId);
      break;
  }
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
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      plugins: true,
      webgl: true,
      enableRemoteModule: false,
      nodeIntegrationInSubFrames: true,
      backgroundThrottling: false,
      enableBlinkFeatures: 'OutOfBlinkCors',
      spellcheck: false,
      enableWebSQL: false,
      offscreen: false,
      enableHardwareAcceleration: true
    }
  });

  mainWindow.webContents.setMaxListeners(20);

  mainWindow.webContents.setFrameRate(60);
  mainWindow.webContents.setBackgroundThrottling(false);
  
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.session.clearCache();
    }
  }, 3600000);

  mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));
  mainWindow.maximize();
  mainWindow.setMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) || url.includes('accounts.google.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { 
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.removeAllListeners('did-finish-load');
    }
    mainWindow = null; 
  });

  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.removeAllListeners('did-finish-load');
  }
  
  mainWindow.webContents.once('did-finish-load', () => {
    const isDarkMode = store.get('darkMode') === true;
    mainWindow.webContents.send('dark-mode-changed', isDarkMode);
    
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:mainSession'
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:mainSession'
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

  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.removeAllListeners('did-finish-load');
  }
  
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('set-token', token);
  });
});

ipcMain.on('show-register', () => createRegisterWindow());
ipcMain.on('show-login', () => {
  closeWindow(registerWindow);
  createLoginWindow();
});
ipcMain.on('logout-success', () => {
  store.delete('token');
  store.delete('userUuid');
  store.delete('user');
  handleLogout();
});
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

  // Configurar idioma inicial
  const initialLanguage = store.get('language') || 'pt-BR';
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('language-changed', initialLanguage);
    }
  });

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

ipcMain.on('dark-mode-changed', (event, isDark) => {
  store.set('darkMode', isDark);
  // Propagar para todas as janelas
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('dark-mode-changed', isDark);
  }
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.webContents.send('dark-mode-changed', isDark);
  }
  if (registerWindow && !registerWindow.isDestroyed()) {
    registerWindow.webContents.send('dark-mode-changed', isDark);
  }
});

// Gerenciamento de sessões
const userSessions = new Map();

const createUserSession = (userId) => {
  if (userSessions.has(userId)) {
    return userSessions.get(userId);
  }

  const session = session.fromPartition(`persist:user_${userId}`);
  
  // Configurar permissões da sessão
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'fullscreen'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Configurar limites de cache
  session.setCacheSize(100 * 1024 * 1024); // 100MB

  // Configurar limpeza automática
  session.setSpellCheckerDictionaryDownloadEnabled(false);
  session.setSpellCheckerEnabled(false);

  userSessions.set(userId, session);
  return session;
};

const clearUserSession = async (userId) => {
  const session = userSessions.get(userId);
  if (session) {
    try {
      await session.clearCache();
      await session.clearStorageData({
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
      });
      userSessions.delete(userId);
    } catch (error) {
      console.error(`Erro ao limpar sessão do usuário ${userId}:`, error);
    }
  }
};

// Handlers IPC para gerenciamento de sessão
ipcMain.handle('create-user-session', (event, userId) => {
  return createUserSession(userId);
});

ipcMain.handle('clear-user-session', (event, userId) => {
  return clearUserSession(userId);
});

ipcMain.handle('get-user-session', (event, userId) => {
  return userSessions.get(userId);
});

// Modificar o handler de login do Google
ipcMain.handle('handleGoogleLogin', async (event, idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const userId = payload.sub;
    
    // Criar sessão para o usuário
    const userSession = createUserSession(userId);
    
    // Salvar dados do usuário
    const userData = {
      id: userId,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sessionId: `user_${userId}`
    };
    
    return { success: true, user: userData };
  } catch (error) {
    console.error('Erro no login do Google:', error);
    return { success: false, error: error.message };
  }
});

// Modificar o handler de logout
ipcMain.handle('logout', async (event, userId) => {
  try {
    if (userId) {
      // Limpar sessão específica do usuário
      const userSession = userSessions.get(userId);
      if (userSession) {
        await userSession.clearCache();
        await userSession.clearStorageData({
          storages: ['cookies', 'filesystem', 'indexdb', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
        });
        userSessions.delete(userId);
      }
    }
    
    // Limpar todas as outras sessões
    for (const [id, session] of userSessions.entries()) {
      try {
        await session.clearCache();
        await session.clearStorageData({
          storages: ['cookies', 'filesystem', 'indexdb', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
        });
      } catch (error) {
        console.error(`Erro ao limpar sessão ${id}:`, error);
      }
    }
    userSessions.clear();

    // Limpar sessão principal
    const mainSession = session.fromPartition('persist:mainSession');
    await mainSession.clearCache();
    
    // Limpar tudo exceto localStorage
    await mainSession.clearStorageData({
      storages: ['cookies', 'filesystem', 'indexdb', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
    });

    return { success: true };
  } catch (error) {
    console.error('Erro no logout:', error);
    return { success: false, error: error.message };
  }
});

// Adicionar handler de login
ipcMain.handle('login', async (event, { email, password }) => {
  try {
    const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/login', {
      email,
      password
    });
    return data;
  } catch (error) {
    console.error('Login error in main process:', error);
    throw error;
  }
});

// Adicionar handler de registro
ipcMain.handle('register', async (event, { name, email, password }) => {
  try {
    const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/register', {
      name,
      email,
      password
    });
    return { status: 201, data };
  } catch (error) {
    console.error('Register error in main process:', error);
    if (error.response) {
      throw error.response;
    }
    throw error;
  }
});

ipcMain.handle('get-dark-mode', () => {
  return store.get('darkMode') === true;
});

// Adicionar handlers de idioma
ipcMain.handle('get-language', () => store.get('language') || 'pt-BR');

ipcMain.on('language-changed', (event, language) => {
  store.set('language', language);
  // Propagar para todas as janelas
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('language-changed', language);
    }
  });
});

// Handler para criar janela de login
ipcMain.handle('create-login-window', () => {
  createLoginWindow();
});

// Handler para fechar a janela atual
ipcMain.handle('close-current-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
  }
});

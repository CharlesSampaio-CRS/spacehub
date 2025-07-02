const path = require('path');
const { app, BrowserWindow, ipcMain, Menu, session, shell, BrowserView } = require('electron');
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
let linkedInView = null;

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
        console.warn('UUID não encontrado no token.');
      }
    }
  }
}

function parseJwt(token) {
  try {
    if (!token) {
      console.warn('Token não fornecido para parseJwt');
      return null;
    }
    const base64Payload = token.split('.')[1];
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (e) {
    console.error('Falha ao fazer parse do JWT:', e);
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
      enableBlinkFeatures: 'OutOfBlinkCors,Popups'
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
  //mainWindow.setMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.includes('linkedin.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.removeAllListeners('did-finish-load');
    }
  });
  mainWindow.on('closed', () => {
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

  mainWindow.on('resize', () => {
    if (linkedInView) {
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('.webview-wrapper');
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x + 8,
            y: rect.y + 8,
            width: rect.width - 16,
            height: rect.height - 16
          };
        })();
      `).then(bounds => {
        if (bounds && bounds.width && bounds.height) {
          linkedInView.setBounds({
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.round(bounds.width),
            height: Math.round(bounds.height)
          });
        } else {
          const winBounds = mainWindow.getBounds();
          linkedInView.setBounds({ x: 200, y: 0, width: winBounds.width - 200, height: winBounds.height });
        }
      });
    }
  });

  mainWindow.on('minimize', () => {
    if (global.profileMenuWindow && !global.profileMenuWindow.isDestroyed()) {
      global.profileMenuWindow.close();
    }
    if (global.contextMenuWindow && !global.contextMenuWindow.isDestroyed()) {
      global.contextMenuWindow.close();
    }
  });
  mainWindow.on('maximize', () => {
    if (global.profileMenuWindow && !global.profileMenuWindow.isDestroyed()) {
      global.profileMenuWindow.close();
    }
    if (global.contextMenuWindow && !global.contextMenuWindow.isDestroyed()) {
      global.contextMenuWindow.close();
    }
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

async function handleLogout() {
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
      if (!code) {
        throw new Error('Código de autorização não recebido');
      }

      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', qs.stringify({
        code,
        client_id: global.sharedObject.env.GOOGLE_CLIENT_ID,
        redirect_uri: global.sharedObject.env.GOOGLE_REDIRECT_URI,
        client_secret: global.sharedObject.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'authorization_code'
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (!tokenRes.data.access_token) {
        throw new Error('Token de acesso não recebido');
      }

      const accessToken = tokenRes.data.access_token;

      const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userRes.data || !userRes.data.email) {
        throw new Error('Informações do usuário não recebidas');
      }

      const { id: googleId, name, email } = userRes.data;
      const fakePassword = generateFakePassword(email);

      try {
        await axios.post('https://spaceapp-digital-api.onrender.com/register', {
          name, email, password: fakePassword, googleId
        });
      } catch (err) {
        if (err.response?.status !== 409) {
          const msg = err.response?.status === 500
            ? 'Erro ao fazer login com Google. Por favor, tente novamente.'
            : 'Erro inesperado ao registrar com Google.';
          loginWindow.webContents.executeJavaScript(`alert("${msg}");`);
          closeWindow(loginWindow);
          createLoginWindow();
          return;
        }
      }

      const loginRes = await axios.post('https://spaceapp-digital-api.onrender.com/login', {
        email, password: fakePassword
      });

      const token = loginRes.data.data.token;

      if (!token) {
        throw new Error('Token de autenticação não recebido');
      }

      saveToken(token);
      createUserSession(email);
      
      if (loginWindow) {
        loginWindow.webContents.send('google-login-success', { token });
      } else {
        throw new Error('Janela de login não encontrada');
      }
    } catch (error) {
      console.error('Erro no login do Google:', error);
      loginWindow?.webContents.send('google-login-failed', error.message);
      closeWindow(loginWindow);
      createLoginWindow();
    } finally {
      closeWindow(authWindow);
    }
  });
});

ipcMain.on('login-success', async (event, token) => {
  if (!token) {
    console.error('Token não fornecido no login-success');
    return;
  }

  saveToken(token);
  
  // Obter o email do token
  const payload = parseJwt(token);
  if (payload && payload.email) {
    // Criar uma nova sessão para este email
    const sessionInfo = createUserSession(payload.email);
  } else {
  }
  
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

const createUserSession = (email) => {
  
  if (!email) {
    return null;
  }

  if (userSessions.has(email)) {
    return { sessionId: `persist:user_${email}` };
  }

  const userSession = session.fromPartition(`persist:user_${email}`, {
    cache: true,
    persistent: true
  });
  
  // Configurar permissões da sessão
  userSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'fullscreen'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Configurar gerenciamento de cookies
  userSession.cookies.on('changed', (event, cookie, cause, removed) => {
    if (removed) {
      console.log(`Cookie removido: ${cookie.name}`);
    } else {
      console.log(`Cookie modificado: ${cookie.name}`);
    }
  });

  // Configurar limpeza periódica do cache e dados
  setInterval(async () => {
    try {
      await userSession.clearCache();
      await userSession.clearStorageData({
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
      });
      console.log(`Cache e dados limpos para sessão: ${email}`);
    } catch (error) {
      console.error(`Erro ao limpar cache da sessão ${email}:`, error);
    }
  }, 3600000); // A cada hora

  // Configurar proteção contra vazamento de memória
  userSession.setPreloads([path.join(__dirname, 'preload.js')]);

  // Configurar limites de memória através do BrowserWindow
  const tempWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      session: userSession
    }
  });
  
  // Configurar limites de memória para a janela
  tempWindow.webContents.setFrameRate(30); // Reduzir taxa de quadros para economizar memória
  tempWindow.webContents.setBackgroundThrottling(true); // Habilitar throttling em segundo plano
  
  // Fechar a janela temporária após a configuração
  tempWindow.close();

  userSessions.set(email, userSession);
  return { sessionId: `persist:user_${email}` };
};

const clearUserSession = async (email) => {
  const userSession = userSessions.get(email);
  if (userSession) {
    try {
      await userSession.clearCache();
      await userSession.clearStorageData({
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
      });
      userSessions.delete(email);
    } catch (error) {
      console.error(`Erro ao limpar sessão do usuário ${email}:`, error);
    }
  }
};

// Handlers IPC para gerenciamento de sessão
ipcMain.handle('create-user-session', (event, email) => {
  return createUserSession(email);
});

ipcMain.handle('clear-user-session', (event, email) => {
  return clearUserSession(email);
});

ipcMain.handle('get-user-session', (event, email) => {
  return userSessions.has(email) ? { sessionId: `persist:user_${email}` } : null;
});

// Modificar o handler de login
ipcMain.handle('login', async (event, { email, password }) => {
  try {
    const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/login', {
      email,
      password
    });

    let token = null;
    if (data && data.token) {
      token = data.token;
    } else if (data && data.data && data.data.token) {
      token = data.data.token;
    } else if (data && data.access_token) {
      token = data.access_token;
    } else if (data && data.data && data.data.access_token) {
      token = data.data.access_token;
    }


    if (!token) {
      throw new Error('Token de autenticação não recebido no login normal');
    }

    createUserSession(email);

    return data;
  } catch (error) {
    console.error('Login error in main process:', error);
    throw error;
  }
});

// Modificar o handler de registro
ipcMain.handle('register', async (event, { name, email, password }) => {
  try {
    const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/register', {
      name,
      email,
      password
    });

    createUserSession(email);

    return { status: 201, data };
  } catch (error) {
    console.error('Register error in main process:', error);
    
    // Extrair mensagem de erro da resposta da API
    let errorMessage = 'Erro desconhecido ao criar conta';
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Retornar erro estruturado para o front-end
    throw {
      message: errorMessage,
      status: error.response?.status || 500,
      data: error.response?.data || null
    };
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

// Handler para download de atualizações
ipcMain.on('download-update', () => {
  console.log('Iniciando download de atualização...');
  // Aqui você pode implementar a lógica de download de atualização
  // Por enquanto, apenas logamos a ação
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

// Adicionar handler para reiniciar a aplicação
ipcMain.handle('restart-app', () => {
  // Primeiro, salvar o idioma no store
  const currentLanguage = store.get('language');
  store.set('language', currentLanguage);
  
  // Pequeno delay antes de reiniciar
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 100);
});

// Modificar o handler de logout para limpar a sessão
ipcMain.handle('logout', async (event, email) => {
  try {
    // Limpar a sessão do usuário
    if (email) {
      await clearUserSession(email);
      console.log(`Sessão limpa para: ${email}`);
    }

    // Limpar dados do store
    store.delete('token');
    store.delete('userUuid');
    store.delete('user');

    // Fechar janela principal e criar janela de login
    closeWindow(mainWindow);
    createLoginWindow();
    return { success: true };
  } catch (error) {
    console.error('Erro no logout:', error);
    return { success: false, error: error.message };
  }
});

// Adicionar função para limpar todas as sessões
const clearAllSessions = async () => {
  for (const [email, session] of userSessions.entries()) {
    try {
      await session.clearCache();
      await session.clearStorageData({
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
      });
      console.log(`Sessão limpa para: ${email}`);
    } catch (error) {
      console.error(`Erro ao limpar sessão ${email}:`, error);
    }
  }
  userSessions.clear();
};

// Adicionar handler para limpar todas as sessões
ipcMain.handle('clear-all-sessions', async () => {
  await clearAllSessions();
  return { success: true };
});

ipcMain.on('create-webview', (event, webviewId, url) => {
  // Send the webview creation request back to the renderer process
  event.sender.send('create-webview-request', {
    webviewId,
    url,
    isLinkedIn: url.includes('linkedin.com')
  });
});

// Cria o BrowserView do LinkedIn
function createLinkedInView() {
  if (linkedInView) return linkedInView;
  linkedInView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:mainSession',
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  linkedInView.webContents.loadURL('https://www.linkedin.com/');
  return linkedInView;
}

// Mostra o BrowserView do LinkedIn
function showLinkedInView() {
  if (!mainWindow) return;
  if (!linkedInView) createLinkedInView();

  // Ajuste: use o container .webview-wrapper e adicione padding de 8px
  mainWindow.webContents.executeJavaScript(`
    (function() {
      const el = document.querySelector('.webview-wrapper');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x + 8,
        y: rect.y + 8,
        width: rect.width - 16,
        height: rect.height - 16
      };
    })();
  `).then(bounds => {
    if (bounds && bounds.width && bounds.height) {
      mainWindow.setBrowserView(linkedInView);
      linkedInView.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
      linkedInView.setAutoResize({ width: true, height: true });
    } else {
      // fallback para ocupar quase toda a janela, exceto sidebar
      const winBounds = mainWindow.getBounds();
      mainWindow.setBrowserView(linkedInView);
      linkedInView.setBounds({ x: 200, y: 0, width: winBounds.width - 200, height: winBounds.height });
      linkedInView.setAutoResize({ width: true, height: true });
    }
  });
}

// Esconde o BrowserView do LinkedIn
function hideLinkedInView() {
  if (!mainWindow) return;
  mainWindow.setBrowserView(null);
}

ipcMain.on('show-linkedin-view', () => {
  showLinkedInView();
});
ipcMain.on('hide-linkedin-view', () => {
  hideLinkedInView();
});

// Handler para esconder temporariamente o BrowserView do LinkedIn
ipcMain.on('hide-linkedin-view-temporary', () => {
  if (mainWindow && linkedInView) {
    mainWindow.setBrowserView(null);
  }
});

// Handler para restaurar o BrowserView do LinkedIn
ipcMain.on('restore-linkedin-view', () => {
  if (mainWindow && linkedInView) {
    // Checa se o LinkedIn ainda está ativo (opcional: pode receber um flag do renderer)
    mainWindow.setBrowserView(linkedInView);
    // Recalcula o bounds
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const el = document.querySelector('.webview-wrapper');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: rect.x + 8,
          y: rect.y + 8,
          width: rect.width - 16,
          height: rect.height - 16
        };
      })();
    `).then(bounds => {
      if (bounds && bounds.width && bounds.height) {
        linkedInView.setBounds({
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height)
        });
      } else {
        const winBounds = mainWindow.getBounds();
        linkedInView.setBounds({ x: 200, y: 0, width: winBounds.width - 200, height: winBounds.height });
      }
    });
  }
});

ipcMain.on('destroy-linkedin-view', () => {
  if (linkedInView) {
    linkedInView.webContents.destroy();
    linkedInView = null;
    if (mainWindow) mainWindow.setBrowserView(null);
  }
});

ipcMain.on('reload-linkedin-view', () => {
  if (linkedInView) {
    linkedInView.webContents.reload();
  }
});

ipcMain.on('show-context-menu-window', (event, { x, y, currentViewId }) => {
  global.lastContextMenuViewId = currentViewId;
  showContextMenuWindow(x, y, currentViewId);
});

function showContextMenuWindow(x, y, currentViewId) {
  if (global.contextMenuWindow && !global.contextMenuWindow.isDestroyed()) {
    global.contextMenuWindow.close();
  }
  const menuWindow = new BrowserWindow({
    width: 200,
    height: 100,
    x: Math.round(x),
    y: Math.round(y),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    }
  });

  menuWindow.loadFile(path.join(__dirname, 'pages/context-menu/context-menu.html'));

  menuWindow.once('ready-to-show', () => {
    menuWindow.show();
    menuWindow.webContents.send('set-current-view', currentViewId);
    // Envia o tema
    const isDark = store.get('darkMode') === true;
    menuWindow.webContents.send('set-dark-mode', isDark);
  });

  // Fecha ao perder o foco (cobre clique fora, minimizar, trocar de app, etc)
  menuWindow.on('blur', () => {
    if (!menuWindow.isDestroyed()) menuWindow.close();
  });

  global.contextMenuWindow = menuWindow;

  menuWindow.webContents.on('did-finish-load', () => {
    menuWindow.webContents.send('set-current-view', currentViewId);
    // Envia o tema novamente para garantir
    const isDark = store.get('darkMode') === true;
    menuWindow.webContents.send('set-dark-mode', isDark);
  });
}

ipcMain.on('context-menu-command', (event, command) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('context-menu-command', { command, currentViewId: global.lastContextMenuViewId });
  }
});

ipcMain.on('show-profile-menu-window', (event, { x, y, user }) => {
  showProfileMenuWindow(x, y, user);
});

function showProfileMenuWindow(x, y, user) {
  if (global.profileMenuWindow && !global.profileMenuWindow.isDestroyed()) {
    global.profileMenuWindow.close();
  }
  const menuWindow = new BrowserWindow({
    width: 260,
    height: 180,
    x: Math.round(x),
    y: Math.round(y),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    }
  });

  menuWindow.loadFile(path.join(__dirname, 'pages/profile-menu/profile-menu.html'));

  menuWindow.once('ready-to-show', () => {
    menuWindow.show();
    menuWindow.webContents.send('set-profile-data', user);
    // Envia o tema
    const isDark = store.get('darkMode') === true;
    menuWindow.webContents.send('set-dark-mode', isDark);
  });

  // Fecha ao perder o foco (cobre clique fora, minimizar, trocar de app, etc)
  menuWindow.on('blur', () => {
    if (!menuWindow.isDestroyed()) menuWindow.close();
  });

  global.profileMenuWindow = menuWindow;

  menuWindow.webContents.on('did-finish-load', () => {
    menuWindow.webContents.send('set-profile-data', user);
    // Envia o tema novamente para garantir
    const isDark = store.get('darkMode') === true;
    menuWindow.webContents.send('set-dark-mode', isDark);
  });
}

ipcMain.on('profile-menu-action', (event, action) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('profile-menu-action', action);
  }
});

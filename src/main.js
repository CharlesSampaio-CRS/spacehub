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
let slackView = null;
let externalLinkWindows = new Map(); // Para gerenciar janelas de links externos

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

ipcMain.handle('get-user-applications', () => {
  const applications = store.get('userApplications');
  return applications || [];
});

ipcMain.handle('get-trial-status', () => {
  const trialStatus = store.get('trialStatus');
  return trialStatus || null;
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

  // Configurar handler específico para webviews
  mainWindow.webContents.on('new-window', (event, navigationUrl) => {
    // Verificar se é um link do WhatsApp
    if (navigationUrl.includes('web.whatsapp.com') || navigationUrl.includes('wa.me')) {
      // Links internos do WhatsApp - permitir
      return;
    } else if (/^https?:\/\//.test(navigationUrl)) {
      // Links externos - abrir no navegador padrão
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
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
    if (slackView) {
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
          slackView.setBounds({
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.round(bounds.width),
            height: Math.round(bounds.height)
          });
        } else {
          const winBounds = mainWindow.getBounds();
          slackView.setBounds({ x: 200, y: 0, width: winBounds.width - 200, height: winBounds.height });
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
          name, email, password: fakePassword, googleId,
          plan: 'free', // Definir plano como free por padrão
          createdAt: new Date().toISOString() // Incluir data de criação
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
      const token = loginRes.data.token;

      if (!token) {
        throw new Error('Token de autenticação não recebido');
      }

      // Decodificar o token para obter o userUuid
      const payload = parseJwt(token);
      const userUuid = payload?.uuid || payload?.userUuid || loginRes.data.data?.userUuid || loginRes.data.userUuid;
      
      if (!userUuid) {
        throw new Error('UUID do usuário não encontrado');
      }

      // Pré-carregar dados do usuário e aplicações
      try {
        // Buscar dados do usuário
        const userResponse = await axios.get(`https://spaceapp-digital-api.onrender.com/users/${userUuid}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        // Buscar aplicações do usuário
        const spacesResponse = await axios.get(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        // Salvar dados no store para uso posterior
        if (userResponse.data) {
          store.set('user', userResponse.data.data || userResponse.data);
        }
        
        if (spacesResponse.data && spacesResponse.data.data && spacesResponse.data.data.applications) {
          store.set('userApplications', spacesResponse.data.data.applications);
        }

        // Verificar trial status e salvar
        try {
          const trialStatus = await checkTrialStatus(userUuid);
          store.set('trialStatus', trialStatus);
        } catch (trialError) {
          // Fallback: assumir usuário free em trial
          store.set('trialStatus', {
            plan: 'free',
            isInTrial: true,
            daysLeft: 14
          });
        }

      } catch (preloadError) {
        console.error('Erro ao pré-carregar dados no login Google:', preloadError);
        // Continuar mesmo se falhar o pré-carregamento
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
  
  // Destruir TeamsView antigo para garantir sessão correta
  // if (teamsView) { // teamsView foi removido
  //   if (mainWindow) {
  //     mainWindow.removeBrowserView(teamsView);
  //   }
  //   teamsView = null;
  // }

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

ipcMain.on('open-external-link', (event, url) => {
  if (/^https?:\/\//.test(url)) {
    // Abrir links HTTP/HTTPS em janela do Electron
    createExternalLinkWindow(url, 'Link Externo');
  } else if (url.startsWith('tel:') || 
             url.startsWith('mailto:') || 
             url.startsWith('sms:') || 
             url.startsWith('geo:') || 
             url.startsWith('maps:') ||
             url.startsWith('instagram://') ||
             url.startsWith('youtube://') ||
             url.startsWith('twitter://') ||
             url.startsWith('facebook://')) {
    // Links de aplicativos específicos ainda abrem no aplicativo padrão
    shell.openExternal(url);
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

  // Inicializar sistema de trial
  trialManager.startDailyTrialCheck();

  // Remover verificação inicial de atualizações para melhor performance
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Fechar todas as janelas de links externos antes de sair
    closeAllExternalLinkWindows();
    app.quit();
  }
});

app.on('before-quit', () => {
  // Fechar todas as janelas de links externos antes de sair
  closeAllExternalLinkWindows();
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

  // Configurar gerenciamento de downloads (simplificado)
  userSession.on('will-download', (event, item, webContents) => {
    const downloadsPath = app.getPath('downloads');
    const fileName = item.getFilename();
    const filePath = path.join(downloadsPath, fileName);
    item.setSavePath(filePath);
  });

  // Remover limpeza periódica para melhor performance

  // Configurar preload script
  userSession.setPreloads([path.join(__dirname, 'preload.js')]);

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

    // Decodificar o token para obter o userUuid
    const payload = parseJwt(token);
    const userUuid = payload?.uuid || payload?.userUuid || data.data?.userUuid || data.userUuid;
    
    if (!userUuid) {
      throw new Error('UUID do usuário não encontrado');
    }

    // Pré-carregar dados do usuário e aplicações
    try {
      // Buscar dados do usuário
      const userResponse = await axios.get(`https://spaceapp-digital-api.onrender.com/users/${userUuid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Buscar aplicações do usuário
      const spacesResponse = await axios.get(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Salvar dados no store para uso posterior
      if (userResponse.data) {
        const userData = userResponse.data.data || userResponse.data;
        store.set('user', userData);
      }
      
      if (spacesResponse.data && spacesResponse.data.data && spacesResponse.data.data.applications) {
        store.set('userApplications', spacesResponse.data.data.applications);
      }

      // Verificar trial status e salvar
      try {
        const trialStatus = await checkTrialStatus(userUuid);
        store.set('trialStatus', trialStatus);
      } catch (trialError) {
        // Fallback: assumir usuário free em trial
        store.set('trialStatus', {
          plan: 'free',
          isInTrial: true,
          daysLeft: 14
        });
      }

    } catch (preloadError) {
      console.error('Erro ao pré-carregar dados:', preloadError);
      // Continuar mesmo se falhar o pré-carregamento
    }

    createUserSession(email);

    return data;
  } catch (error) {
    console.error('Login error in main process:', error);
    throw error;
  }
});

// Modificar o handler de registro para incluir data de criação
ipcMain.handle('register', async (event, { name, email, password }) => {
  try {
    const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/register', {
      name,
      email,
      password,
      plan: 'free', // Definir plano como free por padrão
      createdAt: new Date().toISOString() // Incluir data de criação
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

    // Limpar dados do store
    store.delete('token');
    store.delete('userUuid');
    store.delete('user');
    store.delete('userApplications');
    store.delete('trialStatus');

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

// Adicionar handler para limpar cache (sem apagar senhas)
ipcMain.handle('clear-cache', async () => {
  try {
    
    // Limpar apenas cache da sessão principal, NÃO storage data
    await session.defaultSession.clearCache();
    
    // Limpar cache de todas as sessões de usuário (apenas cache, não storage)
    for (const [email, userSession] of userSessions.entries()) {
      try {
        await userSession.clearCache();
        console.log(`Cache limpo para sessão: ${email}`);
      } catch (error) {
        console.error(`Erro ao limpar cache da sessão ${email}:`, error);
      }
    }
    
    // Limpar cache dos BrowserViews (LinkedIn e Slack)
    if (linkedInView && linkedInView.webContents) {
      try {
        await linkedInView.webContents.session.clearCache();
        console.log('Cache do LinkedIn limpo');
      } catch (error) {
        console.error('Erro ao limpar cache do LinkedIn:', error);
      }
    }
    
    if (slackView && slackView.webContents) {
      try {
        await slackView.webContents.session.clearCache();
        console.log('Cache do Slack limpo');
      } catch (error) {
        console.error('Erro ao limpar cache do Slack:', error);
      }
    }
    
    // Limpar cache das janelas de links externos
    for (const [url, window] of externalLinkWindows.entries()) {
      if (!window.isDestroyed() && window.webContents) {
        try {
          await window.webContents.session.clearCache();
          console.log(`Cache da janela externa limpo: ${url}`);
        } catch (error) {
          console.error(`Erro ao limpar cache da janela externa ${url}:`, error);
        }
      }
    }
    
    // Limpar cache das outras janelas (login, register, auth) - apenas cache
    const allWindows = [loginWindow, registerWindow, authWindow, mainWindow];
    for (const window of allWindows) {
      if (window && !window.isDestroyed() && window.webContents) {
        try {
          await window.webContents.session.clearCache();
        } catch (error) {
          console.error('Erro ao limpar cache da janela:', error);
        }
      }
    }
    
    // IMPORTANTE: NÃO limpar storage data para preservar autenticação
    return { success: true, message: 'Cache limpo com sucesso (autenticação preservada)' };
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    return { success: false, error: error.message };
  }
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
    x: Math.round(x + 32),
    y: Math.round(y + 32),
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
    // Envia idioma e traduções
    const language = store.get('language') || 'pt-BR';
    menuWindow.webContents.send('set-language', language);
    const translations = require(path.join(__dirname, 'pages/home/translations.js'));
    menuWindow.webContents.send('set-translations', translations);
  });

  // Fecha ao perder o foco (cobre clique fora, minimizar, trocar de app, etc)
  menuWindow.on('blur', () => {
    if (!menuWindow.isDestroyed()) menuWindow.close();
  });

  global.contextMenuWindow = menuWindow;

  menuWindow.webContents.on('did-finish-load', () => {
    menuWindow.webContents.send('set-current-view', currentViewId);
    const isDark = store.get('darkMode') === true;
    menuWindow.webContents.send('set-dark-mode', isDark);
    // Envia idioma e traduções novamente
    const language = store.get('language') || 'pt-BR';
    menuWindow.webContents.send('set-language', language);
    const translations = require(path.join(__dirname, 'pages/home/translations.js'));
    menuWindow.webContents.send('set-translations', translations);
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
    // Envia idioma e traduções
    const language = store.get('language') || 'pt-BR';
    menuWindow.webContents.send('set-language', language);
    const translations = require(path.join(__dirname, 'pages/home/translations.js'));
    menuWindow.webContents.send('set-translations', translations);
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
    // Envia idioma e traduções novamente
    const language = store.get('language') || 'pt-BR';
    menuWindow.webContents.send('set-language', language);
    const translations = require(path.join(__dirname, 'pages/home/translations.js'));
    menuWindow.webContents.send('set-translations', translations);
  });
}

ipcMain.on('profile-menu-action', (event, action) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('profile-menu-action', action);
  }
});

// Cria o BrowserView do Slack
function createSlackView() {
  if (slackView) return slackView;
  slackView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:mainSession',
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  // Definir user agent moderno para Slack
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
  slackView.webContents.setUserAgent(userAgent);
  slackView.webContents.loadURL('https://app.slack.com/client');

  // Handler para novas janelas
  slackView.webContents.setWindowOpenHandler(({ url }) => {
    const isSlack = url.startsWith('https://app.slack.com/');
    if (!isSlack) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // Abrir em nova BrowserWindow com user agent moderno
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:mainSession',
        webSecurity: false,
        allowRunningInsecureContent: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    win.setMenu(null);
    win.webContents.setUserAgent(userAgent);
    win.loadURL(url);

    // Detecta navegação para um workspace e recarrega o slackView principal
    function handleSlackWorkspaceNav(event, navUrl) {
      if (navUrl && navUrl.startsWith('https://app.slack.com/client/')) {
        if (event && event.preventDefault) event.preventDefault();
        if (slackView) {
          slackView.webContents.loadURL(navUrl);
        }
        win.close();
      }
    }
    win.webContents.on('will-navigate', handleSlackWorkspaceNav);
    win.webContents.on('did-navigate', handleSlackWorkspaceNav);
    win.webContents.on('will-redirect', handleSlackWorkspaceNav);
    win.webContents.on('did-navigate-in-page', handleSlackWorkspaceNav);

      // Fallback: polling da URL a cada 1s (reduzido para melhor performance)
  let lastUrl = '';
  const urlPoll = setInterval(() => {
    const currentUrl = win.webContents.getURL();
    if (
      currentUrl &&
      currentUrl.startsWith('https://app.slack.com/client/') &&
      currentUrl !== lastUrl
    ) {
      lastUrl = currentUrl;
      if (slackView) {
        slackView.webContents.loadURL(currentUrl);
      }
      win.close();
      clearInterval(urlPoll);
    }
  }, 1000);

  win.on('closed', () => clearInterval(urlPoll));

    return { action: 'deny' };
  });

  // Garantir que ao selecionar um workspace, a navegação seja carregada na tela principal
  slackView.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('https://app.slack.com/client/')) {
      event.preventDefault();
      slackView.webContents.loadURL(url);
    }
  });

  slackView.webContents.on('context-menu', (event, params) => {
    if (mainWindow) {
      mainWindow.webContents.send('context-menu-command', {
        command: null,
        currentViewId: 'webview-slack',
        x: params.x,
        y: params.y
      });
    }
  });

  return slackView;
}

function showSlackView() {
  if (!mainWindow) return;
  if (!slackView) createSlackView();
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
      mainWindow.setBrowserView(slackView);
      slackView.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
      slackView.setAutoResize({ width: true, height: true });
    } else {
      const winBounds = mainWindow.getBounds();
      mainWindow.setBrowserView(slackView);
      slackView.setBounds({ x: 200, y: 0, width: winBounds.width - 200, height: winBounds.height });
      slackView.setAutoResize({ width: true, height: true });
    }
  });
}

function hideSlackView() {
  if (mainWindow && slackView) {
    mainWindow.removeBrowserView(slackView);
  }
}

ipcMain.on('show-slack-view', () => {
  showSlackView();
});

ipcMain.on('hide-slack-view', () => {
  hideSlackView();
});

ipcMain.on('reload-slack-view', () => {
  if (slackView) {
    slackView.webContents.reload();
  }
});

ipcMain.on('destroy-slack-view', () => {
  if (slackView) {
    if (mainWindow) {
      mainWindow.removeBrowserView(slackView);
    }
    slackView = null;
  }
});

// Função para criar janela de link externo
function createExternalLinkWindow(url, title = 'Link Externo') {
  // Verificar se já existe uma janela para este URL
  if (externalLinkWindows.has(url)) {
    const existingWindow = externalLinkWindows.get(url);
    if (!existingWindow.isDestroyed()) {
      existingWindow.focus();
      return existingWindow;
    } else {
      externalLinkWindows.delete(url);
    }
  }

  // Criar nova janela
  const linkWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: title,
    icon: path.join(__dirname, 'assets', 'spacehub.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:mainSession',
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      plugins: true,
      webgl: true,
      enableRemoteModule: false,
      nodeIntegrationInSubFrames: true,
      backgroundThrottling: false
    }
  });

  // Ocultar menu da janela
  linkWindow.setMenu(null);

  // Configurar user agent moderno
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
  linkWindow.webContents.setUserAgent(userAgent);

  // Carregar a URL
  linkWindow.loadURL(url);

  // Configurar handler para novas janelas (simplificado)
  linkWindow.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    if (/^https?:\/\//.test(newUrl)) {
      createExternalLinkWindow(newUrl, 'Nova Janela');
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Configurar menu de contexto simplificado
  linkWindow.webContents.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Recarregar',
        accelerator: 'CmdOrCtrl+R',
        click: () => linkWindow.webContents.reload()
      },
      {
        label: 'Abrir no Navegador',
        click: () => shell.openExternal(url)
      },
      { type: 'separator' },
      {
        label: 'Fechar',
        accelerator: 'CmdOrCtrl+W',
        click: () => linkWindow.close()
      }
    ]);
    menu.popup({ window: linkWindow });
  });

  // Configurar handler para downloads (simplificado)
  linkWindow.webContents.on('will-download', (event, item, webContents) => {
    const downloadsPath = app.getPath('downloads');
    const fileName = item.getFilename();
    const filePath = path.join(downloadsPath, fileName);
    item.setSavePath(filePath);
  });

  // Configurar handler para fechamento da janela
  linkWindow.on('closed', () => {
    externalLinkWindows.delete(url);
  });

  // Armazenar referência da janela
  externalLinkWindows.set(url, linkWindow);

  // Mostrar a janela
  linkWindow.show();

  return linkWindow;
}

// Função para fechar todas as janelas de links externos
function closeAllExternalLinkWindows() {
  for (const [url, window] of externalLinkWindows.entries()) {
    if (!window.isDestroyed()) {
      window.close();
    }
  }
  externalLinkWindows.clear();
}

// Handler para fechar uma janela de link externo específica
ipcMain.handle('close-external-link-window', (event, url) => {
  if (externalLinkWindows.has(url)) {
    const window = externalLinkWindows.get(url);
    if (!window.isDestroyed()) {
      window.close();
    }
    externalLinkWindows.delete(url);
    return { success: true };
  }
  return { success: false, error: 'Window not found' };
});

// Handler para listar janelas de links externos abertas
ipcMain.handle('get-external-link-windows', () => {
  const windows = [];
  for (const [url, window] of externalLinkWindows.entries()) {
    if (!window.isDestroyed()) {
      windows.push({
        url,
        title: window.getTitle(),
        isVisible: window.isVisible()
      });
    }
  }
  return windows;
});

// Handler para abrir link externo em janela do Electron
ipcMain.handle('open-external-link-window', (event, url, title) => {
  if (/^https?:\/\//.test(url)) {
    const window = createExternalLinkWindow(url, title || 'Link Externo');
    return { success: true, windowId: window.id };
  }
  return { success: false, error: 'Invalid URL' };
});

ipcMain.handle('check-for-updates', async () => {
  return new Promise((resolve, reject) => {
    autoUpdater.once('update-available', (info) => {
      resolve(info.version || true);
    });
    autoUpdater.once('update-not-available', () => {
      resolve(null);
    });
    autoUpdater.once('error', (err) => {
      reject(err);
    });
    autoUpdater.checkForUpdates();
  });
});

ipcMain.on('open-popup-window', (event, url) => {
  const popup = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'Slack Popup',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:mainSession',
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  popup.setMenu(null);
  popup.loadURL(url);
});

// Sistema de Trial Management
const trialManager = {
  // Verificar se usuário está no trial (14 dias)
  isUserInTrial: (userData) => {
    if (!userData || !userData.createdAt) {
      return false;
    }
    
    const createdAt = new Date(userData.createdAt);
    const now = new Date();
    
    // Resetar horários para comparar apenas as datas
    const createdDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calcular diferença em dias
    const timeDiff = currentDate.getTime() - createdDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 14;
  },

  // Verificar se usuário pode ter mais de 3 apps ativos
  canUserHaveMoreApps: (userData) => {
    if (!userData) return false;
    
    // Se for plano pago, pode ter quantos quiser
    if (userData.plan && userData.plan !== 'free') {
      return true;
    }
    
    // Se for free, verificar se ainda está no trial
    return trialManager.isUserInTrial(userData);
  },

  // Limitar aplicações para usuários free fora do trial
  limitApplicationsForFreeUser: (applications) => {
    if (!Array.isArray(applications)) return applications;
    
    // Lista das aplicações que devem permanecer ativas após o trial
    const allowedApps = ['whatsapp', 'discord', 'linkedin'];
    
    // Desativar todas as aplicações exceto as permitidas
    const limitedApps = applications.map(app => {
      const isAllowed = allowedApps.includes(app.application.toLowerCase());
      
      return {
        ...app,
        active: isAllowed
      };
    });
    
    return limitedApps;
  },

  // Calcular próximo horário de execução (00:00)
  getNextExecutionTime: () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  },

  // Verificar se é meia-noite
  isMidnight: () => {
    const now = new Date();
    return now.getHours() === 0 && now.getMinutes() === 0;
  },

  // Job diário para verificar trial status
  startDailyTrialCheck: () => {
    // Função para executar a verificação
    const executeTrialCheck = async () => {
      try {
        // Buscar todos os usuários free
        const response = await axios.get('https://spaceapp-digital-api.onrender.com/users/free-users', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && Array.isArray(response.data.data)) {
          const freeUsers = response.data.data;
          
          for (const user of freeUsers) {
            const isInTrial = trialManager.isUserInTrial(user);
            
            // Verificar se saiu do trial
            if (!isInTrial) {
              // Buscar aplicações do usuário
              const appsResponse = await axios.get(`https://spaceapp-digital-api.onrender.com/spaces/${user.uuid}`, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              if (appsResponse.data && appsResponse.data.data && appsResponse.data.data.applications) {
                const limitedApps = trialManager.limitApplicationsForFreeUser(appsResponse.data.data.applications);
                
                // Atualizar aplicações do usuário
                await axios.put('https://spaceapp-digital-api.onrender.com/spaces', {
                  userUuid: user.uuid,
                  applications: limitedApps
                }, {
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
              }
            }
          }
        }
      } catch (error) {
        // Silenciar erros de rede
      }
    };

    // Função para verificar se deve deslogar usuários
    const checkForLogout = async () => {
      try {
        // Verificar se há usuários logados que saíram do trial
        const response = await axios.get('https://spaceapp-digital-api.onrender.com/users/free-users', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && Array.isArray(response.data.data)) {
          const freeUsers = response.data.data;
          
          for (const user of freeUsers) {
            if (!trialManager.isUserInTrial(user)) {
              // Enviar evento para todas as janelas fecharem
              BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                  window.webContents.send('force-logout', {
                    reason: 'trial_expired',
                    message: 'Seu período de trial expirou. Faça login novamente.'
                  });
                }
              });
            }
          }
        }
      } catch (error) {
        // Silenciar erros de rede
      }
    };

    // Executar verificação imediatamente na primeira vez
    setTimeout(async () => {
      await executeTrialCheck();
    }, 5000);

    // Configurar verificação diária às 00:00
    const scheduleNextExecution = () => {
      const nextExecution = trialManager.getNextExecutionTime();
      const now = Date.now();
      const delay = nextExecution - now;
      
      setTimeout(async () => {
        await executeTrialCheck();
        await checkForLogout(); // Verificar logout à meia-noite
        scheduleNextExecution(); // Agendar próxima execução
      }, delay);
    };

    // Iniciar agendamento
    scheduleNextExecution();

    // Verificação adicional a cada hora para garantir que não perca a meia-noite
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        await executeTrialCheck();
        await checkForLogout();
      }
    }, 60 * 1000); // Verificar a cada minuto
  },

  // Verificação manual (para testes)
  manualCheck: async () => {
    try {
      const response = await axios.get('https://spaceapp-digital-api.onrender.com/users/free-users', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        const freeUsers = response.data.data;
        
        for (const user of freeUsers) {
          const isInTrial = trialManager.isUserInTrial(user);
        }
      }
    } catch (error) {
      // Silenciar erros de rede
    }
  }
};

// Adicionar handler para verificar trial status
ipcMain.handle('check-trial-status', async (event, userUuid) => {
  try {
    // Obter token do usuário atual
    const token = store.get('token');
    
    if (!token) {
      return { isInTrial: false, canHaveMoreApps: false, plan: 'free', daysLeft: 0 };
    }

    const response = await axios.get(`https://spaceapp-digital-api.onrender.com/users/${userUuid}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.data) {
      const userData = response.data.data;      
      const isInTrial = trialManager.isUserInTrial(userData);
      const canHaveMoreApps = trialManager.canUserHaveMoreApps(userData);
      
      return {
        isInTrial,
        canHaveMoreApps,
        plan: userData.plan || 'free',
        createdAt: userData.createdAt,
        daysLeft: isInTrial ? (() => {
          const createdAt = new Date(userData.createdAt);
          const now = new Date();
          
          // Resetar horários para comparar apenas as datas
          const createdDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
          const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          // Calcular diferença em dias
          const timeDiff = currentDate.getTime() - createdDate.getTime();
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          
          console.log('Cálculo de dias:', {
            createdAt: userData.createdAt,
            parsedCreatedAt: createdAt,
            createdDate: createdDate,
            currentDate: currentDate,
            daysDiff: daysDiff,
            daysLeft: Math.max(0, 14 - daysDiff)
          });
          
          return Math.max(0, 14 - daysDiff);
        })() : 0
      };
    }
    
    return { isInTrial: false, canHaveMoreApps: false, plan: 'free', daysLeft: 0 };
  } catch (error) {
    console.error('Erro ao verificar trial status:', error);
    return { isInTrial: false, canHaveMoreApps: false, plan: 'free', daysLeft: 0 };
  }
});

// Handler para limitar aplicações
ipcMain.handle('limit-applications', async (event, userUuid) => {
  try {
    // Obter token do usuário atual
    const token = store.get('token');
    
    if (!token) {
      return { success: false, error: 'Token não encontrado' };
    }

    const response = await axios.get(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.data && response.data.data.applications) {
      const limitedApps = trialManager.limitApplicationsForFreeUser(response.data.data.applications);
      
      await axios.put('https://spaceapp-digital-api.onrender.com/spaces', {
        userUuid: userUuid,
        applications: limitedApps
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      return { success: true, applications: limitedApps };
    }
    
    return { success: false, error: 'Nenhuma aplicação encontrada' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para verificação manual de trial
ipcMain.handle('manual-trial-check', async () => {
  await trialManager.manualCheck();
  return { success: true };
});

// Handler para testar limitação de aplicações
ipcMain.handle('test-application-limitation', async (event, userUuid) => {
  try {
    // Obter token do usuário atual
    const token = store.get('token');
    
    if (!token) {
      return { success: false, error: 'Token não encontrado' };
    }
    
    // Buscar dados do usuário
    const userResponse = await axios.get(`https://spaceapp-digital-api.onrender.com/users/${userUuid}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (userResponse.data && userResponse.data.data) {
      const userData = userResponse.data.data;
      
      // Verificar trial status
      const isInTrial = trialManager.isUserInTrial(userData);
      
      // Buscar aplicações
      const appsResponse = await axios.get(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (appsResponse.data && appsResponse.data.data && appsResponse.data.data.applications) {
        const applications = appsResponse.data.data.applications;
        
        // Aplicar limitação
        const limitedApps = trialManager.limitApplicationsForFreeUser(applications);
        
        // Atualizar no servidor
        const updateResponse = await axios.put('https://spaceapp-digital-api.onrender.com/spaces', {
          userUuid: userUuid,
          applications: limitedApps
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        return { 
          success: true, 
          originalApps: applications,
          limitedApps: limitedApps,
          updateStatus: updateResponse.status
        };
      }
    }
    
    return { success: false, error: 'Dados não encontrados' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para forçar logout
ipcMain.handle('force-logout', async () => {
  try {
    // Limpar dados de autenticação
    store.delete('token');
    store.delete('userUuid');
    store.delete('user');
    store.delete('userApplications');
    store.delete('trialStatus');
    
    // Fechar todas as janelas atuais
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    
    // Criar nova janela de login
    createLoginWindow();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-user-applications', async (event, applications) => {
  try {
    store.set('userApplications', applications);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-trial-status', async (event, trialStatus) => {
  try {
    store.set('trialStatus', trialStatus);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

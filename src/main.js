const path = require('path');
const { app, BrowserWindow, ipcMain, session, shell, dialog } = require('electron');
const Store = require('electron-store');
const axios = require('axios');
const qs = require('querystring');
const { autoUpdater } = require('electron-updater');
require('dotenv').config();

const config = require(path.join(__dirname, '../config'));
const store = new Store(); 

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let mainWindow, loginWindow, registerWindow, authWindow;

global.sharedObject = {
  env: {
    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI: config.GOOGLE_REDIRECT_URI,
    GOOGLE_CLIENT_SECRET: config.GOOGLE_CLIENT_SECRET
  }
};

ipcMain.handle('get-token', () => store.get('token'));
ipcMain.handle('get-userUuid', () => store.get('userUuid'));

function saveToken(token) {
  if (token) {
    const payload = parseJwt(token);
    store.set('token', token); 
    store.set('userUuid', payload.uuid);
  }
}

function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1]; 
    const payload = atob(base64Payload);
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
    icon: path.join(__dirname, './assets/spaceapp.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:mainSession',
      webviewTag: true,
      sandbox: false,
      nativeWindowOpen: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'pages/index/index.html'));
  mainWindow.setMenu(null);
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
    autoUpdater.checkForUpdates();
  });
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

  loginWindow.setMenu(null);
  loginWindow.loadFile(path.join(__dirname, 'pages/login/login.html'));
  loginWindow.on('closed', () => { loginWindow = null; });
}

function createRegisterWindow(userData) {
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
            ? 'Erro ao realizar login com o Google. Tente novamente.'
            : 'Erro inesperado ao registrar com o Google.';
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
      console.error('Erro no login com o Google:', error);
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

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-available', 'Uma nova versão está disponível!');
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-not-available', `O aplicativo já está na versão ${app.getVersion()}`);
  });

  autoUpdater.on('error', (err) => {
    console.error('Erro ao verificar atualizações:', err);
    mainWindow?.webContents.send('update-error', 'Erro ao verificar atualizações.');
  });
});


function checkForUpdates() {
  autoUpdater.checkForUpdates();

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-available', 'Uma nova versão está disponível!');
    showUpdateScreen();  
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-not-available', `O aplicativo já está na versão ${app.getVersion()}`);
  });

  autoUpdater.on('error', (err) => {
    console.error('Erro ao verificar atualizações:', err);
    mainWindow.webContents.send('update-error', 'Erro ao verificar atualizações.');
  });
}

function showUpdateScreen() {
  mainWindow.setIgnoreMouseEvents(true); // Ignora eventos de mouse para impedir interações

  const updateWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false, 
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  updateWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Atualização Disponível</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            background-color: #f4f4f9;
            color: #333;
          }
          h1 {
            color: #007bff;
            font-size: 24px;
          }
          p {
            margin-top: 20px;
            font-size: 16px;
          }
          button {
            margin-top: 30px;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background-color: #0056b3;
          }
        </style>
      </head>
      <body>
        <h1>Nova versão disponível!</h1>
        <p>Ela será baixada em segundo plano.</p>
        <button onclick="window.close()">OK</button>
      </body>
    </html>
  `));

  updateWindow.on('closed', () => {
    updateWindow.close();
  });
}

autoUpdater.on('update-downloaded', () => {
  const updateWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,  
    alwaysOnTop: true, 
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  updateWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Atualização Baixada</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            background-color: #f4f4f9;
            color: #333;
          }
          h1 {
            color: #007bff;
            font-size: 24px;
          }
          p {
            margin-top: 20px;
            font-size: 16px;
          }
          button {
            margin-top: 30px;
            padding: 10px 20px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background-color: #218838;
          }
        </style>
      </head>
      <body>
        <h1>Nova versão baixada!</h1>
        <p>O aplicativo será reiniciado para instalar a atualização.</p>
        <button onclick="window.close(); window.electronAPI.restartApp()">Reiniciar agora</button>
      </body>
    </html>
  `));

  updateWindow.on('closed', () => {
    updateWindow .close();
  });

  ipcMain.handle('restartApp', () => {
    autoUpdater.quitAndInstall();
  });
});

app.whenReady().then(createLoginWindow);


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

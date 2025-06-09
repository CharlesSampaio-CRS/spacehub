const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  setZoomFactor: (factor) => ipcRenderer.send('set-zoom-factor', factor),
  logout: () => ipcRenderer.send('logout-success'),
  getToken: () => ipcRenderer.invoke('get-token'),
  getUserUuid: () => ipcRenderer.invoke('get-userUuid'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, msg) => callback(msg)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_, data) => callback(data)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  restartForUpdate: () => ipcRenderer.send('restart-for-update'),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  handle: (channel, callback) => ipcRenderer.handle(channel, callback),
  handleGoogleLogin: (idToken) => ipcRenderer.invoke('handleGoogleLogin', idToken),
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),
  updateUserInfo: (userInfo) => ipcRenderer.invoke('update-user-info', userInfo),
  onDarkModeChanged: (callback) => ipcRenderer.on('dark-mode-changed', (_, isDark) => callback(isDark)),
  sendDarkModeChanged: (isDark) => ipcRenderer.send('dark-mode-changed', isDark),
  getDarkMode: () => ipcRenderer.invoke('get-dark-mode'),
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  register: (data) => ipcRenderer.invoke('register', data),
  onLanguageChanged: (callback) => ipcRenderer.on('language-changed', (_, language) => callback(language)),
  sendLanguageChanged: (language) => ipcRenderer.send('language-changed', language),
  getLanguage: () => ipcRenderer.invoke('get-language'),
  setLanguage: (language) => ipcRenderer.send('language-changed', language)
});

window.addEventListener('DOMContentLoaded', () => {
  window.open = (url) => window.electronAPI.openExternal(url);

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target?.tagName === 'A' && target.target === '_blank') {
      e.preventDefault();
      window.electronAPI.openExternal(target.href);
    }
  });
});

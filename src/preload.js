const { contextBridge, ipcRenderer } = require('electron');

// API Modules
const authAPI = {
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  register: (data) => ipcRenderer.invoke('register', data),
  logout: () => ipcRenderer.send('logout-success'),
  getToken: () => ipcRenderer.invoke('get-token'),
  getUserUuid: () => ipcRenderer.invoke('get-userUuid'),
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),
  updateUserInfo: (userInfo) => ipcRenderer.invoke('update-user-info', userInfo),
  handleGoogleLogin: (idToken) => ipcRenderer.invoke('handleGoogleLogin', idToken)
};

const sessionAPI = {
  createUserSession: (userId) => ipcRenderer.invoke('create-user-session', userId),
  clearUserSession: (userId) => ipcRenderer.invoke('clear-user-session', userId),
  getUserSession: (userId) => ipcRenderer.invoke('get-user-session', userId)
};

const windowAPI = {
  openExternal: (url) => ipcRenderer.send('open-external', url),
  setZoomFactor: (factor) => ipcRenderer.send('set-zoom-factor', factor),
  restartApp: () => ipcRenderer.invoke('restart-app')
};

const updateAPI = {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  restartForUpdate: () => ipcRenderer.send('restart-for-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, msg) => callback(msg)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_, data) => callback(data)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info))
};

const themeAPI = {
  getDarkMode: () => ipcRenderer.invoke('get-dark-mode'),
  onDarkModeChanged: (callback) => ipcRenderer.on('dark-mode-changed', (_, isDark) => callback(isDark)),
  sendDarkModeChanged: (isDark) => ipcRenderer.send('dark-mode-changed', isDark)
};

const languageAPI = {
  getLanguage: () => ipcRenderer.invoke('get-language'),
  setLanguage: (language) => ipcRenderer.send('language-changed', language),
  onLanguageChanged: (callback) => ipcRenderer.on('language-changed', (_, language) => callback(language)),
  sendLanguageChanged: (language) => ipcRenderer.send('language-changed', language)
};

const ipcAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  handle: (channel, callback) => ipcRenderer.handle(channel, callback)
};

// Expose all APIs through a single electronAPI object
contextBridge.exposeInMainWorld('electronAPI', {
  ...authAPI,
  ...sessionAPI,
  ...windowAPI,
  ...updateAPI,
  ...themeAPI,
  ...languageAPI,
  ...ipcAPI
});

// Setup global event listeners
const setupGlobalEventListeners = () => {
  // Override window.open
  window.open = (url) => window.electronAPI.openExternal(url);

  // Handle external links
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target?.tagName === 'A' && target.target === '_blank') {
      e.preventDefault();
      window.electronAPI.openExternal(target.href);
    }
  });
};

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', setupGlobalEventListeners);

const { contextBridge, ipcRenderer } = require('electron');

// API Modules
const authAPI = {
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  register: (data) => ipcRenderer.invoke('register', data),
  logout: () => ipcRenderer.send('logout-success'),
  getToken: () => ipcRenderer.invoke('get-token'),
  getUserUuid: () => ipcRenderer.invoke('get-userUuid'),
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),
  getUserApplications: () => ipcRenderer.invoke('get-user-applications'),
  getTrialStatus: () => ipcRenderer.invoke('get-trial-status'),
  updateUserInfo: (userInfo) => ipcRenderer.invoke('update-user-info', userInfo),
  updateUserApplications: (applications) => ipcRenderer.invoke('update-user-applications', applications),
  updateTrialStatus: (trialStatus) => ipcRenderer.invoke('update-trial-status', trialStatus),
  handleGoogleLogin: (idToken) => ipcRenderer.invoke('handleGoogleLogin', idToken)
};

const sessionAPI = {
  createUserSession: (userId) => ipcRenderer.invoke('create-user-session', userId),
  clearUserSession: (userId) => ipcRenderer.invoke('clear-user-session', userId),
  getUserSession: (userId) => ipcRenderer.invoke('get-user-session', userId),
  clearCache: () => ipcRenderer.invoke('clear-cache')
};

const windowAPI = {
  openExternal: (url) => ipcRenderer.send('open-external', url),
  setZoomFactor: (factor) => ipcRenderer.send('set-zoom-factor', factor),
  restartApp: () => ipcRenderer.invoke('restart-app')
};

const updateAPI = {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartForUpdate: () => ipcRenderer.send('restart-for-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
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

const trialAPI = {
  checkTrialStatus: (userUuid) => ipcRenderer.invoke('check-trial-status', userUuid),
  limitApplications: (userUuid) => ipcRenderer.invoke('limit-applications', userUuid),
  manualTrialCheck: () => ipcRenderer.invoke('manual-trial-check'),
  forceLogout: () => ipcRenderer.invoke('force-logout'),
  onForceLogout: (callback) => ipcRenderer.on('force-logout', (_, data) => callback(data)),
  testApplicationLimitation: (userUuid) => ipcRenderer.invoke('test-application-limitation', userUuid)
};

const ipcAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  handle: (channel, callback) => ipcRenderer.handle(channel, callback)
};

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth API
  ...authAPI,
  
  // Session API
  ...sessionAPI,
  
  // Window API
  ...windowAPI,
  
  // Update API
  ...updateAPI,
  
  // Trial API
  ...trialAPI,
  
  // Theme API
  ...themeAPI,
  
  // Language API
  ...languageAPI,
  
  // IPC API
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

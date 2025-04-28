const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel) => ipcRenderer.invoke(channel),
  send: (channel, data) => ipcRenderer.send(channel, data),
  setZoomFactor: (factor) => ipcRenderer.send('set-zoom-factor', factor),
  logout: () => ipcRenderer.send('logout-success'),
  getToken: () => ipcRenderer.invoke('get-token'),
  restartApp: () => ipcRenderer.invoke('restartApp'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, msg) => callback(msg)),
  restartApp: () => ipcRenderer.invoke('restartApp'),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_, data) => callback(data)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  restartForUpdate: () => ipcRenderer.send('restart-for-update')
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

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel) => ipcRenderer.invoke(channel),
  send: (channel, data) => ipcRenderer.send(channel, data),
  setZoomFactor: (factor) => ipcRenderer.send('set-zoom-factor', factor),
  logout: () => ipcRenderer.send('logout-success'),
  getToken: () => ipcRenderer.invoke('get-token'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, msg) => callback(msg)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, msg) => callback(msg)),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.send('open-external', url)
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

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  logout: () => ipcRenderer.send('logout-success'),
  getToken: () => ipcRenderer.invoke('get-token'),
  setToken: (token) => ipcRenderer.send('login-success', token),

  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, msg) => callback(msg)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, msg) => callback(msg)),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  openExternal: (url) => ipcRenderer.send('open-external', url)
});

window.addEventListener('DOMContentLoaded', () => {
  // Intercepta tentativas de abrir janelas (como window.open)
  window.open = (url) => {
    window.electronAPI.openExternal(url);
  };

  // Intercepta cliques em links com target="_blank"
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.tagName === 'A' && target.target === '_blank') {
      e.preventDefault();
      window.electronAPI.openExternal(target.href);
    }
  });
});

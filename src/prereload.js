const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendLoginSuccess: (email) => ipcRenderer.send('login-success', email)
});
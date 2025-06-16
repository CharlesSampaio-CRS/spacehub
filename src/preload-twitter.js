const { contextBridge, ipcRenderer } = require('electron');

// Expor a API do Twitter no mundo principal
contextBridge.exposeInMainWorld('twitterAPI', {
  // Funções específicas do Twitter
  handleAuth: (callback) => {
    ipcRenderer.on('twitter-auth', (event, data) => callback(data));
  },
  handleNavigation: (callback) => {
    ipcRenderer.on('twitter-navigation', (event, data) => callback(data));
  },
  sendNavigation: (url) => {
    ipcRenderer.send('twitter-navigation', url);
  },

  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('twitter-window-ready', (event, data) => callback(data));
  },
  onWindowClosed: (callback) => {
    ipcRenderer.on('twitter-window-closed', (event, data) => callback(data));
  },
  requestWrapperBounds: () => {
    ipcRenderer.send('request-twitter-wrapper-bounds');
  },
  updateBounds: (bounds) => {
    ipcRenderer.send('update-twitter-window-bounds', bounds);
  }
}); 
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('facebookMessengerAPI', {
  // Funções específicas para o Facebook Messenger
  handleAuth: (callback) => {
    ipcRenderer.on('facebook-messenger-auth', (event, data) => callback(data));
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('facebook-messenger-navigation', (event, data) => callback(data));
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('facebook-messenger-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('facebook-messenger-window-ready', (event, data) => callback(data));
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('facebook-messenger-window-closed', (event, data) => callback(data));
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-facebook-messenger-window-bounds', windowId, bounds);
    }
  }
}); 
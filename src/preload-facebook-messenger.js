const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('facebookMessengerAPI', {
  // Funções específicas para o Facebook Messenger
  handleAuth: (callback) => {
    ipcRenderer.on('facebookMessenger-auth', (event, data) => callback(data));
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('facebookMessenger-navigation', (event, data) => callback(data));
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('facebookMessenger-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('facebookMessenger-window-ready', (event, data) => callback(data));
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('facebookMessenger-window-closed', (event, data) => callback(data));
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-facebookMessenger-window-bounds', windowId, bounds);
    }
  }
}); 
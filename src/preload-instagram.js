const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('instagramAPI', {
  // Funções específicas para o Instagram
  handleAuth: (callback) => {
    ipcRenderer.on('instagram-auth', (event, data) => callback(data));
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('instagram-navigation', (event, data) => callback(data));
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('instagram-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('instagram-window-ready', (event, data) => callback(data));
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('instagram-window-closed', (event, data) => callback(data));
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-instagram-window-bounds', windowId, bounds);
    }
  },

  // Funções adicionais para gerenciamento de autenticação
  onAuthComplete: (callback) => {
    ipcRenderer.on('instagram-auth-complete', (event, data) => callback(data));
  },

  onAuthError: (callback) => {
    ipcRenderer.on('instagram-auth-error', (event, data) => callback(data));
  },

  // Funções para gerenciamento de estado da janela
  onWindowLoaded: (callback) => {
    ipcRenderer.on('instagram-window-loaded', (event, data) => callback(data));
  },

  onWindowShow: (callback) => {
    ipcRenderer.on('instagram-window-show', (event, data) => callback(data));
  },

  onWindowHide: (callback) => {
    ipcRenderer.on('instagram-window-hide', (event, data) => callback(data));
  },

  // Funções para controle de visibilidade
  showWindow: () => {
    ipcRenderer.send('instagram-show-window');
  },

  hideWindow: () => {
    ipcRenderer.send('instagram-hide-window');
  },

  // Funções para gerenciamento de sessão
  onSessionExpired: (callback) => {
    ipcRenderer.on('instagram-session-expired', (event, data) => callback(data));
  },

  onSessionRestored: (callback) => {
    ipcRenderer.on('instagram-session-restored', (event, data) => callback(data));
  }
}); 
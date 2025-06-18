const { contextBridge, ipcRenderer } = require('electron');

// Expor a API do Twitter no mundo principal
contextBridge.exposeInMainWorld('twitterAPI', {
  // Funções específicas para o Twitter
  handleAuth: (callback) => {
    ipcRenderer.on('twitter-auth', (event, data) => callback(data));
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('twitter-navigation', (event, data) => callback(data));
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('twitter-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('twitter-window-ready', (event, data) => callback(data));
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('twitter-window-closed', (event, data) => callback(data));
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-twitter-window-bounds', windowId, bounds);
    }
  },

  // Funções adicionais para gerenciamento de autenticação
  onAuthComplete: (callback) => {
    ipcRenderer.on('twitter-auth-complete', (event, data) => callback(data));
  },

  onAuthError: (callback) => {
    ipcRenderer.on('twitter-auth-error', (event, data) => callback(data));
  },

  // Funções para gerenciamento de estado da janela
  onWindowLoaded: (callback) => {
    ipcRenderer.on('twitter-window-loaded', (event, data) => callback(data));
  },

  onWindowShow: (callback) => {
    ipcRenderer.on('twitter-window-show', (event, data) => callback(data));
  },

  onWindowHide: (callback) => {
    ipcRenderer.on('twitter-window-hide', (event, data) => callback(data));
  },

  // Funções para controle de visibilidade
  showWindow: () => {
    ipcRenderer.send('twitter-show-window');
  },

  hideWindow: () => {
    ipcRenderer.send('twitter-hide-window');
  },

  // Funções para gerenciamento de sessão
  onSessionExpired: (callback) => {
    ipcRenderer.on('twitter-session-expired', (event, data) => callback(data));
  },

  onSessionRestored: (callback) => {
    ipcRenderer.on('twitter-session-restored', (event, data) => callback(data));
  }
}); 
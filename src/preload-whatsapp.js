const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('whatsappAPI', {
  // Funções específicas para o WhatsApp
  handleAuth: (callback) => {
    ipcRenderer.on('whatsapp-auth', (event, data) => callback(data));
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('whatsapp-navigation', (event, data) => callback(data));
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('whatsapp-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('whatsapp-window-ready', (event, data) => callback(data));
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('whatsapp-window-closed', (event, data) => callback(data));
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-whatsapp-window-bounds', windowId, bounds);
    }
  },

  // Funções adicionais para gerenciamento de autenticação
  onAuthComplete: (callback) => {
    ipcRenderer.on('whatsapp-auth-complete', (event, data) => callback(data));
  },

  onAuthError: (callback) => {
    ipcRenderer.on('whatsapp-auth-error', (event, data) => callback(data));
  },

  // Funções para gerenciamento de estado da janela
  onWindowLoaded: (callback) => {
    ipcRenderer.on('whatsapp-window-loaded', (event, data) => callback(data));
  },

  onWindowShow: (callback) => {
    ipcRenderer.on('whatsapp-window-show', (event, data) => callback(data));
  },

  onWindowHide: (callback) => {
    ipcRenderer.on('whatsapp-window-hide', (event, data) => callback(data));
  },

  // Funções para controle de visibilidade
  showWindow: () => {
    ipcRenderer.send('whatsapp-show-window');
  },

  hideWindow: () => {
    ipcRenderer.send('whatsapp-hide-window');
  },

  // Funções para gerenciamento de sessão
  onSessionExpired: (callback) => {
    ipcRenderer.on('whatsapp-session-expired', (event, data) => callback(data));
  },

  onSessionRestored: (callback) => {
    ipcRenderer.on('whatsapp-session-restored', (event, data) => callback(data));
  }
}); 
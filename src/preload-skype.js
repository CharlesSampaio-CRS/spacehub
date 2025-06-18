const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('skypeAPI', {
  // Funções específicas para o Skype
  handleAuth: (callback) => {
    ipcRenderer.on('skype-auth', (event, data) => callback(data));
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('skype-navigation', (event, data) => callback(data));
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('skype-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('skype-window-ready', (event, data) => callback(data));
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('skype-window-closed', (event, data) => callback(data));
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-skype-window-bounds', windowId, bounds);
    }
  },

  // Funções adicionais para gerenciamento de autenticação
  onAuthComplete: (callback) => {
    ipcRenderer.on('skype-auth-complete', (event, data) => callback(data));
  },

  onAuthError: (callback) => {
    ipcRenderer.on('skype-auth-error', (event, data) => callback(data));
  },

  // Funções para gerenciamento de estado da janela
  onWindowLoaded: (callback) => {
    ipcRenderer.on('skype-window-loaded', (event, data) => callback(data));
  },

  onWindowShow: (callback) => {
    ipcRenderer.on('skype-window-show', (event, data) => callback(data));
  },

  onWindowHide: (callback) => {
    ipcRenderer.on('skype-window-hide', (event, data) => callback(data));
  },

  // Funções para controle de visibilidade
  showWindow: () => {
    ipcRenderer.send('skype-show-window');
  },

  hideWindow: () => {
    ipcRenderer.send('skype-hide-window');
  },

  // Funções para gerenciamento de sessão
  onSessionExpired: (callback) => {
    ipcRenderer.on('skype-session-expired', (event, data) => callback(data));
  },

  onSessionRestored: (callback) => {
    ipcRenderer.on('skype-session-restored', (event, data) => callback(data));
  }
});

// Em vez de criar todas as janelas de uma vez, podemos criar apenas quando necessário
const createAppWindow = async (webviewId, url, appName) => {
  // Verificar se já existe uma instância ativa
  let windowInstance = getWindowInstance(appName);
  if (windowInstance?.container) {
    // Reutilizar a janela existente
    return windowInstance;
  }
  // Criar nova janela apenas se não existir
  // ...
}; 
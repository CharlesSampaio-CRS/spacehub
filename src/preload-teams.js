const { contextBridge, ipcRenderer } = require('electron');

// Função para verificar se a janela está pronta
const isWindowReady = () => {
  const windowId = window.location.hash.replace('#', '');
  return !!windowId;
};

// Função para garantir que a janela está pronta antes de executar ações
const ensureWindowReady = (callback) => {
  if (isWindowReady()) {
    callback();
  } else {
    const checkInterval = setInterval(() => {
      if (isWindowReady()) {
        clearInterval(checkInterval);
        callback();
      }
    }, 100);
  }
};

contextBridge.exposeInMainWorld('teamsAPI', {
  // Funções específicas para o Teams
  handleAuth: (callback) => {
    ipcRenderer.on('teams-auth', (event, data) => callback(data));
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('teams-navigation', (event, data) => callback(data));
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('teams-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('teams-window-ready', (event, data) => callback(data));
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('teams-window-closed', (event, data) => callback(data));
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-teams-window-bounds', windowId, bounds);
    }
  },

  // Funções adicionais para gerenciamento de autenticação
  onAuthComplete: (callback) => {
    ipcRenderer.on('teams-auth-complete', (event, data) => callback(data));
  },

  onAuthError: (callback) => {
    ipcRenderer.on('teams-auth-error', (event, data) => callback(data));
  },

  // Funções para gerenciamento de estado da janela
  onWindowLoaded: (callback) => {
    ipcRenderer.on('teams-window-loaded', (event, data) => callback(data));
  },

  onWindowShow: (callback) => {
    ipcRenderer.on('teams-window-show', (event, data) => callback(data));
  },

  onWindowHide: (callback) => {
    ipcRenderer.on('teams-window-hide', (event, data) => callback(data));
  },

  // Funções para controle de visibilidade
  showWindow: () => {
    ipcRenderer.send('teams-show-window');
  },

  hideWindow: () => {
    ipcRenderer.send('teams-hide-window');
  },

  // Funções para gerenciamento de sessão
  onSessionExpired: (callback) => {
    ipcRenderer.on('teams-session-expired', (event, data) => callback(data));
  },

  onSessionRestored: (callback) => {
    ipcRenderer.on('teams-session-restored', (event, data) => callback(data));
  },

  // Função para verificar o estado da janela
  getWindowState: () => {
    return {
      isReady: isWindowReady(),
      windowId: window.location.hash.replace('#', '')
    };
  }
});

// Adicionar listener para erros não capturados
window.addEventListener('error', (event) => {
  console.error('Erro não capturado na janela do Teams:', event.error);
  ipcRenderer.send('teams-window-error', {
    message: event.error.message,
    stack: event.error.stack
  });
});

// Adicionar listener para erros de promessa não tratados
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promessa não tratada na janela do Teams:', event.reason);
  ipcRenderer.send('teams-window-error', {
    message: event.reason.message || 'Erro de promessa não tratada',
    stack: event.reason.stack
  });
}); 
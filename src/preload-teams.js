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
    ipcRenderer.on('teams-auth', (event, data) => {
      console.log('Recebido evento teams-auth:', data);
      callback(data);
    });
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('teams-navigation', (event, data) => {
      console.log('Recebido evento teams-navigation:', data);
      callback(data);
    });
  },
  
  sendNavigation: (url) => {
    console.log('Enviando navegação do Teams:', url);
    ensureWindowReady(() => {
      ipcRenderer.send('teams-navigation', { url });
    });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('teams-window-ready', (event, data) => {
      console.log('Janela do Teams pronta:', data);
      callback(data);
    });
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('teams-window-closed', (event, data) => {
      console.log('Janela do Teams fechada:', data);
      callback(data);
    });
  },
  
  requestWrapperBounds: () => {
    console.log('Solicitando bounds do wrapper do Teams');
    ensureWindowReady(() => {
      ipcRenderer.send('request-wrapper-bounds');
    });
  },
  
  updateBounds: (bounds) => {
    console.log('Atualizando bounds do Teams:', bounds);
    ensureWindowReady(() => {
      const windowId = window.location.hash.replace('#', '');
      if (windowId) {
        ipcRenderer.invoke('update-teams-window-bounds', windowId, bounds).catch(error => {
          console.error('Erro ao atualizar bounds do Teams:', error);
        });
      } else {
        console.error('ID da janela do Teams não encontrado');
      }
    });
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
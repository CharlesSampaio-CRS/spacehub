const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('googleChatAPI', {
  // Funções específicas para o Google Chat
  handleAuth: (callback) => {
    ipcRenderer.on('google-chat-auth', (event, data) => {
      callback(data);
    });
  },
  
  handleNavigation: (callback) => {
    ipcRenderer.on('google-chat-navigation', (event, data) => {
      callback(data);
    });
  },
  
  sendNavigation: (url) => {
    ipcRenderer.send('google-chat-navigation', { url });
  },
  
  // Funções comuns para todas as janelas de aplicativos
  onWindowReady: (callback) => {
    ipcRenderer.on('google-chat-window-ready', (event, data) => {
      callback(data);
    });
  },
  
  onWindowClosed: (callback) => {
    ipcRenderer.on('google-chat-window-closed', (event, data) => {
      callback(data);
    });
  },
  
  requestWrapperBounds: () => {
    ipcRenderer.send('request-wrapper-bounds');
  },
  
  updateBounds: (bounds) => {
    const windowId = window.location.hash.replace('#', '');
    if (windowId) {
      ipcRenderer.invoke('update-google-chat-window-bounds', windowId, bounds).catch(error => {
        console.error('Erro ao atualizar bounds do Google Chat:', error);
      });
    } else {
      console.error('ID da janela do Google Chat não encontrado');
    }
  }
});

// Adicionar listener para erros não capturados
window.addEventListener('error', (event) => {
  console.error('Erro não capturado na janela do Google Chat:', event.error);
  ipcRenderer.send('google-chat-window-error', {
    message: event.error.message,
    stack: event.error.stack
  });
});

// Adicionar listener para erros de promessa não tratados
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promessa não tratada na janela do Google Chat:', event.reason);
  ipcRenderer.send('google-chat-window-error', {
    message: event.reason.message || 'Erro de promessa não tratada',
    stack: event.reason.stack
  });
}); 
const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class LinkedInWindowManager {
  constructor() {
    this.windows = new Map();
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    ipcMain.handle('create-linkedin-window', async (event, windowData, wrapperBounds) => {
      try {
        const { url, options } = windowData;
        const parentWindow = BrowserWindow.fromWebContents(event.sender);
        
        if (!parentWindow) {
          console.error('Janela principal não encontrada');
          throw new Error('Janela principal não encontrada');
        }
        // Usar wrapperBounds para posicionamento preciso
        const x = wrapperBounds.x;
        const y = wrapperBounds.y;
        const width = wrapperBounds.width;
        const height = wrapperBounds.height;

        // Criar a janela como filha da janela principal
        const window = new BrowserWindow({
          ...options,
          parent: parentWindow,
          show: false,
          frame: false,
          transparent: true,
          backgroundColor: '#00000000', // Garantir total transparência
          width: width,
          height: height,
          x: parentWindow.getPosition()[0] + x,
          y: parentWindow.getPosition()[1] + y,
          webPreferences: {
            ...options.webPreferences,
            preload: path.join(__dirname, '../preload-linkedin.js')
          }
        });

        await window.loadURL(url);

        // Configurar eventos da janela
        window.on('ready-to-show', () => {
          window.setBounds({
            x: parentWindow.getPosition()[0] + x,
            y: parentWindow.getPosition()[1] + y,
            width: width,
            height: height
          });
          
          // Garantir que a janela esteja visível
          window.show();
          window.focus();
          
          event.sender.send('linkedin-window-ready', { windowId: window.id });
        });

        window.on('closed', () => {
          this.windows.delete(window.id);
          event.sender.send('linkedin-window-closed', { windowId: window.id });
        });

        // Manter a janela filha sempre visível quando a janela principal estiver visível
        parentWindow.on('show', () => {
          if (window && !window.isDestroyed()) {
            window.show();
          }
        });

        parentWindow.on('hide', () => {
          if (window && !window.isDestroyed()) {
            window.hide();
          }
        });

        // Ajustar a posição da janela filha quando a janela principal for redimensionada
        parentWindow.on('resize', () => {
          const newParentBounds = parentWindow.getBounds();
          if (window && !window.isDestroyed()) {
            event.sender.send('request-wrapper-bounds');
          }
        });

        parentWindow.on('move', () => {
          const newParentBounds = parentWindow.getBounds();
          if (window && !window.isDestroyed()) {
            event.sender.send('request-wrapper-bounds');
          }
        });

        // Armazenar referência da janela
        this.windows.set(window.id, window);

        return { id: window.id };
      } catch (error) {
        console.error('Erro ao criar janela do LinkedIn:', error);
        return null;
      }
    });

    // Novo handler para receber as bounds atualizadas do wrapper do renderer
    ipcMain.handle('update-linkedin-window-bounds', async (event, windowId, newWrapperBounds) => {
      const window = this.windows.get(windowId);
      if (window && !window.isDestroyed() && newWrapperBounds) {
        const parentWindow = BrowserWindow.fromWebContents(event.sender);
        if (parentWindow) {
          window.setBounds({
            x: parentWindow.getPosition()[0] + newWrapperBounds.x,
            y: parentWindow.getPosition()[1] + newWrapperBounds.y,
            width: newWrapperBounds.width,
            height: newWrapperBounds.height
          });
        }
      }
    });

    ipcMain.handle('show-linkedin-window', async (event, windowId, wrapperBounds) => {
      const window = this.windows.get(windowId);
      if (window) {
        try {
          // Obter a janela principal
          const parentWindow = BrowserWindow.fromWebContents(event.sender);
          if (parentWindow) {
            // Ajustar a posição e tamanho da janela com base no wrapperBounds
            window.setBounds({
              x: parentWindow.getPosition()[0] + wrapperBounds.x,
              y: parentWindow.getPosition()[1] + wrapperBounds.y,
              width: wrapperBounds.width,
              height: wrapperBounds.height
            });

            // Garantir que a janela esteja visível
            if (!window.isVisible()) {
              window.show();
            }
            
            // Trazer a janela para frente
            window.focus();
            
            // Notificar que a janela está pronta
            event.sender.send('linkedin-window-ready', { windowId: window.id });
            
            return true;
          } else {
            console.error('Janela principal não encontrada ao tentar mostrar LinkedIn');
            return false;
          }
        } catch (error) {
          console.error('Erro ao mostrar janela do LinkedIn:', error);
          return false;
        }
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
        return false;
      }
    });

    ipcMain.handle('hide-linkedin-window', async (event, windowId) => {
      const window = this.windows.get(windowId);
      if (window) {
        try {
          if (window.isVisible()) {
            window.hide();
          }
          return true;
        } catch (error) {
          console.error('Erro ao ocultar janela do LinkedIn:', error);
          return false;
        }
      } else {
        console.error('Janela do LinkedIn não encontrada para ocultar:', windowId);
        return false;
      }
    });

    ipcMain.handle('close-linkedin-window', async (event, windowId) => {
      const window = this.windows.get(windowId);
      if (window) {
        window.close();
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
      }
    });

    ipcMain.handle('reload-linkedin-window', async (event, windowId) => {
      const window = this.windows.get(windowId);
      if (window) {
        await window.reload();
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
      }
    });

    // Manipular navegação
    ipcMain.on('linkedin-navigation', (event, { windowId, url }) => {
      const window = this.windows.get(windowId);
      if (window) {
        window.loadURL(url);
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
      }
    });

    // Manipular autenticação
    ipcMain.on('linkedin-auth-success', (event, { windowId, data }) => {
      const window = this.windows.get(windowId);
      if (window) {
        event.sender.send('linkedin-auth-complete', { windowId, data });
        window.close();
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
      }
    });
  }

  cleanup() {
    this.windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.windows.clear();
  }
}

module.exports = new LinkedInWindowManager(); 
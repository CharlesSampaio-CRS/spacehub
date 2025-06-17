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
          console.log('Janela do LinkedIn pronta para mostrar');
          // Posicionar a janela dentro da área de conteúdo com base no wrapperBounds
          window.setBounds({
            x: parentWindow.getPosition()[0] + x,
            y: parentWindow.getPosition()[1] + y,
            width: width,
            height: height
          });
          
          console.log('Janela do LinkedIn ajustada em ready-to-show: x=', x, 'y=', y, 'width=', width, 'height=', height);
          console.log('Bounds atuais da janela do LinkedIn (getBounds): ', window.getBounds());
          console.log('Content Bounds atuais da janela do LinkedIn (getContentBounds): ', window.getContentBounds());

          // Garantir que a janela esteja visível
          window.show();
          window.focus();
          
          event.sender.send('linkedin-window-ready', { windowId: window.id });
        });

        window.on('closed', () => {
          console.log('Janela do LinkedIn fechada:', window.id);
          this.windows.delete(window.id);
          event.sender.send('linkedin-window-closed', { windowId: window.id });
        });

        window.on('show', () => {
          console.log('Janela do LinkedIn mostrada:', window.id);
        });

        window.on('hide', () => {
          console.log('Janela do LinkedIn escondida:', window.id);
        });

        // Manter a janela filha sempre visível quando a janela principal estiver visível
        parentWindow.on('show', () => {
          console.log('Janela principal mostrada, mostrando janela do LinkedIn');
          if (window && !window.isDestroyed()) {
            window.show();
          }
        });

        parentWindow.on('hide', () => {
          console.log('Janela principal escondida, escondendo janela do LinkedIn');
          if (window && !window.isDestroyed()) {
            window.hide();
          }
        });

        // Ajustar a posição da janela filha quando a janela principal for redimensionada
        parentWindow.on('resize', () => {
          const newParentBounds = parentWindow.getBounds();
          // Obter as novas coordenadas do webview-wrapper em relação à tela
          // Isso exige que o processo de renderização seja o que envia a posição do wrapper atualizada.
          // Para depuração, vamos logar o que ele tenta fazer.
          console.log('Resize da janela principal. Tentando ajustar LinkedIn.');
          if (window && !window.isDestroyed()) {
            // Nota: Para um ajuste preciso, o renderer precisaria enviar o novo wrapperBounds
            // aqui, ou este lado precisaria calcular baseado em uma geometria conhecida do HTML
            // Por enquanto, apenas logamos o que está acontecendo.
            console.log('Bounds da janela do LinkedIn antes do resize:', window.getBounds());

            // Vamos tentar buscar as bounds atualizadas do wrapper do renderer
            event.sender.send('request-wrapper-bounds');
          }
        });

        // Ajustar a posição da janela filha quando a janela principal for movida
        parentWindow.on('move', () => {
          const newParentBounds = parentWindow.getBounds();
          // Similar ao resize, para depuração
          console.log('Move da janela principal. Tentando ajustar LinkedIn.');
          if (window && !window.isDestroyed()) {
            console.log('Bounds da janela do LinkedIn antes do move:', window.getBounds());

            // Vamos tentar buscar as bounds atualizadas do wrapper do renderer
            event.sender.send('request-wrapper-bounds');
          }
        });

        // Armazenar referência da janela
        this.windows.set(window.id, window);
        console.log('Janela do LinkedIn armazenada:', window.id);

        return { id: window.id };
      } catch (error) {
        console.error('Erro ao criar janela do LinkedIn:', error);
        return null;
      }
    });

    // Novo handler para receber as bounds atualizadas do wrapper do renderer
    ipcMain.handle('update-linkedin-window-bounds', async (event, windowId, newWrapperBounds) => {
      console.log('Recebido update-linkedin-window-bounds para janela:', windowId, newWrapperBounds);
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
          console.log('Janela do LinkedIn ajustada via update-linkedin-window-bounds.');
        }
      }
    });

    ipcMain.handle('show-linkedin-window', async (event, windowId, wrapperBounds) => {
      console.log('Mostrando janela do LinkedIn:', windowId, wrapperBounds);
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

            console.log('Janela do LinkedIn ajustada em show-linkedin-window: x=', wrapperBounds.x, 'y=', wrapperBounds.y, 'width=', wrapperBounds.width, 'height=', wrapperBounds.height);
            console.log('Bounds atuais da janela do LinkedIn (getBounds): ', window.getBounds());
            console.log('Content Bounds atuais da janela do LinkedIn (getContentBounds): ', window.getContentBounds());

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
      console.log('Fechando janela do LinkedIn:', windowId);
      const window = this.windows.get(windowId);
      if (window) {
        window.close();
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
      }
    });

    ipcMain.handle('reload-linkedin-window', async (event, windowId) => {
      console.log('Recarregando janela do LinkedIn:', windowId);
      const window = this.windows.get(windowId);
      if (window) {
        await window.reload();
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
      }
    });

    // Manipular navegação
    ipcMain.on('linkedin-navigation', (event, { windowId, url }) => {
      console.log('Navegando na janela do LinkedIn:', windowId, url);
      const window = this.windows.get(windowId);
      if (window) {
        window.loadURL(url);
      } else {
        console.error('Janela do LinkedIn não encontrada:', windowId);
      }
    });

    // Manipular autenticação
    ipcMain.on('linkedin-auth-success', (event, { windowId, data }) => {
      console.log('Autenticação do LinkedIn bem-sucedida:', windowId);
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
    console.log('Limpando todas as janelas do LinkedIn');
    this.windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.windows.clear();
  }
}

module.exports = new LinkedInWindowManager(); 
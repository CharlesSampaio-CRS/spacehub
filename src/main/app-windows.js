const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class AppWindowManager {
  constructor() {
    this.windows = new Map();
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    // Handler genérico para criar janelas de aplicativos
    const createAppWindowHandler = async (event, windowData, wrapperBounds, appName) => {
      try {
        console.log(`Criando janela do ${appName}...`, windowData, wrapperBounds);
        const { url, options } = windowData;
        const parentWindow = BrowserWindow.fromWebContents(event.sender);
        
        if (!parentWindow) {
          console.error('Janela principal não encontrada');
          throw new Error('Janela principal não encontrada');
        }

        console.log('Janela principal encontrada:', parentWindow.id);

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
          backgroundColor: '#00000000',
          width: width,
          height: height,
          x: parentWindow.getPosition()[0] + x,
          y: parentWindow.getPosition()[1] + y,
          webPreferences: {
            ...options.webPreferences,
            preload: path.join(__dirname, `../preload-${appName.toLowerCase()}.js`)
          }
        });

        console.log(`Janela do ${appName} criada com bounds iniciais:`, { x, y, width, height });

        // Carregar a URL
        console.log('Carregando URL:', url);
        await window.loadURL(url);
        console.log('URL carregada com sucesso');

        // Configurar eventos da janela
        window.on('ready-to-show', () => {
          console.log(`Janela do ${appName} pronta para mostrar`);
          window.setBounds({
            x: parentWindow.getPosition()[0] + x,
            y: parentWindow.getPosition()[1] + y,
            width: width,
            height: height
          });
          
          console.log(`Janela do ${appName} ajustada em ready-to-show:`, { x, y, width, height });
          console.log('Bounds atuais:', window.getBounds());
          console.log('Content Bounds atuais:', window.getContentBounds());

          window.show();
          window.focus();
          
          event.sender.send(`${appName.toLowerCase()}-window-ready`, { windowId: window.id });
        });

        window.on('closed', () => {
          console.log(`Janela do ${appName} fechada:`, window.id);
          this.windows.delete(window.id);
          event.sender.send(`${appName.toLowerCase()}-window-closed`, { windowId: window.id });
        });

        window.on('show', () => {
          console.log(`Janela do ${appName} mostrada:`, window.id);
        });

        window.on('hide', () => {
          console.log(`Janela do ${appName} escondida:`, window.id);
        });

        // Manter a janela filha sempre visível quando a janela principal estiver visível
        parentWindow.on('show', () => {
          console.log(`Janela principal mostrada, mostrando janela do ${appName}`);
          if (window && !window.isDestroyed()) {
            window.show();
          }
        });

        parentWindow.on('hide', () => {
          console.log(`Janela principal escondida, escondendo janela do ${appName}`);
          if (window && !window.isDestroyed()) {
            window.hide();
          }
        });

        // Ajustar a posição da janela filha quando a janela principal for redimensionada
        parentWindow.on('resize', () => {
          console.log(`Resize da janela principal. Tentando ajustar ${appName}.`);
          if (window && !window.isDestroyed()) {
            console.log(`Bounds da janela do ${appName} antes do resize:`, window.getBounds());
            event.sender.send('request-wrapper-bounds');
          }
        });

        // Ajustar a posição da janela filha quando a janela principal for movida
        parentWindow.on('move', () => {
          console.log(`Move da janela principal. Tentando ajustar ${appName}.`);
          if (window && !window.isDestroyed()) {
            console.log(`Bounds da janela do ${appName} antes do move:`, window.getBounds());
            event.sender.send('request-wrapper-bounds');
          }
        });

        // Armazenar referência da janela
        this.windows.set(window.id, window);
        console.log(`Janela do ${appName} armazenada:`, window.id);

        return { id: window.id };
      } catch (error) {
        console.error(`Erro ao criar janela do ${appName}:`, error);
        return null;
      }
    };

    // Handlers específicos para cada aplicativo
    const apps = ['teams', 'slack', 'skype'];
    apps.forEach(appName => {
      // Criar janela
      ipcMain.handle(`create-${appName}-window`, async (event, windowData, wrapperBounds) => {
        return createAppWindowHandler(event, windowData, wrapperBounds, appName);
      });

      // Atualizar bounds
      ipcMain.handle(`update-${appName}-window-bounds`, async (event, windowId, newWrapperBounds) => {
        console.log(`Recebido update-${appName}-window-bounds para janela:`, windowId, newWrapperBounds);
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
            console.log(`Janela do ${appName} ajustada via update-${appName}-window-bounds.`);
          }
        }
      });

      // Mostrar janela
      ipcMain.handle(`show-${appName}-window`, async (event, windowId, wrapperBounds) => {
        console.log(`Mostrando janela do ${appName}:`, windowId, wrapperBounds);
        const window = this.windows.get(windowId);
        if (window) {
          try {
            const parentWindow = BrowserWindow.fromWebContents(event.sender);
            if (parentWindow) {
              window.setBounds({
                x: parentWindow.getPosition()[0] + wrapperBounds.x,
                y: parentWindow.getPosition()[1] + wrapperBounds.y,
                width: wrapperBounds.width,
                height: wrapperBounds.height
              });

              console.log(`Janela do ${appName} ajustada em show-${appName}-window:`, wrapperBounds);
              console.log('Bounds atuais:', window.getBounds());
              console.log('Content Bounds atuais:', window.getContentBounds());

              if (!window.isVisible()) {
                window.show();
              }
              
              window.focus();
              event.sender.send(`${appName}-window-ready`, { windowId: window.id });
              
              return true;
            } else {
              console.error(`Janela principal não encontrada ao tentar mostrar ${appName}`);
              return false;
            }
          } catch (error) {
            console.error(`Erro ao mostrar janela do ${appName}:`, error);
            return false;
          }
        } else {
          console.error(`Janela do ${appName} não encontrada:`, windowId);
          return false;
        }
      });

      // Ocultar janela
      ipcMain.handle(`hide-${appName}-window`, async (event, windowId) => {
        console.log(`Ocultando janela do ${appName}:`, windowId);
        const window = this.windows.get(windowId);
        if (window) {
          try {
            if (window.isVisible()) {
              window.hide();
            }
            return true;
          } catch (error) {
            console.error(`Erro ao ocultar janela do ${appName}:`, error);
            return false;
          }
        } else {
          console.error(`Janela do ${appName} não encontrada para ocultar:`, windowId);
          return false;
        }
      });

      // Fechar janela
      ipcMain.handle(`close-${appName}-window`, async (event, windowId) => {
        console.log(`Fechando janela do ${appName}:`, windowId);
        const window = this.windows.get(windowId);
        if (window) {
          window.close();
        } else {
          console.error(`Janela do ${appName} não encontrada:`, windowId);
        }
      });

      // Recarregar janela
      ipcMain.handle(`reload-${appName}-window`, async (event, windowId) => {
        console.log(`Recarregando janela do ${appName}:`, windowId);
        const window = this.windows.get(windowId);
        if (window) {
          await window.reload();
        } else {
          console.error(`Janela do ${appName} não encontrada:`, windowId);
        }
      });

      // Manipular navegação
      ipcMain.on(`${appName}-navigation`, (event, { windowId, url }) => {
        console.log(`Navegando na janela do ${appName}:`, windowId, url);
        const window = this.windows.get(windowId);
        if (window) {
          window.loadURL(url);
        } else {
          console.error(`Janela do ${appName} não encontrada:`, windowId);
        }
      });
    });
  }

  cleanup() {
    console.log('Limpando todas as janelas de aplicativos');
    this.windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.windows.clear();
  }
}

module.exports = new AppWindowManager(); 
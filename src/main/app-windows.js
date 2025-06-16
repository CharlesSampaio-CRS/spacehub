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
        console.log(`Criando janela do ${appName}...`, { windowData, wrapperBounds });
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

        // Configurações específicas para cada aplicativo
        const appSpecificOptions = {
          teams: {
            webPreferences: {
              ...options.webPreferences,
              preload: path.join(__dirname, '../preload-teams.js'),
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: false,
              webSecurity: true,
              allowRunningInsecureContent: true,
              backgroundThrottling: false,
              enableRemoteModule: false,
              nodeIntegrationInSubFrames: true
            }
          },
          'google-chat': {
            webPreferences: {
              ...options.webPreferences,
              preload: path.join(__dirname, '../preload-google-chat.js'),
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: false,
              webSecurity: true,
              allowRunningInsecureContent: true,
              backgroundThrottling: false,
              enableRemoteModule: false,
              nodeIntegrationInSubFrames: true
            }
          },
          slack: {
            webPreferences: {
              ...options.webPreferences,
              preload: path.join(__dirname, '../preload-slack.js'),
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: false,
              webSecurity: true,
              allowRunningInsecureContent: true,
              backgroundThrottling: false,
              enableRemoteModule: false,
              nodeIntegrationInSubFrames: true
            }
          },
          skype: {
            webPreferences: {
              ...options.webPreferences,
              preload: path.join(__dirname, '../preload-skype.js'),
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: false,
              webSecurity: true,
              allowRunningInsecureContent: true,
              backgroundThrottling: false,
              enableRemoteModule: false,
              nodeIntegrationInSubFrames: true
            }
          },
          whatsapp: {
            webPreferences: {
              ...options.webPreferences,
              preload: path.join(__dirname, '../preload-whatsapp.js'),
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: false,
              webSecurity: true,
              allowRunningInsecureContent: true,
              backgroundThrottling: false,
              enableRemoteModule: false,
              nodeIntegrationInSubFrames: true
            }
          }
        };

        // Criar a janela como filha da janela principal
        const window = new BrowserWindow({
          ...options,
          ...(appSpecificOptions[appName.toLowerCase()] || {}),
          parent: parentWindow,
          show: false,
          frame: false,
          transparent: true,
          backgroundColor: '#00000000',
          width: width,
          height: height,
          x: parentWindow.getPosition()[0] + x,
          y: parentWindow.getPosition()[1] + y
        });

        console.log(`Janela do ${appName} criada com bounds iniciais:`, { x, y, width, height });
        console.log('Configurações da janela:', window.getBounds());

        // Configurar User-Agent específico para cada aplicativo
        const userAgents = {
          teams: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          slack: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          skype: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          whatsapp: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          twitter: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        if (userAgents[appName.toLowerCase()]) {
          window.webContents.setUserAgent(userAgents[appName.toLowerCase()]);
        }

        // Carregar a URL
        console.log('Carregando URL:', url);
        try {
          // Verificar e corrigir URLs específicas
          let finalUrl = url;
          switch(appName.toLowerCase()) {
            case 'skype':
              if (!url.includes('web.skype.com')) {
                finalUrl = 'https://web.skype.com';
              }
              break;
            case 'teams':
              if (!url.includes('teams.microsoft.com')) {
                finalUrl = 'https://teams.microsoft.com';
              }
              break;
            case 'slack':
              if (!url.includes('app.slack.com')) {
                finalUrl = 'https://app.slack.com/client';
              }
              break;
            case 'whatsapp':
              if (!url.includes('web.whatsapp.com')) {
                finalUrl = 'https://web.whatsapp.com';
              }
              break;
          }

          await window.loadURL(finalUrl);
          console.log('URL carregada com sucesso:', finalUrl);
        } catch (error) {
          console.error(`Erro ao carregar URL do ${appName}:`, error);
          throw error;
        }

        // Configurar eventos da janela
        window.on('ready-to-show', () => {
          console.log(`Janela do ${appName} pronta para mostrar`);
          try {
            window.setBounds({
              x: parentWindow.getPosition()[0] + x,
              y: parentWindow.getPosition()[1] + y,
              width: width,
              height: height
            });
            
            // Configurações específicas para cada aplicativo
            switch(appName.toLowerCase()) {
              case 'teams':
              case 'slack':
              case 'skype':
              case 'whatsapp':
              case 'twitter':
              case 'google-chat':
                window.setBackgroundColor('#ffffff');
                break;
            }
            
            console.log(`Janela do ${appName} ajustada em ready-to-show:`, { x, y, width, height });
            console.log('Bounds atuais:', window.getBounds());
            console.log('Content Bounds atuais:', window.getContentBounds());

            window.show();
            window.focus();
            
            event.sender.send(`${appName.toLowerCase()}-window-ready`, { windowId: window.id });
          } catch (error) {
            console.error(`Erro ao configurar janela do ${appName} em ready-to-show:`, error);
          }
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
    const apps = [
      'teams', 
      'slack', 
      'skype', 
      'twitter', 
      'whatsapp', 
      'instagram', 
      'telegram', 
      'facebook-messenger',
      'discord', 
      'google-chat', 
      'wechat', 
      'snapchat', 
      'threads'
    ];

    // Registrar handlers para cada aplicativo
    apps.forEach(appName => {
      let normalizedAppName = appName.toLowerCase().replace(/-/g, '-');
      
      // Tratamento especial para o Facebook Messenger
      if (normalizedAppName === 'facebook' || normalizedAppName === 'facebookmessenger' || normalizedAppName === 'facebook-messenger') {
        normalizedAppName = 'facebook-messenger';
      }
      
      // Criar janela
      ipcMain.handle(`create-${normalizedAppName}-window`, async (event, windowData, wrapperBounds) => {
        return createAppWindowHandler(event, windowData, wrapperBounds, normalizedAppName);
      });

      // Atualizar bounds
      ipcMain.handle(`update-${normalizedAppName}-window-bounds`, async (event, windowId, newWrapperBounds) => {
        console.log(`Recebido update-${normalizedAppName}-window-bounds para janela:`, windowId, newWrapperBounds);
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
            console.log(`Janela do ${normalizedAppName} ajustada via update-${normalizedAppName}-window-bounds.`);
          }
        }
      });

      // Mostrar janela
      ipcMain.handle(`show-${normalizedAppName}-window`, async (event, windowId, wrapperBounds) => {
        console.log(`Mostrando janela do ${normalizedAppName}:`, windowId, wrapperBounds);
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

              console.log(`Janela do ${normalizedAppName} ajustada em show-${normalizedAppName}-window:`, wrapperBounds);
              console.log('Bounds atuais:', window.getBounds());
              console.log('Content Bounds atuais:', window.getContentBounds());

              if (!window.isVisible()) {
                window.show();
              }
              
              window.focus();
              event.sender.send(`${normalizedAppName}-window-ready`, { windowId: window.id });
              
              return true;
            } else {
              console.error(`Janela principal não encontrada ao tentar mostrar ${normalizedAppName}`);
              return false;
            }
          } catch (error) {
            console.error(`Erro ao mostrar janela do ${normalizedAppName}:`, error);
            return false;
          }
        } else {
          console.error(`Janela do ${normalizedAppName} não encontrada:`, windowId);
          return false;
        }
      });

      // Ocultar janela
      ipcMain.handle(`hide-${normalizedAppName}-window`, async (event, windowId) => {
        console.log(`Ocultando janela do ${normalizedAppName}:`, windowId);
        const window = this.windows.get(windowId);
        if (window) {
          try {
            if (window.isVisible()) {
              window.hide();
            }
            return true;
          } catch (error) {
            console.error(`Erro ao ocultar janela do ${normalizedAppName}:`, error);
            return false;
          }
        } else {
          console.error(`Janela do ${normalizedAppName} não encontrada para ocultar:`, windowId);
          return false;
        }
      });

      // Fechar janela
      ipcMain.handle(`close-${normalizedAppName}-window`, async (event, windowId) => {
        console.log(`Fechando janela do ${normalizedAppName}:`, windowId);
        const window = this.windows.get(windowId);
        if (window) {
          window.close();
        } else {
          console.error(`Janela do ${normalizedAppName} não encontrada:`, windowId);
        }
      });

      // Recarregar janela
      ipcMain.handle(`reload-${normalizedAppName}-window`, async (event, windowId) => {
        console.log(`Recarregando janela do ${normalizedAppName}:`, windowId);
        const window = this.windows.get(windowId);
        if (window) {
          await window.reload();
        } else {
          console.error(`Janela do ${normalizedAppName} não encontrada:`, windowId);
        }
      });

      // Manipular navegação
      ipcMain.on(`${normalizedAppName}-navigation`, (event, { windowId, url }) => {
        console.log(`Navegando na janela do ${normalizedAppName}:`, windowId, url);
        const window = this.windows.get(windowId);
        if (window) {
          window.loadURL(url);
        } else {
          console.error(`Janela do ${normalizedAppName} não encontrada:`, windowId);
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
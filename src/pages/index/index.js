document.addEventListener('DOMContentLoaded', async () => {
  // Constantes para otimização
  const MAX_CACHED_WEBVIEWS = 5;
  const CLEANUP_INTERVAL = 300000; // 5 minutos
  const LAZY_LOAD_DELAY = 300; // ms

  let currentZoom = 1.0;
  let currentWebview = null;
  let webviewCache = new Map();
  let webviewLastAccess = new Map();
  let linkedInWindowInstance = null;
  let teamsWindowInstance = null;
  let slackWindowInstance = null;
  let skypeWindowInstance = null;
  let twitterWindowInstance = null;
  let whatsappWindowInstance = null;
  let instagramWindowInstance = null;
  let telegramWindowInstance = null;
  let facebookMessengerWindowInstance = null;
  let discordWindowInstance = null;
  let googleChatWindowInstance = null;
  let wechatWindowInstance = null;
  let snapchatWindowInstance = null;
  let threadsWindowInstance = null;

  const services = {
    'home-button': 'webview-home',
    'settings-button': 'webview-settings',
    'todoist-button': 'webview-todoist',
  };

  const serviceMap = {
    'webview-home': '../../pages/home/home.html',
    'webview-todoist': 'https://app.todoist.com/auth/login',
    'webview-settings': '../../pages/settings/settings.html',
    'webview-teams': 'https://teams.microsoft.com',
    'webview-slack': 'https://app.slack.com/client',
    'webview-skype': 'https://web.skype.com',
    'webview-twitter': 'https://twitter.com',
    'webview-whatsapp': 'https://web.whatsapp.com',
    'webview-instagram': 'https://www.instagram.com',
    'webview-telegram': 'https://web.telegram.org/',
    'webview-facebook-messenger': 'https://www.messenger.com/',
    'webview-discord': 'https://discord.com/app',
    'webview-google-chat': 'https://chat.google.com/',
    'webview-wechat': 'https://web.wechat.com/',
    'webview-snapchat': 'https://web.snapchat.com/',
    'webview-threads': 'https://www.threads.net/',
  };

  const specialAppsMap = {
    'teams': 'teams.microsoft.com',
    'slack': 'app.slack.com',
    'skype': 'web.skype.com',
    'twitter': 'twitter.com',
    'whatsapp': 'web.whatsapp.com',
    'instagram': 'www.instagram.com',
    'telegram': 'web.telegram.org',
    'facebook-messenger': 'www.messenger.com',
    'discord': 'discord.com',
    'google-chat': 'chat.google.com',
    'wechat': 'web.wechat.com',
    'snapchat': 'web.snapchat.com',
    'threads': 'www.threads.net'
  };
  const specialApps = Object.keys(specialAppsMap);

  const getTitleFromWebviewId = (webviewId) => {
    if (!webviewId.startsWith('webview-')) return '';
    const name = webviewId.replace('webview-', '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Ajustar o container principal
  const webviewContainer = document.querySelector('.webview-container');
  if (webviewContainer) {
    webviewContainer.style.cssText = `
      position: absolute;
      top: 40px;
      left: 64px;
      right: 0;
      bottom: 0;
      overflow: hidden;
      background-color: var(--background);
    `;
  }

  const webviewWrapper = document.querySelector('.webview-wrapper');
  if (webviewWrapper) {
    webviewWrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      background-color: transparent;
    `;
  }

  // Ajustar z-index para cabeçalho e barra lateral
  const headerElement = document.getElementById('header');
  if (headerElement) {
    headerElement.style.position = 'fixed';
    headerElement.style.top = '0';
    headerElement.style.left = '0';
    headerElement.style.right = '0';
    headerElement.style.zIndex = '1000';
  }

  const sidebarElement = document.getElementById('sidebar');
  if (sidebarElement) {
    sidebarElement.style.position = 'fixed';
    sidebarElement.style.top = '0';
    sidebarElement.style.left = '0';
    sidebarElement.style.bottom = '0';
    sidebarElement.style.zIndex = '1000';
  }

  // Função genérica para criar janelas de aplicativos
  const createAppWindow = async (webviewId, url, appName) => {
    try {
      console.log(`Iniciando criação da janela do ${appName}...`, { webviewId, url });
      
      // Verificar qual instância usar baseado no appName
      let windowInstance = null;
      switch(appName.toLowerCase()) {
        case 'teams':
          windowInstance = teamsWindowInstance;
          break;
        case 'slack':
          windowInstance = slackWindowInstance;
          break;
        case 'skype':
          windowInstance = skypeWindowInstance;
          break;
        case 'linkedin':
          windowInstance = linkedInWindowInstance;
          break;
        case 'twitter':
          windowInstance = twitterWindowInstance;
          break;
        case 'whatsapp':
          windowInstance = whatsappWindowInstance;
          break;
        case 'instagram':
          windowInstance = instagramWindowInstance;
          break;
        case 'telegram':
          windowInstance = telegramWindowInstance;
          break;
        case 'facebook-messenger':
          windowInstance = facebookMessengerWindowInstance;
          break;
        case 'discord':
          windowInstance = discordWindowInstance;
          break;
        case 'google-chat':
          windowInstance = googleChatWindowInstance;
          break;
        case 'wechat':
          windowInstance = wechatWindowInstance;
          break;
        case 'snapchat':
          windowInstance = snapchatWindowInstance;
          break;
        case 'threads':
          windowInstance = threadsWindowInstance;
          break;
      }

      // Verificar se já existe uma instância ativa
      if (windowInstance && windowInstance.container) {
        console.log(`Janela do ${appName} já existe, reutilizando...`, {
          instanceId: windowInstance.id,
          hasContainer: !!windowInstance.container,
          containerClasses: windowInstance.container.className,
          containerDisplay: windowInstance.container.style.display
        });
        
        // Garantir que o container esteja posicionado corretamente
        const header = document.getElementById('header');
        const sidebar = document.getElementById('sidebar');
        const headerHeight = header ? header.offsetHeight : 60;
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 80;
        const headerMargin = 4;
        const bottomMargin = 4;

        // Configurações específicas para Slack e LinkedIn
        if (appName.toLowerCase() === 'slack' || appName.toLowerCase() === 'linkedin') {
          console.log(`Configurando container para ${appName}...`);
          windowInstance.container.style.cssText = `
            position: fixed;
            top: ${headerHeight + headerMargin}px;
            left: ${sidebarWidth}px;
            width: calc(100% - ${sidebarWidth}px);
            height: calc(100% - ${headerHeight + headerMargin + bottomMargin}px);
            background: #ffffff;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            opacity: 1;
            transition: all 0.3s ease-in-out;
            border: none;
            margin: 0;
            padding: 0;
            overflow: hidden;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          `;
        } else {
          windowInstance.container.style.cssText = `
            position: fixed;
            top: ${headerHeight + headerMargin}px;
            left: ${sidebarWidth}px;
            width: calc(100% - ${sidebarWidth}px);
            height: calc(100% - ${headerHeight + headerMargin + bottomMargin}px);
            background: transparent;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            opacity: 1;
            transition: all 0.3s ease-in-out;
            border: none;
            margin: 0;
            padding: 0;
            overflow: hidden;
          `;
        }

        // Forçar a exibição da janela
        if (windowInstance.id) {
          try {
            await window.electronAPI.invoke(`show-${appName.toLowerCase()}-window`, windowInstance.id, {
              x: sidebarWidth,
              y: headerHeight + headerMargin,
              width: window.innerWidth - sidebarWidth,
              height: window.innerHeight - (headerHeight + headerMargin + bottomMargin)
            });
            console.log(`Janela do ${appName} exibida com sucesso`);
          } catch (error) {
            console.error(`Erro ao exibir janela do ${appName}:`, error);
            // Tentar recriar a janela em caso de erro
            windowInstance = null;
          }
        }

        return windowInstance;
      }

      // Remover qualquer container existente antes de criar um novo
      document.querySelectorAll(`.${appName.toLowerCase()}-window-container`).forEach(container => {
        if (container !== windowInstance?.container) {
          console.log(`Removendo container antigo do ${appName}...`);
          container.remove();
        }
      });

      // Obter as dimensões reais do header e sidebar
      const header = document.getElementById('header');
      const sidebar = document.getElementById('sidebar');
      const headerHeight = header ? header.offsetHeight : 60;
      const sidebarWidth = sidebar ? sidebar.offsetWidth : 80;
      const headerMargin = 4;
      const bottomMargin = 4;

      // Configurações específicas para Slack e LinkedIn
      const windowData = {
        type: `${appName.toLowerCase()}-auth`,
        parent: webviewId,
        url: url,
        options: {
          width: window.innerWidth - sidebarWidth,
          height: window.innerHeight - (headerHeight + headerMargin + bottomMargin),
          modal: false,
          frame: false,
          transparent: true,
          backgroundColor: '#ffffff',
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            backgroundThrottling: false
          }
        }
      };

      // Configurações específicas para Slack e LinkedIn
      if (appName.toLowerCase() === 'slack' || appName.toLowerCase() === 'linkedin') {
        console.log(`Configurando opções específicas para ${appName}...`);
        windowData.options.webPreferences.backgroundThrottling = false;
        windowData.options.webPreferences.webSecurity = true;
        windowData.options.webPreferences.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        windowData.options.webPreferences.enableRemoteModule = true;
        windowData.options.webPreferences.nodeIntegrationInSubFrames = true;
        
        // Garantir que a URL seja a correta
        if (appName.toLowerCase() === 'slack' && !url.includes('app.slack.com')) {
          url = 'https://app.slack.com/client';
        }
        if (appName.toLowerCase() === 'linkedin' && !url.includes('linkedin.com')) {
          url = 'https://www.linkedin.com';
        }
        
        // Adicionar parâmetros para melhorar o carregamento
        if (!url.includes('?')) {
          url += '?web=true&app=true';
        }
        windowData.url = url;
      }

      console.log(`Solicitando criação da janela do ${appName}...`, windowData);
      const appWindow = await window.electronAPI.invoke(`create-${appName.toLowerCase()}-window`, windowData, {
        x: sidebarWidth,
        y: headerHeight + headerMargin,
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight - (headerHeight + headerMargin + bottomMargin)
      });
      
      if (appWindow) {
        console.log(`Janela do ${appName} criada com sucesso:`, appWindow.id);
        
        // Criar um container para a janela
        const container = document.createElement('div');
        container.id = `${webviewId}-container`;
        container.className = `${appName.toLowerCase()}-window-container webview`;
        
        // Configurações específicas para Slack e LinkedIn
        if (appName.toLowerCase() === 'slack' || appName.toLowerCase() === 'linkedin') {
          container.style.cssText = `
            position: fixed;
            top: ${headerHeight + headerMargin}px;
            left: ${sidebarWidth}px;
            width: calc(100% - ${sidebarWidth}px);
            height: calc(100% - ${headerHeight + headerMargin + bottomMargin}px);
            background: #ffffff;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            opacity: 1;
            transition: all 0.3s ease-in-out;
            border: none;
            margin: 0;
            padding: 0;
            overflow: hidden;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          `;
        } else {
          container.style.cssText = `
            position: fixed;
            top: ${headerHeight + headerMargin}px;
            left: ${sidebarWidth}px;
            width: calc(100% - ${sidebarWidth}px);
            height: calc(100% - ${headerHeight + headerMargin + bottomMargin}px);
            background: transparent;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            opacity: 1;
            transition: all 0.3s ease-in-out;
            border: none;
            margin: 0;
            padding: 0;
            overflow: hidden;
          `;
        }

        // Adicionar ao DOM dentro do webview-container
        const webviewContainer = document.querySelector('.webview-container');
        if (webviewContainer) {
          console.log(`Adicionando container do ${appName} ao DOM...`);
          webviewContainer.appendChild(container);
          
          // Garantir que o container esteja visível
          container.style.display = 'flex';
          container.style.opacity = '1';

          // Adicionar listener para redimensionamento da janela
          const resizeHandler = () => {
            const newHeaderHeight = header ? header.offsetHeight : 60;
            const newSidebarWidth = sidebar ? sidebar.offsetWidth : 80;
            
            container.style.top = `${newHeaderHeight + headerMargin}px`;
            container.style.left = `${newSidebarWidth}px`;
            container.style.width = `calc(100% - ${newSidebarWidth}px)`;
            container.style.height = `calc(100% - ${newHeaderHeight + headerMargin + bottomMargin}px)`;

            // Atualizar a janela com as novas dimensões
            if (windowInstance && windowInstance.id) {
              const newBounds = {
                x: newSidebarWidth,
                y: newHeaderHeight + headerMargin,
                width: window.innerWidth - newSidebarWidth,
                height: window.innerHeight - (newHeaderHeight + headerMargin + bottomMargin)
              };
              window.electronAPI.invoke(`update-${appName.toLowerCase()}-window-bounds`, windowInstance.id, newBounds).catch(error => {
                console.error(`Erro ao atualizar dimensões da janela do ${appName}:`, error);
              });
            }
          };

          // Usar ResizeObserver para melhor performance
          const resizeObserver = new ResizeObserver(resizeHandler);
          resizeObserver.observe(document.body);
          
          // Limpar observer quando a janela for fechada
          container.addEventListener('remove', () => {
            resizeObserver.disconnect();
          });
        } else {
          console.error('Container da webview não encontrado');
          return null;
        }

        // Criar e armazenar a instância da janela
        const windowInstance = {
          id: appWindow.id,
          container: container,
          addEventListener: (event, callback) => {
            if (event === 'dom-ready') {
              window.electronAPI.on(`${appName.toLowerCase()}-window-ready`, (data) => {
                if (data.windowId === appWindow.id) {
                  callback();
                }
              });
            }
          },
          remove: () => {
            console.log(`Removendo janela do ${appName} (instância):`, appWindow.id);
            container.style.opacity = '0';
            setTimeout(() => {
              window.electronAPI.invoke(`close-${appName.toLowerCase()}-window`, appWindow.id).catch(error => {
                console.error(`Erro ao fechar janela do ${appName}:`, error);
              });
              container.remove();
              switch(appName.toLowerCase()) {
                case 'teams':
                  teamsWindowInstance = null;
                  break;
                case 'slack':
                  slackWindowInstance = null;
                  break;
                case 'skype':
                  skypeWindowInstance = null;
                  break;
                case 'linkedin':
                  linkedInWindowInstance = null;
                  break;
                case 'twitter':
                  twitterWindowInstance = null;
                  break;
                case 'whatsapp':
                  whatsappWindowInstance = null;
                  break;
                case 'instagram':
                  instagramWindowInstance = null;
                  break;
                case 'telegram':
                  telegramWindowInstance = null;
                  break;
                case 'facebook-messenger':
                  facebookMessengerWindowInstance = null;
                  break;
                case 'discord':
                  discordWindowInstance = null;
                  break;
                case 'google-chat':
                  googleChatWindowInstance = null;
                  break;
                case 'wechat':
                  wechatWindowInstance = null;
                  break;
                case 'snapchat':
                  snapchatWindowInstance = null;
                  break;
                case 'threads':
                  threadsWindowInstance = null;
                  break;
              }
            }, 200);
          },
          reload: () => {
            console.log(`Recarregando janela do ${appName} (instância):`, appWindow.id);
            window.electronAPI.invoke(`reload-${appName.toLowerCase()}-window`, appWindow.id).catch(error => {
              console.error(`Erro ao recarregar janela do ${appName}:`, error);
            });
          }
        };

        // Armazenar a instância globalmente
        switch(appName.toLowerCase()) {
          case 'teams':
            teamsWindowInstance = windowInstance;
            break;
          case 'slack':
            slackWindowInstance = windowInstance;
            break;
          case 'skype':
            skypeWindowInstance = windowInstance;
            break;
          case 'linkedin':
            linkedInWindowInstance = windowInstance;
            break;
          case 'twitter':
            twitterWindowInstance = windowInstance;
            break;
          case 'whatsapp':
            whatsappWindowInstance = windowInstance;
            break;
          case 'instagram':
            instagramWindowInstance = windowInstance;
            break;
          case 'telegram':
            telegramWindowInstance = windowInstance;
            break;
          case 'facebook-messenger':
            facebookMessengerWindowInstance = windowInstance;
            break;
          case 'discord':
            discordWindowInstance = windowInstance;
            break;
          case 'google-chat':
            googleChatWindowInstance = windowInstance;
            break;
          case 'wechat':
            wechatWindowInstance = windowInstance;
            break;
          case 'snapchat':
            snapchatWindowInstance = windowInstance;
            break;
          case 'threads':
            threadsWindowInstance = windowInstance;
            break;
        }
        console.log(`Instância da janela do ${appName} armazenada`);
        return windowInstance;
      }
      console.error(`Falha ao criar janela do ${appName}`);
      return null;
    } catch (error) {
      console.error(`Erro ao criar janela do ${appName}:`, error);
      return null;
    }
  };

  // Função otimizada para gerenciar cache
  const updateWebviewAccess = (webviewId) => {
    webviewLastAccess.set(webviewId, Date.now());
  };

  const cleanupWebviewCache = () => {
    const now = Date.now();
    const entries = Array.from(webviewLastAccess.entries());
    entries.sort((a, b) => a[1] - b[1]);
    
    while (entries.length > MAX_CACHED_WEBVIEWS) {
      const [webviewId] = entries.shift();
      const webview = webviewCache.get(webviewId);
      if (webview && !webview.isDestroyed()) {
        webview.remove();
      }
      webviewCache.delete(webviewId);
      webviewLastAccess.delete(webviewId);
    }
  };

  // Função otimizada para criar webview
  const createWebview = (webviewId, url) => {
    try {
      if (webviewCache.has(webviewId)) {
        const cachedWebview = webviewCache.get(webviewId);
        if (!cachedWebview.isDestroyed()) {
          updateWebviewAccess(webviewId);
          return cachedWebview;
        }
        webviewCache.delete(webviewId);
        webviewLastAccess.delete(webviewId);
      }

      // Verificar se é uma janela especial
      const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram'];
      const isSpecialApp = specialApps.some(app => url && url.includes(`${app}.com`));
      const appName = isSpecialApp ? specialApps.find(app => url.includes(`${app}.com`)) : null;
      
      if (isSpecialApp) {
        console.log(`Iniciando criação de janela especial para ${appName}...`, { webviewId, url });
        
        // Verificar se a URL é válida
        if (!url || typeof url !== 'string') {
          console.error(`URL inválida para ${appName}:`, url);
          return null;
        }

        // Verificar se o webviewId é válido
        if (!webviewId || typeof webviewId !== 'string') {
          console.error(`webviewId inválido para ${appName}:`, webviewId);
          return null;
        }

        // Configurações específicas para Teams e LinkedIn
        if (appName === 'teams' || appName === 'linkedin') {
          console.log(`Configurando janela do ${appName}...`);
          // Garantir que a URL seja a correta
          if (appName === 'teams' && !url.includes('teams.microsoft.com')) {
            url = 'https://teams.microsoft.com';
          }
          if (appName === 'linkedin' && !url.includes('linkedin.com')) {
            url = 'https://www.linkedin.com';
          }
          
          // Adicionar parâmetros para melhorar o carregamento
          if (!url.includes('?')) {
            url += '?web=true&app=true';
          }
        }

        try {
          const windowInstance = createAppWindow(webviewId, url, appName);
          if (!windowInstance) {
            console.error(`Falha ao criar janela do ${appName}`);
            return null;
          }
          console.log(`Janela do ${appName} criada com sucesso`);
          return windowInstance;
        } catch (error) {
          console.error(`Erro ao criar janela do ${appName}:`, error);
          // Tentar recriar a janela em caso de erro
          setTimeout(() => {
            console.log(`Tentando recriar janela do ${appName}...`);
            createAppWindow(webviewId, url, appName);
          }, 1000);
          return null;
        }
      }

      // Para outras webviews, esconder todas as janelas especiais
      const specialInstances = [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance, twitterWindowInstance, whatsappWindowInstance, instagramWindowInstance, telegramWindowInstance, facebookMessengerWindowInstance, discordWindowInstance, googleChatWindowInstance, wechatWindowInstance, snapchatWindowInstance, threadsWindowInstance];
      
      specialInstances.forEach(instance => {
        if (instance && instance.container) {
          try {
            console.log('Escondendo janela especial...');
            instance.container.style.display = 'none';
            instance.container.style.opacity = '0';
            instance.container.classList.remove('active');
            
            // Verificar se instance.id existe e é uma string antes de fazer o split
            const appName = (instance.id && typeof instance.id === 'string') ? instance.id.split('-')[0] : (instance.container && instance.container.className ? instance.container.className.split('-')[0] : null);
            
            if (appName) {
              // Lista de aplicações que têm handlers IPC registrados
              const appsWithHandlers = ['slack', 'linkedin', 'teams', 'skype', 'twitter', 'whatsapp', 'instagram', 'telegram', 'facebook-messenger', 'discord', 'wechat', 'snapchat', 'threads', 'google-chat'];
              
              // Só tentar chamar o IPC se a aplicação tiver um handler registrado
              if (appsWithHandlers.includes(appName.toLowerCase())) {
                window.electronAPI.invoke(`hide-${appName.toLowerCase()}-window`, instance.id).catch(() => {});
              }
            }
          } catch (err) {
            // Ignorar erros silenciosamente para manter o comportamento atual
          }
        }
      });

      // Para outros serviços, continuar com o comportamento normal
      // Remover webview antiga se existir
      const oldWebview = document.getElementById(webviewId);
      if (oldWebview) {
        oldWebview.remove();
      }

      // Atualizar o botão correspondente
      const button = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
      if (button) {
        button.classList.add('opened');
      }

      // Criar a webview apenas para serviços não especiais
      const webview = document.createElement('webview');
      webview.id = webviewId;
      webview.className = 'webview active';
      webview.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border: none;
        margin: 0;
        padding: 0;
        overflow: hidden;
      `;

      webview.src = url || '../../pages/home/home.html';

      // Configurações comuns para todas as webviews
      webview.setAttribute('preload', '../../preload.js');
      webview.setAttribute('partition', 'persist:mainSession');
      webview.setAttribute('webpreferences', 'allowRunningInsecureContent=yes, experimentalFeatures=yes, webSecurity=no, plugins=yes, webgl=yes, nodeIntegrationInSubFrames=yes, backgroundThrottling=no');

      // Adicionar a webview ao container
      const webviewContainer = document.querySelector('.webview-container');
      if (webviewContainer) {
        webviewContainer.appendChild(webview);
        webviewCache.set(webviewId, webview);
        updateWebviewAccess(webviewId);
        return webview;
      } else {
        console.error('Container da webview não encontrado');
        return null;
      }
    } catch (error) {
      console.error('Erro ao criar webview:', error);
      return null;
    }
  };

  // Função otimizada para mostrar webview com lazy loading
  const showWebview = async (webviewId, buttonId) => {
    try {
      console.log('Mostrando webview:', { webviewId, buttonId });
      
      // Verificar se os parâmetros são válidos
      if (!webviewId || !buttonId) {
        console.error('webviewId ou buttonId inválidos:', { webviewId, buttonId });
        return;
      }
      
      // Obter as dimensões reais do header e sidebar
      const header = document.getElementById('header');
      const sidebar = document.getElementById('sidebar');
      const headerHeight = header ? header.offsetHeight : 60;
      const sidebarWidth = sidebar ? sidebar.offsetWidth : 80;
      const headerMargin = 4;
      const bottomMargin = 4;
      
      // Obter as dimensões do webview-container
      const webviewContainer = document.querySelector('.webview-container');
      if (!webviewContainer) {
        console.error('Container da webview não encontrado');
        return;
      }

      let containerBounds = webviewContainer.getBoundingClientRect().toJSON();
      containerBounds = {
        ...containerBounds,
        top: headerHeight + headerMargin,
        left: sidebarWidth,
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight - (headerHeight + headerMargin + bottomMargin)
      };
      
      // Primeiro, esconder todas as webviews e janelas especiais
      const allWebviews = document.querySelectorAll('.webview, .linkedin-window-container, .teams-window-container, .slack-window-container, .skype-window-container, .twitter-window-container, .whatsapp-window-container, .instagram-window-container, .telegram-window-container, .facebook-messenger-window-container, .discord-window-container, .google-chat-window-container, .wechat-window-container, .snapchat-window-container, .threads-window-container');
      
      allWebviews.forEach(w => {
        if (w && w.style) {
          w.classList.remove('active');
          w.style.display = 'none';
          w.style.opacity = '0';
        }
      });

      const allButtons = document.querySelectorAll('.nav-button');
      allButtons.forEach(b => {
        if (b) {
          b.classList.remove('active');
        }
      });

      // Adicionar classes ao botão atual
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.add('active');
        if (buttonId !== 'home-button') {
          button.classList.add('opened');
        }
        button.setAttribute('data-id', webviewId);
      }

      // Verificar se é uma janela especial
      const url = serviceMap[webviewId];
      if (!url) {
        console.error('URL não encontrada para webviewId:', webviewId);
        return;
      }

      const isSpecialApp = specialApps.some(app => url && url.includes(specialAppsMap[app]));
      const appName = isSpecialApp ? specialApps.find(app => url && url.includes(specialAppsMap[app])) : null;
      
      if (isSpecialApp && appName) {
        console.log(`Iniciando exibição do ${appName}...`);
        
        // Obter a instância correta
        let windowInstance = null;
        switch(appName.toLowerCase()) {
          case 'teams':
            windowInstance = teamsWindowInstance;
            break;
          case 'slack':
            windowInstance = slackWindowInstance;
            break;
          case 'skype':
            windowInstance = skypeWindowInstance;
            break;
          case 'linkedin':
            windowInstance = linkedInWindowInstance;
            break;
          case 'twitter':
            windowInstance = twitterWindowInstance;
            break;
          case 'whatsapp':
            windowInstance = whatsappWindowInstance;
            break;
          case 'instagram':
            windowInstance = instagramWindowInstance;
            break;
          case 'telegram':
            windowInstance = telegramWindowInstance;
            break;
          case 'facebook-messenger':
            windowInstance = facebookMessengerWindowInstance;
            break;
          case 'discord':
            windowInstance = discordWindowInstance;
            break;
          case 'google-chat':
            windowInstance = googleChatWindowInstance;
            break;
          case 'wechat':
            windowInstance = wechatWindowInstance;
            break;
          case 'snapchat':
            windowInstance = snapchatWindowInstance;
            break;
          case 'threads':
            windowInstance = threadsWindowInstance;
            break;
        }
        
        // Se já existe uma janela, apenas reutilizá-la
        if (windowInstance && windowInstance.container) {
          console.log(`Reutilizando janela do ${appName} existente...`, {
            instanceId: windowInstance.id,
            hasContainer: !!windowInstance.container,
            containerClasses: windowInstance.container.className,
            containerDisplay: windowInstance.container.style.display
          });
          
          // Remover qualquer container duplicado
          document.querySelectorAll(`.${appName.toLowerCase()}-window-container`).forEach(existingContainer => {
            if (existingContainer && existingContainer !== windowInstance.container) {
              existingContainer.remove();
            }
          });
          
          if (windowInstance.container) {
            try {
              windowInstance.container.style.display = 'flex';
              windowInstance.container.style.opacity = '1';
              windowInstance.container.classList.add('active');
              currentWebview = windowInstance;
              
              // Forçar a exibição da janela
              if (containerBounds && windowInstance.id) {
                try {
                  await window.electronAPI.invoke(`show-${appName.toLowerCase()}-window`, windowInstance.id, containerBounds);
                  console.log(`Janela do ${appName} exibida com sucesso`);
                } catch (error) {
                  console.error(`Erro ao exibir janela do ${appName}:`, error);
                  // Tentar recriar a janela em caso de erro
                  const newInstance = await createAppWindow(webviewId, url, appName);
                  if (newInstance && newInstance.container) {
                    newInstance.container.style.display = 'flex';
                    newInstance.container.style.opacity = '1';
                    newInstance.container.classList.add('active');
                    currentWebview = newInstance;
                  } else {
                    console.error(`Não foi possível criar nova janela para ${appName}`);
                  }
                }
              }
            } catch (err) {
              console.error(`Erro ao manipular container do ${appName}:`, err);
              // Tentar recriar a janela
              try {
                const newInstance = await createAppWindow(webviewId, url, appName);
                if (newInstance && newInstance.container) {
                  newInstance.container.style.display = 'flex';
                  newInstance.container.style.opacity = '1';
                  newInstance.container.classList.add('active');
                  currentWebview = newInstance;
                }
              } catch (createErr) {
                console.error(`Erro ao tentar recriar janela do ${appName}:`, createErr);
              }
            }
          } else {
            console.error(`Container não encontrado para janela do ${appName}`);
            // Tentar criar uma nova janela
            try {
              const newInstance = await createAppWindow(webviewId, url, appName);
              if (newInstance && newInstance.container) {
                newInstance.container.style.display = 'flex';
                newInstance.container.style.opacity = '1';
                newInstance.container.classList.add('active');
                currentWebview = newInstance;
              }
            } catch (createErr) {
              console.error(`Erro ao criar nova janela do ${appName}:`, createErr);
            }
          }
        } else {
          // Se não existe, criar uma nova janela
          console.log(`Criando nova janela do ${appName}...`);
          try {
            // Remover containers existentes
            document.querySelectorAll(`.${appName.toLowerCase()}-window-container`).forEach(container => {
              if (container) {
                container.remove();
              }
            });
            
            const newInstance = await createAppWindow(webviewId, url, appName);
            if (newInstance && newInstance.container) {
              newInstance.container.style.display = 'flex';
              newInstance.container.style.opacity = '1';
              newInstance.container.classList.add('active');
              currentWebview = newInstance;
            } else {
              console.error(`Falha ao criar janela do ${appName}: container não encontrado`);
            }
          } catch (err) {
            console.error(`Erro ao criar janela do ${appName}:`, err);
          }
        }
      } else {
        // Para outras webviews, esconder todas as janelas especiais
        const specialInstances = [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance, twitterWindowInstance, whatsappWindowInstance, instagramWindowInstance, telegramWindowInstance, facebookMessengerWindowInstance, discordWindowInstance, googleChatWindowInstance, wechatWindowInstance, snapchatWindowInstance, threadsWindowInstance];
        
        specialInstances.forEach(instance => {
          if (instance && instance.container) {
            try {
              console.log('Escondendo janela especial...');
              instance.container.style.display = 'none';
              instance.container.style.opacity = '0';
              instance.container.classList.remove('active');
              
              // Verificar se instance.id existe e é uma string antes de fazer o split
              const appName = (instance.id && typeof instance.id === 'string') ? instance.id.split('-')[0] : (instance.container && instance.container.className ? instance.container.className.split('-')[0] : null);
              
              if (appName) {
                // Lista de aplicações que têm handlers IPC registrados
                const appsWithHandlers = ['slack', 'linkedin', 'teams', 'skype', 'twitter', 'whatsapp', 'instagram', 'telegram', 'facebook-messenger', 'discord', 'wechat', 'snapchat', 'threads', 'google-chat'];
                
                // Só tentar chamar o IPC se a aplicação tiver um handler registrado
                if (appsWithHandlers.includes(appName.toLowerCase())) {
                  window.electronAPI.invoke(`hide-${appName.toLowerCase()}-window`, instance.id).catch(() => {});
                }
              }
            } catch (err) {
              // Ignorar erros silenciosamente para manter o comportamento atual
            }
          }
        });

        // Criar ou obter webview normal
        try {
          let webview = document.getElementById(webviewId);
          if (!webview) {
            webview = createWebview(webviewId, url);
          }
          
          if (webview) {
            updateWebviewAccess(webviewId);
            webview.style.display = 'flex';
            webview.style.opacity = '1';
            webview.classList.add('active');
            currentWebview = webview;
          } else {
            console.error(`Não foi possível criar ou obter webview para ${webviewId}`);
            // Tentar criar novamente com um pequeno delay
            setTimeout(async () => {
              try {
                const newWebview = createWebview(webviewId, url);
                if (newWebview) {
                  updateWebviewAccess(webviewId);
                  newWebview.style.display = 'flex';
                  newWebview.style.opacity = '1';
                  newWebview.classList.add('active');
                  currentWebview = newWebview;
                }
              } catch (err) {
                console.error(`Erro ao tentar recriar webview:`, err);
              }
            }, 100);
          }
        } catch (err) {
          console.error(`Erro ao manipular webview normal:`, err);
        }
      }

      // Atualizar o botão correspondente na sidebar
      const sidebarButton = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
      if (sidebarButton) {
        sidebarButton.classList.add('active');
        if (sidebarButton.id !== 'home-button') {
          sidebarButton.classList.add('opened');
        }
      }
    } catch (error) {
      console.error('Erro ao mostrar webview:', error);
    }
  };

  const updateActiveViewTitle = (webview) => {
    if (!webview) return;

    let title;
    if (webview.container) {
      // É uma janela do LinkedIn
      title = 'LinkedIn';
    } else {
      // É uma webview normal
      title = webview.getAttribute('alt');
    }

    const titleElement = document.getElementById('active-view-name');
    titleElement.textContent = title;
    titleElement.setAttribute('data-translate', title);
    webview.setAttribute('alt', title);

    // Traduzir o título imediatamente
    const currentLanguage = document.documentElement.lang;
    if (translations[currentLanguage] && translations[currentLanguage][title]) {
      titleElement.textContent = translations[currentLanguage][title];
    }
  };

  const loadWithToken = (token, userUuid) => {
    const navSection = document.getElementById('nav-section');
    if (navSection) {
      navSection.innerHTML = '';
      const homeButton = document.createElement('button');
      homeButton.id = 'home-button';
      homeButton.className = 'nav-button';
      homeButton.title = 'Space Hub';
      homeButton.setAttribute('data-id', 'webview-home');
      homeButton.innerHTML = `<img width="48" height="48" src="../../assets/spacehub.png" alt="Home"/>`;
      homeButton.addEventListener('click', () => showWebview('webview-home', 'home-button'));
      navSection.appendChild(homeButton);
    }

    fetch(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data.applications)) {
          data.applications.forEach(app => {
            if (app.active) {
              const appId = `webview-${app.application.toLowerCase()}`;
              const buttonId = `${app.application.toLowerCase()}-button`;

              serviceMap[appId] = app.url;
              services[buttonId] = appId;

              const button = createApplicationButton(app);
              button.addEventListener('click', () => showWebview(appId, buttonId));
              navSection?.appendChild(button);
            }
          });
        }
      })
      .catch(error => console.error('Error loading applications:', error));
  };

  function createApplicationButton(app) {
    const button = document.createElement('button');
    const appId = `webview-${app.application.toLowerCase()}`;
    const buttonId = `${app.application.toLowerCase()}-button`;
    
    button.id = buttonId;
    button.className = 'nav-button';
    button.title = app.application;
    button.setAttribute('data-id', appId);

    const img = document.createElement('img');
    img.src = app.icon;
    img.alt = app.application;
    img.width = 24;
    img.height = 24;
    img.style.objectFit = 'contain';
    img.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

    // Fallback para ícone local se o ícone da API não carregar
    img.onerror = () => {
      img.src = `../../assets/${app.application.toLowerCase()}.png`;
      img.width = 24;
      img.height = 24;
      img.style.objectFit = 'contain';
    };

    button.appendChild(img);
    return button;
  }

  const refreshApplications = () => {
    window.electronAPI.invoke('get-token').then(token => {
      if (!token) return console.error('Failed to get token');
      window.electronAPI.invoke('get-userUuid').then(userUuid => {
        if (!userUuid) return console.error('Failed to get userUuid');
        loadWithToken(token, userUuid);
      }).catch(err => console.error('Failed to get userUuid:', err));
    }).catch(err => console.error('Failed to get token:', err));
  };

  const setupButtonEvents = () => {
    Object.entries(services).forEach(([btnId, webviewId]) => {
      document.getElementById(btnId)?.addEventListener('click', () => showWebview(webviewId, btnId));
    });
  };

  const setupNotificationActions = () => {
    const badge = document.querySelector(".notification-badge");
    const list = document.getElementById("notification-list");

    const updateBadge = () => {
      const count = list.querySelectorAll('.notification-item').length;
      badge.textContent = count || '';
      badge.style.display = count ? 'flex' : 'none';
    };

    document.getElementById("clear-notifications")?.addEventListener("click", () => {
      list.innerHTML = '<div class="notification-empty">Nenhuma notificação disponível</div>';
      badge.style.display = "none";
    });

    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const service = item.getAttribute('data-service');
        const webviewId = `webview-${service}`;
        let webview = document.getElementById(webviewId);
        if (!webview) webview = createWebview(webviewId, serviceMap[webviewId]);
        document.querySelectorAll('webview').forEach(w => w.classList.remove('active'));
        webview.classList.add('active');
        updateActiveViewTitle(webview);
        currentWebview = webview;
        item.remove();
        updateBadge();
      });
    });

    updateBadge();
  };

  const setupMenus = () => {
    const menuBtn = document.getElementById("menu-button");
    const menu = document.getElementById("dropdown-menu");
    const bell = document.getElementById("notification-bell");
    const notifMenu = document.getElementById("notification-menu");

    menuBtn?.addEventListener("click", () => menu.classList.toggle("show"));
    bell?.addEventListener("click", () => {
      notifMenu.classList.toggle("show");
      menu.classList.remove("show");
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => menu.classList.remove("show"));
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !menuBtn.contains(e.target)) menu.classList.remove("show");
      if (!notifMenu.contains(e.target) && !bell.contains(e.target)) notifMenu.classList.remove("show");
    });
  };

  const setupSidebarScroll = () => {
    document.getElementById('sidebar')?.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.currentTarget.scrollTop += e.deltaY;
    });
  };

  const hasOpenWebviews = () => {
    const webviews = document.querySelectorAll('webview');
    return Array.from(webviews).some(webview => webview.id !== 'webview-home' && webview.id !== 'webview-settings');
  };

  const getMenuTemplate = async (currentViewId) => {
    const currentLanguage = await window.electronAPI.getLanguage();
    const translations = {
      'pt-BR': {
        'Atualizar Todos': 'Atualizar Todos',
        'Fechar Todos': 'Fechar Todos',
        'Atualizar': 'Atualizar',
        'Fechar': 'Fechar'
      },
      'en-US': {
        'Atualizar Todos': 'Refresh All',
        'Fechar Todos': 'Close All',
        'Atualizar': 'Refresh',
        'Fechar': 'Close'
      }
    };

    const t = translations[currentLanguage] || translations['en-US'];

    if (currentViewId === 'webview-home') {
      return [
        {
          command: 'reload-all',
          label: t['Atualizar Todos'],
          icon_svg: '<path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        {
          type: 'separator'
        },
        {
          command: 'close-all',
          label: t['Fechar Todos'],
          icon_svg: '<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>'
        }
      ];
    } else {
      return [
        {
          command: 'reload-current',
          label: t['Atualizar'],
          icon_svg: '<path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        {
          type: 'separator'
        },
        {
          command: 'close-current',
          label: t['Fechar'],
          icon_svg: '<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>'
        }
      ];
    }
  };

  const showContextMenu = async (x, y, currentViewId) => {
    if (!currentViewId) {
      console.log('No currentViewId provided');
      return;
    }

    // Verificar se é a home
    if (currentViewId === 'webview-home') {
      const menuTemplate = await getMenuTemplate(currentViewId);
      console.log(`[showContextMenu] Enviando requisição de menu de contexto para home em clientX: ${x}, clientY: ${y}`);
      window.electronAPI.invoke('show-context-menu-window', menuTemplate, x, y, currentViewId);
      return;
    }

    // Verificar se é um aplicativo especial
    const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat', 'facebook-messenger'];
    const isSpecialApp = specialApps.some(app => {
      // Tratamento especial para o Google Chat e Facebook Messenger
      if (app === 'google-chat' && currentViewId === 'webview-google') {
        console.log('[showContextMenu] Google Chat detectado como aplicativo especial');
        return true;
      }
      if (app === 'facebook-messenger' && currentViewId === 'webview-facebook') {
        console.log('[showContextMenu] Facebook Messenger detectado como aplicativo especial');
        return true;
      }
      return currentViewId.includes(app);
    });
    
    if (isSpecialApp) {
      const appName = specialApps.find(app => {
        if (app === 'google-chat' && currentViewId === 'webview-google') {
          return true;
        }
        if (app === 'facebook-messenger' && currentViewId === 'webview-facebook') {
          return true;
        }
        return currentViewId.includes(app);
      });
      let windowInstance = null;
      
      // Obter a instância correta do aplicativo
      switch(appName) {
        case 'google-chat':
          windowInstance = googleChatWindowInstance;
          console.log('[showContextMenu] Instância do Google Chat:', {
            hasInstance: !!windowInstance,
            instanceId: windowInstance?.id,
            hasContainer: !!windowInstance?.container,
            containerId: windowInstance?.container?.id,
            containerDisplay: windowInstance?.container?.style.display,
            containerClasses: windowInstance?.container?.className
          });
          break;
        case 'facebook-messenger':
          windowInstance = facebookMessengerWindowInstance;
          console.log('[showContextMenu] Instância do Facebook Messenger:', {
            hasInstance: !!windowInstance,
            instanceId: windowInstance?.id,
            hasContainer: !!windowInstance?.container,
            containerId: windowInstance?.container?.id,
            containerDisplay: windowInstance?.container?.style.display,
            containerClasses: windowInstance?.container?.className
          });
          break;
        case 'teams':
          windowInstance = teamsWindowInstance;
          break;
        case 'slack':
          windowInstance = slackWindowInstance;
          break;
        case 'skype':
          windowInstance = skypeWindowInstance;
          break;
        case 'linkedin':
          windowInstance = linkedInWindowInstance;
          break;
        case 'twitter':
          windowInstance = twitterWindowInstance;
          break;
        case 'whatsapp':
          windowInstance = whatsappWindowInstance;
          break;
        case 'instagram':
          windowInstance = instagramWindowInstance;
          break;
      }

      // Verificar se o botão está ativo
      const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
      const isButtonActive = button && (button.classList.contains('active') || button.classList.contains('opened'));

      // Verificar se a janela está ativa
      const isWindowActive = windowInstance && 
                           windowInstance.container && 
                           (windowInstance.container.classList.contains('active') || 
                            windowInstance.container.style.display === 'flex');

      console.log(`[showContextMenu] Verificando menu de contexto para ${appName}:`, {
        currentViewId,
        hasInstance: !!windowInstance,
        hasContainer: !!(windowInstance && windowInstance.container),
        isButtonActive,
        isWindowActive,
        buttonClasses: button?.className,
        containerClasses: windowInstance?.container?.className,
        containerDisplay: windowInstance?.container?.style.display
      });

      if (isButtonActive || isWindowActive) {
        // Obter o template do menu
        const menuTemplate = await getMenuTemplate(currentViewId);
        console.log(`[showContextMenu] Enviando requisição de menu de contexto para ${currentViewId} em clientX: ${x}, clientY: ${y}`);
        window.electronAPI.invoke('show-context-menu-window', menuTemplate, x, y, currentViewId);
      } else {
        console.log(`[showContextMenu] Menu de contexto não mostrado para ${appName} - nem botão nem janela estão ativos`);
      }
    }
  };

  const setupContextMenu = () => {
    // Adicionar evento de contexto para a sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target.closest('.nav-button');
        if (!target) {
          console.log('Nenhum botão encontrado');
          return;
        }

        const webviewId = target.getAttribute('data-id');
        if (!webviewId) {
          return;
        }

        // Verificar se é a home
        if (webviewId === 'webview-home') {
          const isButtonActive = target.classList.contains('active') || target.classList.contains('opened');
          if (isButtonActive) {
            console.log('Mostrando menu de contexto para home:', {
              webviewId,
              isButtonActive,
              buttonClasses: target.className,
              buttonDataId: target.getAttribute('data-id')
            });
            showContextMenu(e.clientX, e.clientY, webviewId);
          }
          return;
        }

        // Verificar se é um botão de aplicativo especial
        const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat'];
        const isSpecialApp = specialApps.some(app => webviewId.includes(app));
        
        if (isSpecialApp) {
          const appName = specialApps.find(app => webviewId.includes(app));
          let windowInstance = null;
          
          // Obter a instância correta do aplicativo
          switch(appName) {
            case 'teams':
              windowInstance = teamsWindowInstance;
              break;
            case 'slack':
              windowInstance = slackWindowInstance;
              break;
            case 'skype':
              windowInstance = skypeWindowInstance;
              break;
            case 'linkedin':
              windowInstance = linkedInWindowInstance;
              break;
            case 'twitter':
              windowInstance = twitterWindowInstance;
              break;
            case 'whatsapp':
              windowInstance = whatsappWindowInstance;
              break;
            case 'instagram':
              windowInstance = instagramWindowInstance;
              break;
            case 'google-chat':
              windowInstance = googleChatWindowInstance;
              break;
          }
          
          // Verificar se o botão está ativo ou se a janela está ativa
          const isButtonActive = target.classList.contains('active') || 
                                target.classList.contains('opened') ||
                                target.getAttribute('data-id') === webviewId;

          const isWindowActive = windowInstance && 
                               windowInstance.container && 
                               (windowInstance.container.classList.contains('active') || 
                                windowInstance.container.style.display === 'flex');

          console.log(`Verificando menu de contexto para ${appName}:`, {
            webviewId,
            hasInstance: !!windowInstance,
            hasContainer: !!(windowInstance && windowInstance.container),
            isButtonActive,
            isWindowActive,
            buttonClasses: target.className,
            buttonDataId: target.getAttribute('data-id'),
            containerClasses: windowInstance?.container?.className,
            containerDisplay: windowInstance?.container?.style.display
          });

          // Mostrar o menu se o botão estiver ativo ou se a janela estiver ativa
          if (isButtonActive || isWindowActive) {
            console.log(`Mostrando menu de contexto para ${appName} - botão ou janela ativos`);
            showContextMenu(e.clientX, e.clientY, webviewId);
          } else {
            console.log(`Menu de contexto não mostrado para ${appName} - nem botão nem janela estão ativos`);
          }
        } else {
          // Para webviews normais
          const isButtonActive = target.classList.contains('active') || 
                                target.classList.contains('opened') ||
                                target.getAttribute('data-id') === webviewId;
          
          if (isButtonActive) {
            console.log('Mostrando menu de contexto para webview normal:', {
              webviewId,
              isButtonActive,
              buttonClasses: target.className,
              buttonDataId: target.getAttribute('data-id')
            });
            showContextMenu(e.clientX, e.clientY, webviewId);
          }
        }
      });
    }

    // Adicionar evento de contexto para containers de aplicativos especiais
    document.addEventListener('contextmenu', (e) => {
      const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat'];
      const container = specialApps.map(app => e.target.closest(`.${app}-window-container`)).find(c => c);
      
      if (container) {
        const appName = specialApps.find(app => container.className.includes(app));
        const webviewId = container.id.replace('-container', '');
        
        // Verificar se o container está ativo
        const isActive = container.classList.contains('active') || 
                        container.style.display === 'flex';
        
        console.log(`Verificando menu de contexto para ${appName} no container:`, {
          webviewId,
          containerClasses: container.className,
          containerDisplay: container.style.display,
          isActive
        });
        
        if (isActive) {
          e.preventDefault();
          e.stopPropagation();
          
          let windowInstance = null;
          switch(appName) {
            case 'teams':
              windowInstance = teamsWindowInstance;
              break;
            case 'slack':
              windowInstance = slackWindowInstance;
              break;
            case 'skype':
              windowInstance = skypeWindowInstance;
              break;
            case 'linkedin':
              windowInstance = linkedInWindowInstance;
              break;
            case 'twitter':
              windowInstance = twitterWindowInstance;
              break;
            case 'whatsapp':
              windowInstance = whatsappWindowInstance;
              break;
            case 'instagram':
              windowInstance = instagramWindowInstance;
              break;
            case 'google-chat':
              windowInstance = googleChatWindowInstance;
              break;
          }
          
          if (webviewId && windowInstance && windowInstance.container === container) {
            console.log(`Mostrando menu de contexto para ${appName} no container:`, webviewId);
            showContextMenu(e.clientX, e.clientY, webviewId);
          }
        }
      }
    });

    // Adicionar evento de contexto para webviews normais
    document.addEventListener('contextmenu', (e) => {
      const webview = e.target.closest('webview');
      if (webview) {
        const isActive = webview.classList.contains('active') || 
                        webview.style.display === 'flex';
        
        // Verificar se é a home
        if (webview.id === 'webview-home') {
          if (isActive) {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e.clientX, e.clientY, webview.id);
          }
          return;
        }
        
        console.log('Verificando menu de contexto para webview normal:', {
          webviewId: webview.id,
          webviewClasses: webview.className,
          webviewDisplay: webview.style.display,
          isActive
        });
        
        if (isActive) {
          e.preventDefault();
          e.stopPropagation();
          showContextMenu(e.clientX, e.clientY, webview.id);
        }
      }
    });
  };

  const setupMenuEvents = (menu, currentViewId) => {
    console.log('Setting up menu events for:', currentViewId);
    
    // O menu é agora uma janela separada, então os eventos de clique são tratados nela
    // e os comandos são enviados de volta para esta janela (mainWindow) via IPC.
    // Não precisamos mais do `menu.querySelectorAll('.context-menu-item').forEach` aqui.
  };

  // Listener para os comandos do menu de contexto vindos do processo principal
  window.electronAPI.on('execute-context-menu-command', async (command, currentViewId) => {
    console.log('[execute-context-menu-command] Iniciando execução do comando:', {
      command,
      currentViewId,
      timestamp: new Date().toISOString()
    });

    // Lista de todas as instâncias especiais
    const allSpecialInstances = [
      linkedInWindowInstance,
      teamsWindowInstance,
      slackWindowInstance,
      skypeWindowInstance,
      twitterWindowInstance,
      whatsappWindowInstance,
      instagramWindowInstance,
      telegramWindowInstance,
      facebookMessengerWindowInstance,
      discordWindowInstance,
      googleChatWindowInstance,
      wechatWindowInstance,
      snapchatWindowInstance,
      threadsWindowInstance
    ];

    // Verificar se é um aplicativo especial (necessário para close-current)
    const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat', 'facebook-messenger'];
    const isSpecialApp = specialApps.some(app => {
      // Tratamento especial para o Google Chat e Facebook Messenger
      if (app === 'google-chat' && currentViewId === 'webview-google') {
        console.log('[execute-context-menu-command] Google Chat detectado como aplicativo especial');
        return true;
      }
      if (app === 'facebook-messenger' && currentViewId === 'webview-facebook') {
        console.log('[execute-context-menu-command] Facebook Messenger detectado como aplicativo especial');
        return true;
      }
      return currentViewId.includes(app);
    });
    const appName = isSpecialApp ? 
      (currentViewId === 'webview-google' ? 'google-chat' : 
       currentViewId === 'webview-facebook' ? 'facebook-messenger' : 
       specialApps.find(app => currentViewId.includes(app))) : null;

    console.log('[execute-context-menu-command] Menu context:', { 
      isSpecialApp, 
      appName, 
      currentViewId,
      googleChatInstance: googleChatWindowInstance ? {
        id: googleChatWindowInstance.id,
        hasContainer: !!googleChatWindowInstance.container,
        containerId: googleChatWindowInstance.container?.id,
        containerDisplay: googleChatWindowInstance.container?.style.display,
        containerClasses: googleChatWindowInstance.container?.className
      } : null,
      facebookMessengerInstance: facebookMessengerWindowInstance ? {
        id: facebookMessengerWindowInstance.id,
        hasContainer: !!facebookMessengerWindowInstance.container,
        containerId: facebookMessengerWindowInstance.container?.id,
        containerDisplay: facebookMessengerWindowInstance.container?.style.display,
        containerClasses: facebookMessengerWindowInstance.container?.className
      } : null
    });

    switch (command) {
      case 'reload-current':
        console.log(`[execute-context-menu-command] Executando reload-current para: ${currentViewId}`);
        
        if (isSpecialApp) {
          let windowInstance = null;
          switch(appName) {
            case 'google-chat':
              windowInstance = googleChatWindowInstance;
              break;
            case 'facebook-messenger':
              windowInstance = facebookMessengerWindowInstance;
              break;
            case 'teams':
              windowInstance = teamsWindowInstance;
              break;
            case 'slack':
              windowInstance = slackWindowInstance;
              break;
            case 'skype':
              windowInstance = skypeWindowInstance;
              break;
            case 'linkedin':
              windowInstance = linkedInWindowInstance;
              break;
            case 'twitter':
              windowInstance = twitterWindowInstance;
              break;
            case 'whatsapp':
              windowInstance = whatsappWindowInstance;
              break;
            case 'instagram':
              windowInstance = instagramWindowInstance;
              break;
          }

          if (windowInstance && windowInstance.id) {
            try {
              console.log(`[execute-context-menu-command] Recarregando janela do ${appName}...`);
              await window.electronAPI.invoke(`reload-${appName}-window`, windowInstance.id);
              console.log(`[execute-context-menu-command] Janela do ${appName} recarregada com sucesso`);
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao recarregar janela do ${appName}:`, error);
            }
          }
        } else {
          // Para webviews normais
          const webview = document.getElementById(currentViewId);
          if (webview) {
            try {
              console.log(`[execute-context-menu-command] Recarregando webview ${currentViewId}...`);
              
              // Verificar se é home ou settings
              if (currentViewId === 'webview-home') {
                webview.src = '../../pages/home/home.html';
                updateActiveViewTitle(webview);
                refreshApplications();
              } else if (currentViewId === 'webview-settings') {
                webview.src = '../../pages/settings/settings.html';
              } else {
                webview.reload();
              }
              
              console.log(`[execute-context-menu-command] Webview ${currentViewId} recarregada com sucesso`);
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao recarregar webview ${currentViewId}:`, error);
            }
          } else {
            console.log(`[execute-context-menu-command] Webview ${currentViewId} não encontrada, tentando recriar...`);
            try {
              const url = serviceMap[currentViewId];
              if (url) {
                showWebview(currentViewId, `${currentViewId.replace('webview-', '')}-button`);
              }
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao recriar webview ${currentViewId}:`, error);
            }
          }
        }
        break;

      case 'reload-all':
        console.log('[execute-context-menu-command] Executando reload-all...');
        
        // Recarregar cada janela especial que está aberta
        for (const instance of allSpecialInstances) {
          if (instance && instance.container && 
              (instance.container.style.display === 'flex' || 
               instance.container.style.display === 'block' || 
               instance.container.style.opacity === '1')) {
            try {
              const appName = instance.container.className.split('-')[0];
              console.log(`[execute-context-menu-command] Recarregando janela do ${appName}...`);
              
              // Recarregar a janela via IPC
              if (instance.id) {
                await window.electronAPI.invoke(`reload-${appName}-window`, instance.id);
                console.log(`[execute-context-menu-command] Janela do ${appName} recarregada com sucesso`);
              }
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao recarregar janela do ${appName}:`, error);
            }
          }
        }

        // Recarregar todas as webviews que estão abertas
        const openWebviews = document.querySelectorAll('webview');
        openWebviews.forEach(webview => {
          if (webview.id !== 'webview-home' && webview.id !== 'webview-settings') {
            // Verificar se a webview está visível
            const isVisible = webview.style.display === 'flex' || 
                            webview.style.display === 'block' || 
                            webview.style.opacity === '1' ||
                            window.getComputedStyle(webview).display !== 'none';
            
            if (isVisible) {
              try {
                console.log(`[execute-context-menu-command] Recarregando webview ${webview.id}...`);
                webview.reload();
                console.log(`[execute-context-menu-command] Webview ${webview.id} recarregada com sucesso`);
              } catch (error) {
                console.error(`[execute-context-menu-command] Erro ao recarregar webview ${webview.id}:`, error);
              }
            }
          }
        });

        // Recarregar a home
        try {
          console.log('[execute-context-menu-command] Iniciando recarregamento da home...');
          const homeWebview = document.getElementById('webview-home');
          
          if (homeWebview) {
            // Forçar recarregamento da home
            homeWebview.src = '../../pages/home/home.html';
            console.log('[execute-context-menu-command] Home recarregada com sucesso');
            
            // Atualizar o título
            updateActiveViewTitle(homeWebview);
            
            // Recarregar aplicações
            refreshApplications();
          } else {
            console.log('[execute-context-menu-command] Home não encontrada, criando nova instância...');
            showWebview('webview-home', 'home-button');
          }
        } catch (error) {
          console.error('[execute-context-menu-command] Erro ao recarregar home:', error);
          // Tentar recriar a home em caso de erro
          try {
            showWebview('webview-home', 'home-button');
          } catch (retryError) {
            console.error('[execute-context-menu-command] Erro ao tentar recriar home:', retryError);
          }
        }

        // Recarregar as configurações se estiverem abertas
        const settingsWebview = document.getElementById('webview-settings');
        if (settingsWebview) {
          const isSettingsVisible = settingsWebview.style.display === 'flex' || 
                                  settingsWebview.style.display === 'block' || 
                                  settingsWebview.style.opacity === '1' ||
                                  window.getComputedStyle(settingsWebview).display !== 'none';
          
          if (isSettingsVisible) {
            try {
              console.log('[execute-context-menu-command] Recarregando configurações...');
              settingsWebview.src = '../../pages/settings/settings.html';
              console.log('[execute-context-menu-command] Configurações recarregadas com sucesso');
            } catch (error) {
              console.error('[execute-context-menu-command] Erro ao recarregar configurações:', error);
            }
          }
        }
        break;

      case 'close-all':
        console.log('[execute-context-menu-command] Executando close-all...');
        
        // Fechar cada janela especial ativa
        for (const instance of allSpecialInstances) {
          if (instance && instance.container) {
            try {
              const appName = instance.container.className.split('-')[0];
              console.log(`[execute-context-menu-command] Fechando janela do ${appName}...`);
              
              // Esconder o container visualmente
              instance.container.style.opacity = '0';
              instance.container.style.display = 'none';
              instance.container.classList.remove('active');

              // Fechar a janela via IPC
              if (instance.id) {
                await window.electronAPI.invoke(`close-${appName}-window`, instance.id);
              }

              // Remover o container
              instance.container.remove();

              // Limpar a instância global
              switch(appName) {
                case 'linkedin':
                  linkedInWindowInstance = null;
                  break;
                case 'teams':
                  teamsWindowInstance = null;
                  break;
                case 'slack':
                  slackWindowInstance = null;
                  break;
                case 'skype':
                  skypeWindowInstance = null;
                  break;
                case 'twitter':
                  twitterWindowInstance = null;
                  break;
                case 'whatsapp':
                  whatsappWindowInstance = null;
                  break;
                case 'instagram':
                  instagramWindowInstance = null;
                  break;
                case 'telegram':
                  telegramWindowInstance = null;
                  break;
                case 'facebook-messenger':
                  facebookMessengerWindowInstance = null;
                  break;
                case 'discord':
                  discordWindowInstance = null;
                  break;
                case 'google-chat':
                  googleChatWindowInstance = null;
                  break;
                case 'wechat':
                  wechatWindowInstance = null;
                  break;
                case 'snapchat':
                  snapchatWindowInstance = null;
                  break;
                case 'threads':
                  threadsWindowInstance = null;
                  break;
              }
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao fechar janela especial:`, error);
            }
          }
        }

        // Fechar todas as webviews normais exceto a home
        const allWebviews = document.querySelectorAll('webview');
        allWebviews.forEach(webview => {
          if (webview.id !== 'webview-home' && webview.id !== 'webview-settings') {
            try {
              webview.remove();
              webviewCache.delete(webview.id);
              webviewLastAccess.delete(webview.id);
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao remover webview ${webview.id}:`, error);
            }
          }
        });

        // Atualizar todos os botões na sidebar
        const buttons = document.querySelectorAll('.nav-button');
        buttons.forEach(button => {
          if (button.id !== 'home-button' && button.id !== 'settings-button') {
            button.classList.remove('active', 'opened');
          }
        });

        // Mostrar a home
        showWebview('webview-home', 'home-button');
        break;

      case 'close-current':
        console.log(`[execute-context-menu-command] Executando close-current para: ${currentViewId}`);
        if (isSpecialApp) {
          let windowInstance = null;
          switch(appName) {
            case 'google-chat':
              windowInstance = googleChatWindowInstance;
              console.log('[execute-context-menu-command] Instância do Google Chat encontrada:', {
                hasInstance: !!windowInstance,
                instanceId: windowInstance?.id,
                hasContainer: !!windowInstance?.container,
                containerId: windowInstance?.container?.id,
                containerDisplay: windowInstance?.container?.style.display,
                containerClasses: windowInstance?.container?.className
              });
              break;
            case 'facebook-messenger':
              windowInstance = facebookMessengerWindowInstance;
              console.log('[execute-context-menu-command] Instância do Facebook Messenger encontrada:', {
                hasInstance: !!windowInstance,
                instanceId: windowInstance?.id,
                hasContainer: !!windowInstance?.container,
                containerId: windowInstance?.container?.id,
                containerDisplay: windowInstance?.container?.style.display,
                containerClasses: windowInstance?.container?.className
              });
              break;
            case 'teams':
              windowInstance = teamsWindowInstance;
              break;
            case 'slack':
              windowInstance = slackWindowInstance;
              break;
            case 'skype':
              windowInstance = skypeWindowInstance;
              break;
            case 'linkedin':
              windowInstance = linkedInWindowInstance;
              break;
            case 'twitter':
              windowInstance = twitterWindowInstance;
              break;
            case 'whatsapp':
              windowInstance = whatsappWindowInstance;
              break;
            case 'instagram':
              windowInstance = instagramWindowInstance;
              break;
          }

          // Verificar se temos uma instância válida
          if (windowInstance) {
            console.log(`[execute-context-menu-command] Iniciando processo de fechamento do ${appName}...`, {
              instanceId: windowInstance.id,
              hasContainer: !!windowInstance.container,
              containerClasses: windowInstance.container?.className,
              containerDisplay: windowInstance.container?.style.display,
              containerId: windowInstance.container?.id,
              appName: appName,
              currentViewId: currentViewId,
              timestamp: new Date().toISOString()
            });

            try {
              // Primeiro, esconder o container visualmente
              if (windowInstance.container) {
                console.log(`[execute-context-menu-command] Escondendo container do ${appName}...`);
                windowInstance.container.style.opacity = '0';
                windowInstance.container.style.display = 'none';
                windowInstance.container.classList.remove('active');
                console.log(`[execute-context-menu-command] Container do ${appName} escondido:`, {
                  display: windowInstance.container.style.display,
                  opacity: windowInstance.container.style.opacity,
                  classes: windowInstance.container.className
                });
              }

              // Tentar fechar a janela via IPC
              if (windowInstance.id) {
                console.log(`[execute-context-menu-command] Enviando comando close-${appName}-window para janela ${windowInstance.id}`);
                await window.electronAPI.invoke(`close-${appName}-window`, windowInstance.id);
                console.log(`[execute-context-menu-command] Comando de fechar ${appName} enviado com sucesso`);
              } else {
                console.error(`[execute-context-menu-command] ID da janela do ${appName} não encontrado`);
              }

              // Limpar a instância global após um pequeno delay
              setTimeout(() => {
                console.log(`[execute-context-menu-command] Iniciando limpeza de recursos do ${appName}...`);
                
                // Remover o container do DOM
                if (windowInstance.container) {
                  console.log(`[execute-context-menu-command] Removendo container do ${appName} do DOM`);
                  windowInstance.container.remove();
                }

                // Limpar a instância global
                switch(appName) {
                  case 'google-chat':
                    console.log('[execute-context-menu-command] Limpando instância global do Google Chat');
                    googleChatWindowInstance = null;
                    break;
                  case 'facebook-messenger':
                    console.log('[execute-context-menu-command] Limpando instância global do Facebook Messenger');
                    facebookMessengerWindowInstance = null;
                    break;
                  case 'teams':
                    teamsWindowInstance = null;
                    break;
                  case 'slack':
                    slackWindowInstance = null;
                    break;
                  case 'skype':
                    skypeWindowInstance = null;
                    break;
                  case 'linkedin':
                    linkedInWindowInstance = null;
                    break;
                  case 'twitter':
                    twitterWindowInstance = null;
                    break;
                  case 'whatsapp':
                    whatsappWindowInstance = null;
                    break;
                  case 'instagram':
                    instagramWindowInstance = null;
                    break;
                }

                // Atualizar o botão na sidebar
                const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
                if (button) {
                  console.log(`[execute-context-menu-command] Atualizando estado do botão do ${appName}`);
                  button.classList.remove('opened', 'active');
                }

                // Se não houver mais webviews abertas, mostrar a home
                if (!hasOpenWebviews()) {
                  console.log('[execute-context-menu-command] Nenhuma webview aberta, mostrando home');
                  showWebview('webview-home', 'home-button');
                }

                console.log(`[execute-context-menu-command] ${appName} fechado e recursos limpos com sucesso`);
              }, 200);
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao fechar ${appName}:`, error);
              
              // Mesmo em caso de erro, tentar limpar os recursos
              if (windowInstance.container) {
                console.log(`[execute-context-menu-command] Tentando limpar recursos do ${appName} após erro`);
                windowInstance.container.remove();
              }

              // Limpar a instância global
              switch(appName) {
                case 'google-chat':
                  console.log('[execute-context-menu-command] Limpando instância global do Google Chat após erro');
                  googleChatWindowInstance = null;
                  break;
                case 'facebook-messenger':
                  console.log('[execute-context-menu-command] Limpando instância global do Facebook Messenger após erro');
                  facebookMessengerWindowInstance = null;
                  break;
                case 'teams':
                  teamsWindowInstance = null;
                  break;
                case 'slack':
                  slackWindowInstance = null;
                  break;
                case 'skype':
                  skypeWindowInstance = null;
                  break;
                case 'linkedin':
                  linkedInWindowInstance = null;
                  break;
                case 'twitter':
                  twitterWindowInstance = null;
                  break;
                case 'whatsapp':
                  whatsappWindowInstance = null;
                  break;
                case 'instagram':
                  instagramWindowInstance = null;
                  break;
              }

              // Atualizar o botão na sidebar
              const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
              if (button) {
                console.log(`[execute-context-menu-command] Atualizando estado do botão do ${appName} após erro`);
                button.classList.remove('opened', 'active');
              }

              // Se não houver mais webviews abertas, mostrar a home
              if (!hasOpenWebviews()) {
                console.log('[execute-context-menu-command] Nenhuma webview aberta após erro, mostrando home');
                showWebview('webview-home', 'home-button');
              }
            }
          } else {
            console.log(`[execute-context-menu-command] ${appName} não está ativo para fechar - instância não encontrada`);
          }
        }
        break;
      // ... outros casos ...
    }
  });

  const isWebviewActive = (webviewId) => {
    const webview = document.getElementById(webviewId);
    return webview && (webview.classList.contains('active') || webview.classList.contains('opened'));
  };

  const showConfirmationDialog = async (message, onConfirm) => {
    const currentLanguage = await window.electronAPI.getLanguage();
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
      <div class="confirmation-content">
        <h3>${translations[currentLanguage]['Confirmação']}</h3>
        <p>${message}</p>
        <div class="confirmation-buttons">
          <button class="confirm-btn">${translations[currentLanguage]['Confirmar']}</button>
          <button class="cancel-btn">${translations[currentLanguage]['Cancelar']}</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');

    confirmBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
      onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  };

  // Evento separado para recarregar aplicações (emitido pelo processo principal)
  window.electronAPI.on('reload-applications', () => {
    refreshApplications();
  });

  const setupDarkMode = () => {
    // Verificar se o modo escuro está ativado no localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('dark-mode', isDarkMode);

    // Adicionar listener para mudanças no modo escuro
    window.electronAPI.onDarkModeChanged((isDark) => {
      document.documentElement.classList.toggle('dark-mode', isDark);
      document.body.classList.toggle('dark-mode', isDark);
      localStorage.setItem('darkMode', isDark);
    });
  };

  // Sistema de limpeza de memória
  const setupMemoryManagement = () => {
    // Limpar cache periodicamente
    setInterval(cleanupWebviewCache, CLEANUP_INTERVAL);

    // Limpeza geral de memória
    setInterval(() => {
      // Limpar listeners não utilizados
      document.querySelectorAll('webview').forEach(webview => {
        if (!webview.classList.contains('active')) {
          webview.removeAllListeners();
        }
      });

      // Limpar containers não utilizados
      document.querySelectorAll('.window-container').forEach(container => {
        if (!container.classList.contains('active')) {
          container.remove();
        }
      });

      // Limpar instâncias de janelas especiais não utilizadas
      [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, 
       skypeWindowInstance, twitterWindowInstance, whatsappWindowInstance, 
       instagramWindowInstance, telegramWindowInstance, facebookMessengerWindowInstance, 
       discordWindowInstance, googleChatWindowInstance, wechatWindowInstance, 
       snapchatWindowInstance, threadsWindowInstance].forEach(instance => {
        if (instance && instance.container && !instance.container.classList.contains('active')) {
          instance.container.remove();
          instance = null;
        }
      });
    }, CLEANUP_INTERVAL);
  };

  // Adicionar função para gerenciar sessão do usuário
  const setupUserSession = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        // Criar sessão específica para o usuário
        await window.electronAPI.createUserSession(user.email);
        
        // Limpar webviews existentes
        webviewCache.forEach((webview) => {
          if (!webview.isDestroyed()) {
            webview.remove();
          }
        });
        webviewCache.clear();

        // Recarregar webview atual com nova sessão
        const currentWebview = document.querySelector('.webview.active');
        if (currentWebview) {
          const webviewId = currentWebview.id;
          showWebview(webviewId, `button-${webviewId}`);
        }
      }
    } catch (error) {
      console.error('Erro ao configurar sessão do usuário:', error);
    }
  };

  // Adicionar função para limpar sessão do usuário
  const clearUserSession = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        await window.electronAPI.clearUserSession(user.id);
      }
    } catch (error) {
      console.error('Erro ao limpar sessão do usuário:', error);
    }
  };

  const setupProfileMenu = async () => {
    const profileButton = document.getElementById('profile-button');
    const profileMenu = document.getElementById('profile-menu');
    const profileSettings = document.getElementById('profile-settings');
    const profileLogout = document.getElementById('profile-logout');

    try {
      // Buscar informações do usuário da API
      const token = await window.electronAPI.invoke('get-token');
      const userUuid = await window.electronAPI.invoke('get-userUuid');
      
      if (token && userUuid) {
        const response = await fetch(`https://spaceapp-digital-api.onrender.com/users/${userUuid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Pegar apenas o primeiro nome
          const firstName = userData.name ? userData.name.split(' ')[0] : 'Usuário';
          
          // Atualizar informações no menu
          document.getElementById('profile-name').textContent = firstName;
          document.getElementById('profile-menu-name').textContent = userData.name || 'Usuário';
          document.getElementById('profile-menu-email').textContent = userData.email || 'usuario@email.com';
          
          // Atualizar avatares se houver
          if (userData.avatar) {
            document.getElementById('profile-avatar').src = userData.avatar;
            document.getElementById('profile-menu-avatar').src = userData.avatar;
          }

          // Salvar dados do usuário no localStorage
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }

    // Toggle do menu
    profileButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('show');
    });

    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
      if (!profileMenu?.contains(e.target) && !profileButton?.contains(e.target)) {
        profileMenu?.classList.remove('show');
      }
    });

    // Configurar ações dos botões
    profileSettings?.addEventListener('click', () => {
      showWebview('webview-settings', 'settings-button');
      profileMenu.classList.remove('show');
    });

    profileLogout?.addEventListener('click', async () => {
      profileMenu.classList.remove('show');
      const currentLanguage = await window.electronAPI.getLanguage();
      showConfirmationDialog(translations[currentLanguage]['logout_confirmation'], async () => {
        try {
          // Verificar se deve manter os dados
          const rememberLogin = localStorage.getItem('rememberLogin') === 'true';
          
          // Se não estiver marcado para lembrar, limpar os dados
          if (!rememberLogin) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('userUuid');
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
            localStorage.removeItem('rememberLogin');
          }
          
          await window.electronAPI.invoke('logout');
          
          // Abrir nova janela de login
          await window.electronAPI.invoke('create-login-window');
          
          // Fechar a janela atual
          window.electronAPI.invoke('close-current-window');
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
        }
      });
    });

    // Adicionar listener para mudanças no idioma
    window.electronAPI.onLanguageChanged((language) => {
      const elements = document.querySelectorAll('[data-translate]');
      elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[language] && translations[language][key]) {
          element.textContent = translations[language][key];
        }
      });
    });
  };

  // Adicionar listener para o evento create-webview-request
  window.electronAPI.on('create-webview-request', (data) => {
    const { webviewId, url, isLinkedIn } = data;
    const webview = createWebview(webviewId, url);
    if (webview) {
      webview.src = url;
    }
  });

  // Função para traduzir os elementos
  const translatePage = (language) => {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
      const key = element.getAttribute('data-translate');
      if (translations[language] && translations[language][key]) {
        element.textContent = translations[language][key];
      }
    });
  };

  // Adicionar listener para mudanças no idioma
  window.electronAPI.onLanguageChanged((language) => {
    document.documentElement.lang = language;
    translatePage(language);
  });

  // Modificar a função init
  const init = async () => {
    try {
      const currentLanguage = await window.electronAPI.getLanguage();
      document.documentElement.lang = currentLanguage;
      translatePage(currentLanguage);

      setupMemoryManagement(); // Adicionar gerenciamento de memória
      await setupUserSession();
      setupProfileMenu();
      setupButtonEvents();
      setupDarkMode();
      setupContextMenu();
      setupSidebarScroll();
      refreshApplications();
      showWebview('webview-home', 'home-button');
    } catch (error) {
      console.error('Erro na inicialização:', error);
    }
  };

  init();
});

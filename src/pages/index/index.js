document.addEventListener('DOMContentLoaded', async () => {
  // Constantes para otimização
  const MAX_CACHED_WEBVIEWS = 3; // Reduzido de 5 para 3
  const CLEANUP_INTERVAL = 180000; // Reduzido de 5 para 3 minutos
  const LAZY_LOAD_DELAY = 200; // Reduzido de 300ms para 200ms
  const TRANSITION_DURATION = 200; // Reduzido de 300ms para 200ms

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
  let discordWindowInstance = null;
  let googleChatWindowInstance = null;
  let wechatWindowInstance = null;
  let snapchatWindowInstance = null;
  let threadsWindowInstance = null;
  let facebookWindowInstance = null;

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
    'webview-facebook': 'https://www.messenger.com/',
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
    'facebook': 'www.messenger.com',
    'discord': 'discord.com',
    'google-chat': 'chat.google.com',
    'wechat': 'web.wechat.com',
    'snapchat': 'web.snapchat.com',
    'threads': 'www.threads.net',
  };
  const specialApps = Object.keys(specialAppsMap);

  // Funções para controlar o loading
  const showLoading = () => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.remove('hidden');
    }
  };

  const hideLoading = () => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  };

  // Funções para controlar estados dos botões durante carregamento
  const disableAllButtons = () => {
    const allButtons = document.querySelectorAll('.nav-button');
    allButtons.forEach(button => {
      if (button) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.pointerEvents = 'none';
      }
    });
  };

  const enableAllButtons = () => {
    const allButtons = document.querySelectorAll('.nav-button');
    allButtons.forEach(button => {
      if (button) {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.pointerEvents = 'auto';
      }
    });
  };

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
      top: 60px;
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
    headerElement.style.left = '64px';
    headerElement.style.right = '0';
    headerElement.style.zIndex = '1000';
    headerElement.style.height = '60px';
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
      console.log(webviewId)
      try {
      
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
          case 'facebook':
            windowInstance = facebookWindowInstance;
            break;
        }

        // Verificar se já existe uma instância ativa
        if (windowInstance && windowInstance.container) {
          
          // Garantir que o container esteja posicionado corretamente
          const header = document.getElementById('header');
          const sidebar = document.getElementById('sidebar');
          // Utilizar valores fixos para altura do cabeçalho e largura da sidebar
          const headerHeight = header ? header.offsetHeight : 60; // Altura base do cabeçalho
          const sidebarWidth = sidebar ? sidebar.offsetWidth : 64; // Largura base da sidebar
          const headerMargin = 4;
          const bottomMargin = 4;

          // Configurações específicas para Slack e LinkedIn
          if (appName.toLowerCase() === 'slack' || appName.toLowerCase() === 'linkedin') {
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
              opacity: 0; /* Iniciar com opacidade 0 */
              visibility: hidden; /* Iniciar oculto */
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
              opacity: 0; /* Iniciar com opacidade 0 */
              visibility: hidden; /* Iniciar oculto */
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
              hideLoading();
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
            container.remove();
          }
        });

        // Obter as dimensões reais do header e sidebar
        const header = document.getElementById('header');
        const sidebar = document.getElementById('sidebar');
        
        // Valores padrão caso os elementos não sejam encontrados
        const headerHeight = header ? header.offsetHeight : 60;
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 64;
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
              sandbox: true, // Padrão mais seguro
              webSecurity: true, // Padrão mais seguro
              backgroundThrottling: true, // Habilitar throttling por padrão para economia de recursos
            }
          }
        };

        // Configurações específicas para Slack e LinkedIn
        if (appName.toLowerCase() === 'slack' || appName.toLowerCase() === 'linkedin') {
          windowData.options.webPreferences.backgroundThrottling = false; // Manter false para apps que precisam estar sempre ativos
          windowData.options.webPreferences.webSecurity = true;
          windowData.options.webPreferences.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
          windowData.options.webPreferences.enableRemoteModule = true;
          windowData.options.webPreferences.nodeIntegrationInSubFrames = true;
          
          // Garantir que a URL seja a correta
          if (appName.toLowerCase() === 'slack' && !url.includes('app.slack.com')) {
            url = 'https://app.slack.com/client';
          }
          if (appName.toLowerCase() === 'linkedin' && !url.includes('linkedin.com')) {
            url = ' https://www.linkedin.com/login';
          }
          
          // Adicionar parâmetros para melhorar o carregamento
          if (!url.includes('?')) {
            url += '?web=true&app=true';
          }
          windowData.url = url;
        }

        const appWindow = await window.electronAPI.invoke(`create-${appName.toLowerCase()}-window`, windowData, {
          x: sidebarWidth,
          y: headerHeight + headerMargin,
          width: window.innerWidth - sidebarWidth,
          height: window.innerHeight - (headerHeight + headerMargin + bottomMargin)
        });
        
        if (appWindow) {
          
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
              opacity: 0; /* Iniciar com opacidade 0 */
              visibility: hidden; /* Iniciar oculto */
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
              opacity: 0; /* Iniciar com opacidade 0 */
              visibility: hidden; /* Iniciar oculto */
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
            webviewContainer.appendChild(container);
            
            container.style.opacity = '0';
            container.style.visibility = 'hidden';
            
            window.electronAPI.on(`${appName.toLowerCase()}-window-ready`, (data) => {
              if (data.windowId === appWindow.id) {
                // Exibir somente após o carregamento da janela
                container.style.display = 'flex'; 
                container.style.visibility = 'visible';
                setTimeout(() => {
                  container.style.opacity = '1';
                  hideLoading(); 
                }, 50); 
              }
            });
            

            // Adicionar listener para redimensionamento da janela
            const resizeHandler = () => {
              const newHeaderHeight = 60; // Altura base do cabeçalho
              const newSidebarWidth = 64; // Largura base da sidebar
              
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
              container.style.opacity = '0';
              setTimeout(async () => { // Make the callback async
                try {
                  await window.electronAPI.invoke(`close-${appName.toLowerCase()}-window`, appWindow.id);
                } catch (error) {
                  // Se o objeto já foi destruído, é esperado, apenas logar e prosseguir
                  if (error.message && error.message.includes('Object has been destroyed')) {
                    console.warn(`[remove] Janela do ${appName} já destruída no processo principal.`);
                  } else {
                    console.error(`Erro ao fechar janela do ${appName}:`, error);
                  }
                } finally {
                  // Sempre remover o container e nulificar a instância após tentar fechar
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
                    case 'facebook':
                      facebookWindowInstance = null;
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
                }
              }, TRANSITION_DURATION); // Usar TRANSITION_DURATION para remover após o fade-out
            },
            reload: () => {
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
            case 'facebook':
              facebookWindowInstance = windowInstance;
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
    
    // Remover webviews não utilizadas há mais de 5 minutos
    entries.forEach(([webviewId, lastAccess]) => {
      if (now - lastAccess > 300000) { // 5 minutos
        const webview = webviewCache.get(webviewId);
        if (webview && document.body.contains(webview)) {
          webview.remove();
        }
        webviewCache.delete(webviewId);
        webviewLastAccess.delete(webviewId);
      }
    });
  };

  // Função otimizada para criar webview
  const createWebview = (webviewId, url) => {
    try {
      // Verificar cache primeiro
      if (webviewCache.has(webviewId)) {
        const cachedWebview = webviewCache.get(webviewId);
        // Verificar se a webview ainda existe no DOM
        if (document.body.contains(cachedWebview)) {
          updateWebviewAccess(webviewId);
          return cachedWebview;
        }
        // Se não existir mais no DOM, remover do cache
        webviewCache.delete(webviewId);
        webviewLastAccess.delete(webviewId);
      }

      // Criar nova webview com configurações otimizadas
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
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease-in-out;
      `;

      // Configurações otimizadas
      webview.setAttribute('preload', '../../preload.js');
      webview.setAttribute('partition', 'persist:mainSession');
      webview.setAttribute('webpreferences', 'allowRunningInsecureContent=false, experimentalFeatures=false, webSecurity=true, plugins=false, webgl=true, nodeIntegrationInSubFrames=false, backgroundThrottling=true');

      // Carregar URL de forma otimizada
      if (url) {
        webview.src = url;
      }

      // Adicionar ao DOM
      const webviewContainer = document.querySelector('.webview-container');
      if (webviewContainer) {
        webviewContainer.appendChild(webview);
        webviewCache.set(webviewId, webview);
        updateWebviewAccess(webviewId);
        return webview;
      }
    } catch (error) {
      console.error('Erro ao criar webview:', error);
    }
    return null;
  };

  // Função otimizada para mostrar webview
  const showWebview = async (webviewId, buttonId) => {
    try {
      disableAllButtons(); // Desabilitar botões no início
      showLoading();
      
      const webviewContainer = document.querySelector('.webview-container');
      if (!webviewContainer) {
        console.error('Container da webview não encontrado');
        hideLoading();
        enableAllButtons(); // Reabilitar botões em caso de erro
        return;
      }

      // Obter as dimensões reais do header e sidebar
      const header = document.querySelector('.header');
      const sidebar = document.querySelector('.sidebar');
      
      // Valores padrão caso os elementos não sejam encontrados
      const headerHeight = header ? header.offsetHeight : 60;
      const sidebarWidth = sidebar ? sidebar.offsetWidth : 64;
      const headerMargin = 4;
      const bottomMargin = 4;

      // Calcular as dimensões do container com valores inteiros
      const containerBounds = {
        x: Math.floor(sidebarWidth),
        y: Math.floor(headerHeight + headerMargin),
        width: Math.floor(window.innerWidth - sidebarWidth),
        height: Math.floor(window.innerHeight - (headerHeight + headerMargin + bottomMargin))
      };

      if (containerBounds.width <= 0 || containerBounds.height <= 0) {
        console.error('Dimensões inválidas do container:', containerBounds);
        hideLoading();
        enableAllButtons(); // Reabilitar botões em caso de erro
        return;
      }
      
      // Esconder todas as webviews e janelas especiais
      const allWebviewsAndAppContainers = document.querySelectorAll('.webview, .linkedin-window-container, .teams-window-container, .slack-window-container, .skype-window-container, .twitter-window-container, .whatsapp-window-container, .instagram-window-container, .telegram-window-container, .facebook-window-container, .discord-window-container, .google-chat-window-container, .wechat-window-container, .snapchat-window-container, .threads-window-container');
      
      allWebviewsAndAppContainers.forEach(w => {
        if (w && w.style && w.id !== webviewId && !w.id.includes(webviewId.replace('webview-', ''))) {
          w.classList.remove('active');
          if (w.style) {
            w.style.opacity = '0';
            setTimeout(() => {
              if (w.style) {
                w.style.visibility = 'hidden';
                w.style.display = 'none';
              }
            }, TRANSITION_DURATION);
          }
        }
      });

      // Atualizar botões
      const allButtons = document.querySelectorAll('.nav-button');
      allButtons.forEach(b => {
        if (b) {
          b.classList.remove('active');
        }
      });

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
        hideLoading();
        enableAllButtons(); // Reabilitar botões em caso de erro
        return;
      }

      const isSpecialApp = specialApps.some(app => url && url.includes(specialAppsMap[app]));
      const appName = isSpecialApp ? specialApps.find(app => url && url.includes(specialAppsMap[app])) : null;
      
      if (isSpecialApp && appName) {
        // Obter a instância correta
        let windowInstance = null;
        switch(appName.toLowerCase()) {
          case 'teams': windowInstance = teamsWindowInstance; break;
          case 'slack': windowInstance = slackWindowInstance; break;
          case 'skype': windowInstance = skypeWindowInstance; break;
          case 'linkedin': windowInstance = linkedInWindowInstance; break;
          case 'twitter': windowInstance = twitterWindowInstance; break;
          case 'whatsapp': windowInstance = whatsappWindowInstance; break;
          case 'instagram': windowInstance = instagramWindowInstance; break;
          case 'telegram': windowInstance = telegramWindowInstance; break;
          case 'facebook': windowInstance = facebookWindowInstance; break;
          case 'discord': windowInstance = discordWindowInstance; break;
          case 'google-chat': windowInstance = googleChatWindowInstance; break;
          case 'wechat': windowInstance = wechatWindowInstance; break;
          case 'snapchat': windowInstance = snapchatWindowInstance; break;
          case 'threads': windowInstance = threadsWindowInstance; break;
        }
        
        // Se já existe uma janela, apenas reutilizá-la
        if (windowInstance && windowInstance.container) {
          try {
            if (windowInstance.container.style) {
              windowInstance.container.style.display = 'flex'; 
              windowInstance.container.style.visibility = 'visible';
              setTimeout(() => {
                if (windowInstance.container.style) {
                  windowInstance.container.style.opacity = '1';
                }
              }, 50); 
            }
            windowInstance.container.classList.add('active');
            currentWebview = windowInstance;
            
            // Forçar a exibição da janela com bounds validados
            if (windowInstance.id) {
              try {
                await window.electronAPI.invoke(`show-${appName.toLowerCase()}-window`, windowInstance.id, containerBounds);
                
                // Aguardar evento de janela pronta antes de exibir o container e esconder o loading
                window.electronAPI.on(`${appName.toLowerCase()}-window-ready`, (data) => {
                  if (data.windowId === windowInstance.id && windowInstance.container && windowInstance.container.style) {
                    windowInstance.container.style.display = 'flex'; 
                    windowInstance.container.style.visibility = 'visible';
                    setTimeout(() => {
                      if (windowInstance.container.style) {
                        windowInstance.container.style.opacity = '1';
                      }
                      hideLoading();
                    }, 50); 
                  }
                });
              } catch (error) {
                console.error(`Erro ao exibir janela do ${appName}:`, error);
                hideLoading();
                // Tentar recriar a janela em caso de erro
                const newInstance = await createAppWindow(webviewId, url, appName);
                if (newInstance && newInstance.container && newInstance.container.style) {
                  newInstance.container.style.display = 'flex'; 
                  newInstance.container.style.visibility = 'visible';
                  setTimeout(() => {
                    if (newInstance.container.style) {
                      newInstance.container.style.opacity = '1';
                    }
                  }, 50);
                  newInstance.container.classList.add('active');
                  currentWebview = newInstance;
                  
                  // Esconder loading após um delay para novas janelas especiais
                  setTimeout(() => {
                    hideLoading();
                  }, 1500);
                } else {
                  console.error(`Não foi possível criar nova janela para ${appName}`);
                  hideLoading();
                }
              }
            }
          } catch (err) {
            console.error(`Erro ao manipular container do ${appName}:`, err);
            hideLoading();
            // Tentar recriar a janela
            try {
              const newInstance = await createAppWindow(webviewId, url, appName);
              if (newInstance && newInstance.container && newInstance.container.style) {
                newInstance.container.style.display = 'flex'; 
                newInstance.container.style.visibility = 'visible';
                setTimeout(() => {
                  if (newInstance.container.style) {
                    newInstance.container.style.opacity = '1';
                  }
                }, 50);
                newInstance.container.classList.add('active');
                currentWebview = newInstance;
              } else {
                console.error(`Não foi possível criar nova janela para ${appName}`);
              }
            } catch (createErr) {
              console.error(`Erro ao tentar recriar janela do ${appName}:`, createErr);
            }
          }
        } else {
          try {
            // Remover containers existentes
            document.querySelectorAll(`.${appName.toLowerCase()}-window-container`).forEach(container => {
              if (container) {
                container.remove();
              }
            });
            
            const newInstance = await createAppWindow(webviewId, url, appName);
            if (newInstance && newInstance.container && newInstance.container.style) {
              newInstance.container.style.display = 'flex'; 
              newInstance.container.style.visibility = 'visible';
              setTimeout(() => {
                if (newInstance.container.style) {
                  newInstance.container.style.opacity = '1';
                }
              }, 50);
              newInstance.container.classList.add('active');
              currentWebview = newInstance;
              
              // Esconder loading após um delay para novas janelas especiais
              setTimeout(() => {
                hideLoading();
              }, 1500);
            } else {
              console.error(`Não foi possível criar nova janela para ${appName}`);
              hideLoading();
            }
          } catch (err) {
            console.error(`Erro ao criar janela do ${appName}:`, err);
            hideLoading();
          }
        }
      } else {
        // Para outras webviews, esconder todas as janelas especiais
        const specialInstances = [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance, twitterWindowInstance, whatsappWindowInstance, instagramWindowInstance, telegramWindowInstance, facebookWindowInstance, discordWindowInstance, googleChatWindowInstance, wechatWindowInstance, snapchatWindowInstance, threadsWindowInstance];
        
        specialInstances.forEach(instance => {
          if (instance && instance.container && instance.container.style) {
            try {
              instance.container.style.opacity = '0';
              instance.container.classList.remove('active');
              setTimeout(() => {
                if (instance.container && instance.container.style) {
                  instance.container.style.visibility = 'hidden';
                  instance.container.style.display = 'none';
                }
              }, TRANSITION_DURATION);
              
              // Verificar se instance.id existe e é uma string antes de fazer o split
              const appName = (instance.id && typeof instance.id === 'string') ? instance.id.split('-')[0] : (instance.container && instance.container.className ? instance.container.className.split('-')[0] : null);
              
              if (appName) {
                // Lista de aplicações que têm handlers IPC registrados
                const appsWithHandlers = ['slack', 'linkedin', 'teams', 'skype', 'twitter', 'whatsapp', 'instagram', 'telegram', 'facebook', 'discord', 'wechat', 'snapchat', 'threads', 'google-chat'];
                
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
          
          if (webview && webview.style) {
            updateWebviewAccess(webviewId);
            webview.style.display = 'flex'; 
            webview.style.visibility = 'visible';
            setTimeout(() => {
              if (webview.style) {
                webview.style.opacity = '1';
              }
            }, 50); 
            webview.classList.add('active');
            currentWebview = webview;
            
            // Garantir que a webview seja visível imediatamente
            webview.style.zIndex = '1000';
            
            // Adicionar listeners para detectar quando a webview termina de carregar
            const hideLoadingWhenReady = () => {
              // Garantir que a webview esteja visível antes de esconder o loading
              if (webview && webview.style) {
                webview.style.display = 'flex'; 
                webview.style.visibility = 'visible';
                setTimeout(() => {
                  if (webview.style) {
                    webview.style.opacity = '1';
                  }
                  hideLoading();
                }, 100); 
              }
              
              // Remover os listeners após usar
              if (webview) {
                webview.removeEventListener('did-finish-load', hideLoadingWhenReady);
                webview.removeEventListener('dom-ready', hideLoadingWhenReady);
              }
            };
            
            // Para webviews locais (home, settings), esconder loading imediatamente
            if (webviewId === 'webview-home' || webviewId === 'webview-settings') {
              // Garantir que a webview esteja visível
              if (webview.style) {
                webview.style.display = 'flex'; 
                webview.style.visibility = 'visible';
                setTimeout(() => {
                  if (webview.style) {
                    webview.style.opacity = '1';
                  }
                  hideLoading();
                }, 100);
              }
            } else {
              // Para webviews externas, adicionar listeners para quando terminar de carregar
              webview.addEventListener('did-finish-load', hideLoadingWhenReady);
              webview.addEventListener('dom-ready', hideLoadingWhenReady);
              
              // Fallback: esconder loading após um tempo máximo
              setTimeout(() => {
                // Garantir que a webview esteja visível
                if (webview && webview.style) {
                  webview.style.display = 'flex'; 
                  webview.style.visibility = 'visible';
                  setTimeout(() => {
                    if (webview.style) {
                      webview.style.opacity = '1';
                    }
                  }, 50);
                }
                
                hideLoading();
                if (webview) {
                  webview.removeEventListener('did-finish-load', hideLoadingWhenReady);
                  webview.removeEventListener('dom-ready', hideLoadingWhenReady);
                }
              }, 3000);
            }
          } else {
            console.error(`Não foi possível criar ou obter webview para ${webviewId}`);
            hideLoading();
          }
        } catch (err) {
          console.error(`Erro ao manipular webview normal:`, err);
          hideLoading();
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

      hideLoading();
      enableAllButtons(); // Reabilitar botões após carregar
    } catch (error) {
      console.error('Erro ao mostrar webview:', error);
      hideLoading();
      enableAllButtons(); // Garantir que os botões sejam reabilitados em caso de erro
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
        'Fechar': 'Fechar',
        'close_all_confirmation': 'Tem certeza de que deseja fechar todas as janelas?'
      },
      'en-US': {
        'Atualizar Todos': 'Refresh All',
        'Fechar Todos': 'Close All',
        'Atualizar': 'Refresh',
        'Fechar': 'Close',
        'close_all_confirmation': 'Are you sure you want to close all windows?'
      }
    };

    const t = translations[currentLanguage] || translations['en-US'];

    // Verificar se é uma janela do Google
    if (currentViewId === 'webview-google') {
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

    if (currentViewId === 'webview-home') {
      return [
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
      return;
    }

    // Verificar se é a home
    if (currentViewId === 'webview-home') {
      const menuTemplate = await getMenuTemplate(currentViewId);
      window.electronAPI.invoke('show-context-menu-window', menuTemplate, x, y, currentViewId);
      return;
    }

    // Verificar se é um aplicativo especial
    const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat', 'facebook', 'telegram', 'discord', 'wechat', 'snapchat', 'threads'];
    const isSpecialApp = specialApps.some(app => {
      // Tratamento especial para o Google Chat e Facebook Messenger
      if (app === 'google-chat' && currentViewId === 'webview-google') {
        return true;
      }
      if (app === 'facebook' && currentViewId === 'webview-facebook') {
        return true;
      }
      return currentViewId.includes(app);
    });
    
    if (isSpecialApp) {
      const appName = specialApps.find(app => {
        if (app === 'google-chat' && currentViewId === 'webview-google') {
          return true;
        }
        if (app === 'facebook' && currentViewId === 'webview-facebook') {
          return true;
        }
        return currentViewId.includes(app);
      });
      let windowInstance = null;
      
      // Obter a instância correta do aplicativo
      switch(appName) {
        case 'google-chat':
          windowInstance = googleChatWindowInstance;
          break;
        case 'facebook':
          windowInstance = facebookWindowInstance;
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
        case 'telegram':
          windowInstance = telegramWindowInstance;
          break;
        case 'discord':
          windowInstance = discordWindowInstance;
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

      // Verificar se o botão está ativo
      const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
      const isButtonActive = button && (button.classList.contains('active') || button.classList.contains('opened'));

      // Verificar se a janela está ativa
      const isWindowActive = windowInstance && 
                           windowInstance.container && 
                           (windowInstance.container.classList.contains('active') || 
                            windowInstance.container.style.display === 'flex');

      if (isButtonActive || isWindowActive) {
        // Obter o template do menu
        const menuTemplate = await getMenuTemplate(currentViewId);
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
            showContextMenu(e.clientX, e.clientY, webviewId);
          }
          return;
        }

        // Verificar se é um botão de aplicativo especial
        const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat', 'facebook', 'telegram', 'discord', 'wechat', 'snapchat', 'threads'];
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
            case 'facebook':
              windowInstance = facebookWindowInstance;
              break;
            case 'telegram':
              windowInstance = telegramWindowInstance;
              break;
            case 'discord':
              windowInstance = discordWindowInstance;
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
          
          // Verificar se o botão está ativo ou se a janela está ativa
          const isButtonActive = target.classList.contains('active') || 
                                target.classList.contains('opened') ||
                                target.getAttribute('data-id') === webviewId;

          const isWindowActive = windowInstance && 
                               windowInstance.container && 
                               (windowInstance.container.classList.contains('active') || 
                                windowInstance.container.style.display === 'flex');
          // Mostrar o menu se o botão estiver ativo ou se a janela estiver ativa
          if (isButtonActive || isWindowActive) {
            showContextMenu(e.clientX, e.clientY, webviewId);
          } 
        } else {
          // Para webviews normais
          const isButtonActive = target.classList.contains('active') || 
                                target.classList.contains('opened') ||
                                target.getAttribute('data-id') === webviewId;
          
          if (isButtonActive) {
            showContextMenu(e.clientX, e.clientY, webviewId);
          }
        }
      });
    }

    // Adicionar evento de contexto para containers de aplicativos especiais
    document.addEventListener('contextmenu', (e) => {
      const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat', 'facebook', 'telegram', 'discord', 'wechat', 'snapchat', 'threads'];
      const container = specialApps.map(app => e.target.closest(`.${app}-window-container`)).find(c => c);
      
      if (container) {
        const appName = specialApps.find(app => container.className.includes(app));
        const webviewId = container.id.replace('-container', '');
        
        // Verificar se o container está ativo
        const isActive = container.classList.contains('active') || 
                        container.style.display === 'flex';
        
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
            case 'facebook':
              windowInstance = facebookWindowInstance;
              break;
            case 'telegram':
              windowInstance = telegramWindowInstance;
              break;
            case 'discord':
              windowInstance = discordWindowInstance;
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
          
          if (webviewId && windowInstance && windowInstance.container === container) {
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
    
    menu.on('click', async (menuItem) => {
      const command = menuItem.command;
      
      switch (command) {
        case 'reload-current':
          if (currentViewId === 'webview-home') {
            const webview = document.getElementById(currentViewId);
            if (webview) {
              webview.src = '../../pages/home/home.html';
              updateActiveViewTitle(webview);
              refreshApplications();
            }
          } else {
            const webview = document.getElementById(currentViewId);
            if (webview) {
              webview.reload();
            }
          }
          break;
          
        case 'close-current':
          const webview = document.getElementById(currentViewId);
          if (webview) {
            webview.remove();
            const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
            if (button) {
              button.classList.remove('active', 'opened');
            }
            document.querySelector('.content-area').style.display = 'none';
            updateActiveViewTitle(null);
          }
          break;
          
        case 'close-all':
          // Mostrar diálogo de confirmação antes de fechar todas as janelas
          const currentLanguage = await window.electronAPI.getLanguage();
          showConfirmationDialog(translations[currentLanguage]['close_all_confirmation'], async () => {
            // Fechar todas as janelas especiais
            for (const instance of allSpecialInstances) {
              if (instance && instance.container) {
                const appName = instance.container.className.split('-')[0];
                await closeSpecialWindow(instance, appName, `webview-${appName}`);
              }
            }

            // Fechar todos os webviews normais
            const allWebviews = document.querySelectorAll('webview');
            allWebviews.forEach(webview => {
              webview.remove();
            });

            // Resetar todos os botões
            const allButtons = document.querySelectorAll('.nav-button');
            allButtons.forEach(button => {
              button.classList.remove('active', 'opened');
            });

            // Limpar a área de conteúdo
            document.querySelector('.content-area').style.display = 'none';
            updateActiveViewTitle(null);
          });
          break;
      }
    });
  };

  // Listener para os comandos do menu de contexto vindos do processo principal
  window.electronAPI.on('execute-context-menu-command', async (command, currentViewId) => {
    const allSpecialInstances = [
      linkedInWindowInstance,
      teamsWindowInstance,
      slackWindowInstance,
      skypeWindowInstance,
      twitterWindowInstance,
      whatsappWindowInstance,
      instagramWindowInstance,
      telegramWindowInstance,
      facebookWindowInstance,
      discordWindowInstance,
      googleChatWindowInstance,
      wechatWindowInstance,
      snapchatWindowInstance,
      threadsWindowInstance
    ];

    // Verificar se é um aplicativo especial
    const specialApps = ['linkedin', 'teams', 'slack', 'skype', 'twitter', 'whatsapp', 'instagram', 'google-chat', 'facebook', 'telegram', 'discord', 'wechat', 'snapchat', 'threads'];
    const isSpecialApp = specialApps.some(app => {
      if (app === 'google-chat' && currentViewId === 'webview-google') return true;
      if (app === 'facebook' && currentViewId === 'webview-facebook') return true;
      if (app === 'linkedin' && currentViewId === 'webview-linkedin') return true;
      return currentViewId.includes(app);
    });
    
    const appName = isSpecialApp ? 
      (currentViewId === 'webview-google' ? 'google-chat' : 
       currentViewId === 'webview-facebook' ? 'facebook' :
       currentViewId === 'webview-linkedin' ? 'linkedin' :
       specialApps.find(app => currentViewId.includes(app))) : null;

    const getWindowInstance = (appName) => {
      let instance = null;
      switch(appName) {
        case 'google-chat': instance = googleChatWindowInstance; break;
        case 'facebook': instance = facebookWindowInstance; break;
        case 'teams': instance = teamsWindowInstance; break;
        case 'slack': instance = slackWindowInstance; break;
        case 'skype': instance = skypeWindowInstance; break;
        case 'linkedin': instance = linkedInWindowInstance; break;
        case 'twitter': instance = twitterWindowInstance; break;
        case 'whatsapp': instance = whatsappWindowInstance; break;
        case 'instagram': instance = instagramWindowInstance; break;
        case 'telegram': instance = telegramWindowInstance; break;
        case 'discord': instance = discordWindowInstance; break;
        case 'wechat': instance = wechatWindowInstance; break;
        case 'snapchat': instance = snapchatWindowInstance; break;
        case 'threads': instance = threadsWindowInstance; break;
      }

      // Verificar se a instância ainda é válida
      if (instance && instance.container && document.body.contains(instance.container)) {
        return instance;
      }

      // Se a instância não for válida, tentar recriar
      if (appName && currentViewId) {
        const url = serviceMap[currentViewId];
        if (url) {
          try {
            return createAppWindow(currentViewId, url, appName);
          } catch (error) {
            console.error(`[getWindowInstance] Erro ao recriar janela do ${appName}:`, error);
          }
        }
      }
      return null;
    };

    const clearWindowInstance = (appName) => {
      switch(appName) {
        case 'linkedin': linkedInWindowInstance = null; break;
        case 'teams': teamsWindowInstance = null; break;
        case 'slack': slackWindowInstance = null; break;
        case 'skype': skypeWindowInstance = null; break;
        case 'twitter': twitterWindowInstance = null; break;
        case 'whatsapp': whatsappWindowInstance = null; break;
        case 'instagram': instagramWindowInstance = null; break;
        case 'telegram': telegramWindowInstance = null; break;
        case 'facebook': facebookWindowInstance = null; break;
        case 'discord': discordWindowInstance = null; break;
        case 'google-chat': googleChatWindowInstance = null; break;
        case 'wechat': wechatWindowInstance = null; break;
        case 'snapchat': snapchatWindowInstance = null; break;
        case 'threads': threadsWindowInstance = null; break;
      }
    };

    const closeSpecialWindow = async (windowInstance, appName, currentViewId) => {
      if (windowInstance && windowInstance.container) {
        console.log(`[closeSpecialWindow] Fechando janela do ${appName}`, windowInstance);
        windowInstance.container.style.opacity = '0';
        windowInstance.container.classList.remove('active');

        setTimeout(async () => {
          try {
            if (windowInstance.id) {
              console.log(`[closeSpecialWindow] Enviando comando para fechar janela do ${appName}`, windowInstance.id);
              await window.electronAPI.invoke(`close-${appName}-window`, windowInstance.id);
            } else {
              console.error(`[closeSpecialWindow] ID da janela do ${appName} não encontrado`);
            }
          } catch (error) {
            console.error(`[closeSpecialWindow] Erro ao fechar janela do ${appName}:`, error);
          } finally {
            if (windowInstance.container) {
              windowInstance.container.style.visibility = 'hidden';
              windowInstance.container.style.display = 'none';
              windowInstance.container.remove();
            }
            clearWindowInstance(appName);
            
            const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
            if (button) {
              button.classList.remove('active', 'opened');
            }
          }
        }, 300);
      } else {
        console.error(`[closeSpecialWindow] Instância ou container não encontrado para ${appName}`);
        // Tentar recriar a janela se necessário
        if (appName && currentViewId) {
          const url = serviceMap[currentViewId];
          if (url) {
            try {
              const newInstance = await createAppWindow(currentViewId, url, appName);
              if (newInstance) {
                await closeSpecialWindow(newInstance, appName, currentViewId);
              }
            } catch (error) {
              console.error(`[closeSpecialWindow] Erro ao recriar janela do ${appName}:`, error);
            }
          }
        }
      }
    };

    switch (command) {
      case 'close-current':
        if (isSpecialApp) {
          console.log(`[execute-context-menu-command] Fechando janela especial: ${appName}`);
          const windowInstance = getWindowInstance(appName);
          if (windowInstance) {
            await closeSpecialWindow(windowInstance, appName, currentViewId);
          } else {
            console.error(`[execute-context-menu-command] Instância não encontrada para ${appName}`);
            // Tentar recriar a janela se necessário
            const url = serviceMap[currentViewId];
            if (url) {
              try {
                const newInstance = await createAppWindow(currentViewId, url, appName);
                if (newInstance) {
                  await closeSpecialWindow(newInstance, appName, currentViewId);
                }
              } catch (error) {
                console.error(`[execute-context-menu-command] Erro ao recriar janela do ${appName}:`, error);
              }
            }
          }
        } else {
          const webview = document.getElementById(currentViewId);
          if (webview) {
            webview.remove();
            const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
            if (button) {
              button.classList.remove('active', 'opened');
            }
            document.querySelector('.content-area').style.display = 'none';
            updateActiveViewTitle(null);
          }
        }
        break;

      case 'reload-current':
        if (isSpecialApp) {
          const windowInstance = getWindowInstance(appName);
          if (windowInstance && windowInstance.id) {
            try {
              await window.electronAPI.invoke(`reload-${appName}-window`, windowInstance.id);
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao recarregar janela do ${appName}:`, error);
            }
          }
        } else {
          const webview = document.getElementById(currentViewId);
          if (webview) {
            try {
              if (currentViewId === 'webview-home') {
                webview.src = '../../pages/home/home.html';
                updateActiveViewTitle(webview);
                refreshApplications();
              } else if (currentViewId === 'webview-settings') {
                webview.src = '../../pages/settings/settings.html';
              } else {
                webview.reload();
              }
            } catch (error) {
              console.error(`[execute-context-menu-command] Erro ao recarregar webview ${currentViewId}:`, error);
            }
          }
        }
        break;

      case 'close-all':
        // Mostrar diálogo de confirmação antes de fechar todas as janelas
        const currentLanguage = await window.electronAPI.getLanguage();
        showConfirmationDialog(translations[currentLanguage]['close_all_confirmation'], async () => {
          // Fechar todas as janelas especiais
          for (const instance of allSpecialInstances) {
            if (instance && instance.container) {
              const appName = instance.container.className.split('-')[0];
              await closeSpecialWindow(instance, appName, `webview-${appName}`);
            }
          }

          // Fechar todos os webviews normais
          const allWebviews = document.querySelectorAll('webview');
          allWebviews.forEach(webview => {
            webview.remove();
          });

          // Resetar todos os botões
          const allButtons = document.querySelectorAll('.nav-button');
          allButtons.forEach(button => {
            button.classList.remove('active', 'opened');
          });

          // Limpar a área de conteúdo
          document.querySelector('.content-area').style.display = 'none';
          updateActiveViewTitle(null);
        });
        break;
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

  // Sistema de limpeza de memória otimizado
  const setupMemoryManagement = () => {
    // Limpar cache periodicamente
    setInterval(cleanupWebviewCache, CLEANUP_INTERVAL);

    // Limpeza geral de memória
    setInterval(() => {
      // Limpar listeners não utilizados
      document.querySelectorAll('webview').forEach(webview => {
        if (!webview.classList.contains('active')) {
          webview.removeAllListeners();
          // Forçar coleta de lixo para webviews inativas
          if (webview.src) {
            webview.src = 'about:blank';
          }
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
       instagramWindowInstance, telegramWindowInstance, facebookWindowInstance, 
       discordWindowInstance, googleChatWindowInstance, wechatWindowInstance, 
       snapchatWindowInstance, threadsWindowInstance].forEach(instance => {
        if (instance && instance.container && !instance.container.classList.contains('active')) {
          instance.container.remove();
          instance = null;
        }
      });

      // Forçar coleta de lixo
      if (window.gc) {
        window.gc();
      }
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

  const setupProfileMenu = async () => {
    const profileButton = document.getElementById('profile-button');
    const profileMenu = document.getElementById('profile-menu');
    const profileSettings = document.getElementById('profile-settings');
    const profileLogout = document.getElementById('profile-logout');
    const profileName = document.getElementById('profile-name');
    const profileMenuName = document.getElementById('profile-menu-name');
    const profileMenuEmail = document.getElementById('profile-menu-email');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileMenuAvatar = document.getElementById('profile-menu-avatar');

    // Verificar se os elementos necessários existem
    if (!profileButton || !profileMenu || !profileSettings || !profileLogout) {
      console.warn('Elementos do menu de perfil não encontrados');
      return;
    }

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
          
          // Atualizar informações no menu apenas se os elementos existirem
          if (profileName) profileName.textContent = firstName;
          if (profileMenuName) profileMenuName.textContent = userData.name || 'Usuário';
          if (profileMenuEmail) profileMenuEmail.textContent = userData.email || 'usuario@email.com';
          
          // Atualizar avatares se houver e se os elementos existirem
          if (userData.avatar) {
            if (profileAvatar) profileAvatar.src = userData.avatar;
            if (profileMenuAvatar) profileMenuAvatar.src = userData.avatar;
          }

          // Salvar dados do usuário no localStorage
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }

    // Toggle do menu
    profileButton.addEventListener('click', (e) => {
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
    profileSettings.addEventListener('click', () => {
      showWebview('webview-settings', 'settings-button');
      profileMenu.classList.remove('show');
    });

    profileLogout.addEventListener('click', async () => {
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
      // Mostrar loading imediatamente
      showLoading();
      
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
      
      setTimeout(() => {
        showWebview('webview-home', 'home-button');
      }, 100);
    } catch (error) {
      console.error('Erro na inicialização:', error);
      hideLoading();
    }
  };

  init();

  // Adicionar listener para fechar janela do Google
  window.electronAPI.on('close-google-window', async (targetId) => {
    try {
      const webview = document.querySelector(`webview[id="${targetId}"]`);
      if (webview) {
        // Remover o webview do DOM
        webview.remove();
        
        // Atualizar o estado do botão
        const button = document.querySelector(`.nav-button[data-id="${targetId}"]`);
        if (button) {
          button.classList.remove('active', 'opened');
        }
        
        // Limpar qualquer estado relacionado
        if (googleChatWindowInstance) {
          googleChatWindowInstance.cleanup();
        }
      }
    } catch (error) {
      console.error('Erro ao fechar janela do Google:', error);
    }
  });

  // ... existing code ...
  window.electronAPI.on('close-all-webviews', async () => {
    try {
      // Fechar todas as webviews, incluindo as do Google
      const webviews = document.querySelectorAll('webview');
      for (const webview of webviews) {
        const webviewId = webview.getAttribute('id');
        if (webviewId) {
          // Remover o webview do DOM
          webview.remove();
          
          // Atualizar o estado do botão
          const button = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
          if (button) {
            button.classList.remove('active', 'opened');
          }
        }
      }

      // Fechar todas as browser views
      const browserViews = document.querySelectorAll('.browser-view-container');
      for (const view of browserViews) {
        view.remove();
      }

      // Limpar estados de aplicativos especiais
      if (linkedInWindowInstance) {
        linkedInWindowInstance.cleanup();
      }
      if (googleChatWindowInstance) {
        googleChatWindowInstance.cleanup();
      }

      // Limpar qualquer outro estado relacionado
      activeViewId = null;
      document.querySelector('.content-area').innerHTML = '';
      
      // Atualizar a interface
      updateActiveViewTitle(null);
      document.querySelector('.content-area').style.display = 'none';

      // Forçar limpeza de qualquer webview do Google que possa ter ficado
      const googleWebviews = document.querySelectorAll('webview[id*="google"]');
      for (const webview of googleWebviews) {
        webview.remove();
      }
    } catch (error) {
      console.error('Erro ao fechar todas as janelas:', error);
    }
  });
  // ... existing code ...
});

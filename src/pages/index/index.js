document.addEventListener('DOMContentLoaded', async () => {
  let currentZoom = 1.0;
  let currentWebview = null;
  let webviewCache = new Map();
  let linkedInWindowInstance = null;
  let teamsWindowInstance = null;
  let slackWindowInstance = null;
  let skypeWindowInstance = null;

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
      console.log(`Iniciando criação da janela do ${appName}...`);
      
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
      }

      // Verificar se já existe uma instância ativa
      if (windowInstance && windowInstance.container) {
        console.log(`Janela do ${appName} já existe, reutilizando...`);
        const container = windowInstance.container;
        
        // Garantir que o container esteja posicionado corretamente
        const header = document.getElementById('header');
        const sidebar = document.getElementById('sidebar');
        const headerHeight = header ? header.offsetHeight : 60;
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 80;
        const headerMargin = 4;
        const bottomMargin = 4;

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

        // Configurações específicas para cada aplicativo
        switch(appName.toLowerCase()) {
          case 'teams':
            // Configurações específicas para Teams
            container.style.backgroundColor = '#ffffff';
            break;
          case 'slack':
            // Configurações específicas para Slack
            container.style.backgroundColor = '#ffffff';
            break;
          case 'skype':
            // Configurações específicas para Skype
            container.style.backgroundColor = '#ffffff';
            break;
        }

        container.style.display = 'flex';
        container.style.opacity = '1';
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

      // Criar uma janela filha que se integra com a área de conteúdo
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
            backgroundThrottling: false // Desabilitar throttling para melhor performance
          }
        }
      };

      // Configurações específicas para cada aplicativo
      switch(appName.toLowerCase()) {
        case 'teams':
          windowData.options.webPreferences.backgroundThrottling = false;
          windowData.options.webPreferences.webSecurity = true;
          break;
        case 'slack':
          windowData.options.webPreferences.backgroundThrottling = false;
          windowData.options.webPreferences.webSecurity = true;
          break;
        case 'skype':
          windowData.options.webPreferences.backgroundThrottling = false;
          windowData.options.webPreferences.webSecurity = true;
          break;
      }

      console.log(`Solicitando criação da janela do ${appName}...`);
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
              window.electronAPI.invoke(`update-${appName.toLowerCase()}-window-bounds`, windowInstance.id, newBounds);
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
              window.electronAPI.invoke(`close-${appName.toLowerCase()}-window`, appWindow.id);
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
              }
            }, 200);
          },
          reload: () => {
            console.log(`Recarregando janela do ${appName} (instância):`, appWindow.id);
            window.electronAPI.invoke(`reload-${appName.toLowerCase()}-window`, appWindow.id);
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

  const createWebview = (webviewId, url) => {
    try {
      // Verificar se é uma janela especial
      const specialApps = ['linkedin', 'teams', 'slack', 'skype'];
      const isSpecialApp = specialApps.some(app => url && url.includes(`${app}.com`));
      
      if (isSpecialApp) {
        const appName = specialApps.find(app => url.includes(`${app}.com`));
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

        // Configurações específicas para Teams
        if (appName === 'teams') {
          console.log('Configurando janela do Teams...');
          // Garantir que a URL do Teams seja a correta
          if (!url.includes('teams.microsoft.com')) {
            url = 'https://teams.microsoft.com';
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
      [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance].forEach(instance => {
        if (instance && instance.container) {
          console.log('Escondendo janela especial...');
          instance.container.style.display = 'none';
          instance.container.style.opacity = '0';
          instance.container.classList.remove('active');
          
          // Verificar se instance.id existe e é uma string antes de fazer o split
          const appName = instance.id && typeof instance.id === 'string' ? 
            instance.id.split('-')[0] : 
            instance.container.className.split('-')[0];
          
          if (appName) {
            window.electronAPI.invoke(`hide-${appName}-window`, instance.id).catch(error => {
              console.error(`Erro ao ocultar janela do ${appName}:`, error);
            });
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

      // Criar a webview
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

      // Configurações específicas para Teams
      if (webviewId === 'webview-teams') {
        console.log('Configurando webview do Teams...');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no, webSecurity=yes, allowRunningInsecureContent=no, backgroundThrottling=no');
        
        // Eventos específicos para Teams
        webview.addEventListener('dom-ready', () => {
          console.log('Teams webview DOM ready');
          webview.setZoomFactor(currentZoom);
        });

        webview.addEventListener('did-start-loading', () => {
          console.log('Teams webview started loading');
        });

        webview.addEventListener('did-finish-load', () => {
          console.log('Teams webview finished loading');
        });

        webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {
          console.error('Teams webview failed to load:', errorCode, errorDescription);
          if (errorCode === -3 || errorCode === -102) {
            console.log('Tentando recarregar Teams após erro...');
            setTimeout(() => webview.reload(), 2000);
          }
        });

        // Monitorar erros de console do Teams
        webview.addEventListener('console-message', (event) => {
          console.log('Teams console:', event.message);
        });

        // Adicionar tratamento de erro específico para Teams
        webview.addEventListener('crashed', () => {
          console.error('Teams webview crashed');
          setTimeout(() => {
            console.log('Tentando recriar webview do Teams...');
            createWebview(webviewId, url);
          }, 2000);
        });
      }

      webview.src = url || '../../pages/home/home.html';

      // Configurações comuns para todas as webviews
      webview.setAttribute('preload', '../../preload.js');
      webview.setAttribute('partition', 'persist:mainSession');
      webview.setAttribute('webpreferences', 'allowRunningInsecureContent=yes, experimentalFeatures=yes, webSecurity=no, plugins=yes, webgl=yes, nodeIntegrationInSubFrames=yes, backgroundThrottling=no');

      // Adicionar a webview ao container
      const webviewContainer = document.querySelector('.webview-container');
      if (webviewContainer) {
        webviewContainer.appendChild(webview);
        return webview;
      } else {
        console.error('Container da webview não encontrado');
        return null;
      }
    } catch (error) {
      console.error('Erro ao criar webview:', error);
      // Tentar recriar a webview em caso de erro
      if (webviewId === 'webview-teams') {
        console.log('Tentando recriar webview do Teams após erro...');
        setTimeout(() => {
          createWebview(webviewId, url);
        }, 2000);
      }
      return null;
    }
  };

  const showWebview = async (webviewId, buttonId) => {
    try {
      console.log('Mostrando webview:', webviewId, buttonId);
      
      // Obter as dimensões reais do header e sidebar
      const header = document.getElementById('header');
      const sidebar = document.getElementById('sidebar');
      const headerHeight = header ? header.offsetHeight : 60;
      const sidebarWidth = sidebar ? sidebar.offsetWidth : 80;
      const headerMargin = 4;
      const bottomMargin = 4;
      
      // Obter as dimensões do webview-container
      const webviewContainer = document.querySelector('.webview-container');
      let containerBounds = null;
      if (webviewContainer) {
        containerBounds = webviewContainer.getBoundingClientRect().toJSON();
        containerBounds = {
          ...containerBounds,
          top: headerHeight + headerMargin,
          left: sidebarWidth,
          width: window.innerWidth - sidebarWidth,
          height: window.innerHeight - (headerHeight + headerMargin + bottomMargin)
        };
      }
      
      // Primeiro, esconder todas as webviews e janelas especiais
      document.querySelectorAll('.webview, .linkedin-window-container, .teams-window-container, .slack-window-container, .skype-window-container').forEach(w => {
        w.classList.remove('active');
        w.style.display = 'none';
        w.style.opacity = '0';
      });
      document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));

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
      const specialApps = ['linkedin', 'teams', 'slack', 'skype'];
      const isSpecialApp = specialApps.some(app => url && url.includes(`${app}.com`));
      
      if (isSpecialApp) {
        const appName = specialApps.find(app => url.includes(`${app}.com`));
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
        }
        
        // Se já existe uma janela, apenas reutilizá-la
        if (windowInstance && windowInstance.container) {
          console.log(`Reutilizando janela do ${appName} existente...`);
          const container = windowInstance.container;
          
          // Remover qualquer container duplicado
          document.querySelectorAll(`.${appName.toLowerCase()}-window-container`).forEach(existingContainer => {
            if (existingContainer !== container) {
              existingContainer.remove();
            }
          });
          
          container.style.display = 'flex';
          container.style.opacity = '1';
          container.classList.add('active');
          currentWebview = windowInstance;
          
          // Forçar a exibição da janela
          window.electronAPI.invoke(`show-${appName.toLowerCase()}-window`, windowInstance.id, containerBounds).then(() => {
            console.log(`Janela do ${appName} exibida com sucesso`);
          }).catch(error => {
            console.error(`Erro ao exibir janela do ${appName}:`, error);
          });
        } else {
          // Se não existe, criar uma nova janela
          console.log(`Criando nova janela do ${appName}...`);
          document.querySelectorAll(`.${appName.toLowerCase()}-window-container`).forEach(container => container.remove());
          createAppWindow(webviewId, url, appName);
        }
      } else {
        // Para outras webviews, esconder todas as janelas especiais
        [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance].forEach(instance => {
          if (instance && instance.container) {
            console.log('Escondendo janela especial...');
            instance.container.style.display = 'none';
            instance.container.style.opacity = '0';
            instance.container.classList.remove('active');
            
            // Verificar se instance.id existe e é uma string antes de fazer o split
            const appName = instance.id && typeof instance.id === 'string' ? 
              instance.id.split('-')[0] : 
              instance.container.className.split('-')[0]; // Fallback para o nome da classe do container
            
            if (appName) {
              window.electronAPI.invoke(`hide-${appName}-window`, instance.id).then(() => {
                console.log('Janela especial ocultada com sucesso');
              }).catch(error => {
                console.error('Erro ao ocultar janela especial:', error);
              });
            }
          }
        });

        // Criar ou obter webview normal
        let webview = document.getElementById(webviewId);
        if (!webview) {
          webview = createWebview(webviewId, url);
        }
        if (webview) {
          webview.style.display = 'flex';
          webview.style.opacity = '1';
          webview.classList.add('active');
          currentWebview = webview;
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

    // Verificar se é um aplicativo especial
    const specialApps = ['linkedin', 'teams', 'slack', 'skype'];
    const isSpecialApp = specialApps.some(app => currentViewId.includes(app));
    
    if (isSpecialApp) {
      const appName = specialApps.find(app => currentViewId.includes(app));
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
      }

      // Verificar se a janela está ativa
      const isActive = windowInstance && 
                      windowInstance.container && 
                      (windowInstance.container.classList.contains('active') || 
                       windowInstance.container.style.display === 'flex');

      console.log(`Verificando menu de contexto para ${appName}:`, {
        currentViewId,
        hasInstance: !!windowInstance,
        hasContainer: !!(windowInstance && windowInstance.container),
        isActive,
        containerClasses: windowInstance?.container?.className,
        containerDisplay: windowInstance?.container?.style.display
      });

      if (isActive) {
        // Obter o template do menu
        const menuTemplate = await getMenuTemplate(currentViewId);
        console.log(`[renderer] Sending context menu request for ${currentViewId} at clientX: ${x}, clientY: ${y}`);
        window.electronAPI.invoke('show-context-menu-window', menuTemplate, x, y, currentViewId);
      } else {
        console.log(`Context menu not shown because ${appName} window is not active`);
      }
    } else {
      // Para webviews normais
      const webview = document.getElementById(currentViewId);
      const isActive = webview && (webview.classList.contains('active') || webview.style.display === 'flex');

      console.log('Verificando menu de contexto para webview normal:', {
        currentViewId,
        hasWebview: !!webview,
        isActive,
        webviewClasses: webview?.className,
        webviewDisplay: webview?.style.display
      });

      if (isActive) {
        const menuTemplate = await getMenuTemplate(currentViewId);
        console.log(`[renderer] Sending context menu request for ${currentViewId} at clientX: ${x}, clientY: ${y}`);
        window.electronAPI.invoke('show-context-menu-window', menuTemplate, x, y, currentViewId);
      } else {
        console.log('Context menu not shown because webview is not active');
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

        // Verificar se é um botão de aplicativo especial
        const specialApps = ['linkedin', 'teams', 'slack', 'skype'];
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
          }
          
          // Verificar se a janela está ativa
          const isActive = windowInstance && 
                          windowInstance.container && 
                          (windowInstance.container.classList.contains('active') || 
                           windowInstance.container.style.display === 'flex' ||
                           target.classList.contains('active') ||
                           target.classList.contains('opened'));

          console.log(`Verificando menu de contexto para ${appName} na sidebar:`, {
            webviewId,
            hasInstance: !!windowInstance,
            hasContainer: !!(windowInstance && windowInstance.container),
            isActive,
            containerClasses: windowInstance?.container?.className,
            containerDisplay: windowInstance?.container?.style.display,
            buttonClasses: target.className
          });
          
          if (isActive) {
            console.log(`Mostrando menu de contexto para ${appName}:`, webviewId);
            showContextMenu(e.clientX, e.clientY, webviewId);
          }
        } else {
          // Para webviews normais
          const isButtonActive = target.classList.contains('active') || 
                                target.classList.contains('opened');
          
          if (isButtonActive) {
            console.log('Mostrando menu de contexto para webview normal:', webviewId);
            showContextMenu(e.clientX, e.clientY, webviewId);
          }
        }
      });
    }

    // Adicionar evento de contexto para containers de aplicativos especiais
    document.addEventListener('contextmenu', (e) => {
      const specialApps = ['linkedin', 'teams', 'slack', 'skype'];
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
    console.log('Received command from main process:', command, 'for view:', currentViewId);

    // Verificar se é um aplicativo especial
    const specialApps = ['linkedin', 'teams', 'slack', 'skype'];
    const isSpecialApp = specialApps.some(app => currentViewId.includes(app));
    const appName = isSpecialApp ? specialApps.find(app => currentViewId.includes(app)) : null;
    
    console.log('Menu context:', { 
      isSpecialApp, 
      appName, 
      currentViewId,
      teamsInstance: teamsWindowInstance,
      slackInstance: slackWindowInstance,
      skypeInstance: skypeWindowInstance,
      linkedInInstance: linkedInWindowInstance
    });

    switch (command) {
      case 'reload-current':
        console.log(`[renderer] Executing reload-current for: ${currentViewId}`);
        if (isSpecialApp) {
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
          }

          if (windowInstance && windowInstance.id) {
            console.log(`Recarregando janela do ${appName}...`, windowInstance.id);
            try {
              if (windowInstance.container) {
                windowInstance.container.style.opacity = '0';
              }
              await window.electronAPI.invoke(`reload-${appName}-window`, windowInstance.id);
              console.log(`Comando de recarregar ${appName} enviado`);
              setTimeout(() => {
                if (windowInstance && windowInstance.container) {
                  windowInstance.container.style.opacity = '1';
                }
              }, 200);
            } catch (error) {
              console.error(`Erro ao recarregar ${appName}:`, error);
              if (windowInstance && windowInstance.container) {
                windowInstance.container.style.opacity = '1';
              }
            }
          } else {
            console.log(`${appName} não está ativo para recarregar`);
          }
        } else {
          const webview = document.getElementById(currentViewId);
          if (webview && isWebviewActive(currentViewId)) {
            console.log('Recarregando webview:', currentViewId);
            webview.reload();
          }
        }
        break;

      case 'close-current':
        console.log(`[renderer] Executing close-current for: ${currentViewId}`);
        if (isSpecialApp) {
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
          }

          if (windowInstance && windowInstance.id) {
            console.log(`Fechando janela do ${appName}...`, windowInstance.id);
            try {
              if (windowInstance.container) {
                windowInstance.container.style.opacity = '0';
              }
              await window.electronAPI.invoke(`close-${appName}-window`, windowInstance.id);
              console.log(`Comando de fechar ${appName} enviado`);
              setTimeout(() => {
                if (windowInstance && windowInstance.container) {
                  windowInstance.container.remove();
                }
                // Limpar a instância global
                switch(appName) {
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
                }
                const button = document.querySelector(`.nav-button[data-id*="${appName}"]`);
                if (button) {
                  button.classList.remove('opened', 'active');
                }
                if (!hasOpenWebviews()) {
                  showWebview('webview-home', 'home-button');
                }
                console.log(`${appName} fechado e recursos limpos`);
              }, 200);
            } catch (error) {
              console.error(`Erro ao fechar ${appName}:`, error);
              if (windowInstance && windowInstance.container) {
                windowInstance.container.remove();
              }
              // Limpar a instância global mesmo em caso de erro
              switch(appName) {
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
              }
              const button = document.querySelector(`.nav-button[data-id*="${appName}"]`);
              if (button) {
                button.classList.remove('opened', 'active');
              }
              if (!hasOpenWebviews()) {
                showWebview('webview-home', 'home-button');
              }
            }
          } else {
            console.log(`${appName} não está ativo para fechar`);
          }
        } else {
          const webview = document.getElementById(currentViewId);
          if (webview && isWebviewActive(currentViewId)) {
            console.log('Fechando webview:', currentViewId);
            webview.style.opacity = '0';
            setTimeout(() => {
              const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
              if (button) {
                button.classList.remove('opened', 'active');
              }
              webview.remove();
              if (!hasOpenWebviews()) {
                showWebview('webview-home', 'home-button');
              }
            }, 200);
          }
        }
        break;

      case 'reload-all':
        console.log('Recarregando todas as webviews...');
        // Recarregar webviews normais
        document.querySelectorAll('webview').forEach(webview => {
          if (webview.id !== 'webview-home' && 
              (webview.classList.contains('active') || webview.classList.contains('opened'))) {
            console.log('Recarregando webview:', webview.id);
            webview.reload();
          }
        });

        // Recarregar janelas especiais
        [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance].forEach(instance => {
          if (instance && instance.container) {
            const appName = instance.id.split('-')[0];
            console.log(`Recarregando ${appName}...`);
            try {
              instance.container.style.opacity = '0';
              window.electronAPI.invoke(`reload-${appName}-window`, instance.id).then(() => {
                setTimeout(() => {
                  instance.container.style.opacity = '1';
                }, 200);
              }).catch(error => {
                console.error(`Erro ao recarregar ${appName}:`, error);
                instance.container.style.opacity = '1';
              });
            } catch (error) {
              console.error(`Erro ao recarregar ${appName}:`, error);
              instance.container.style.opacity = '1';
            }
          }
        });
        break;

      case 'close-all':
        console.log('Fechando todas as webviews...');
        const currentLanguage = await window.electronAPI.getLanguage();
        const translations = {
          'pt-BR': { 'close_all_confirmation': 'Tem certeza que deseja fechar todas as abas?' },
          'en-US': { 'close_all_confirmation': 'Are you sure you want to close all tabs?' }
        };
        const t = translations[currentLanguage] || translations['en-US'];

        showConfirmationDialog(t['close_all_confirmation'], async () => {
          try {
            // Fechar webviews normais
            document.querySelectorAll('webview').forEach(webview => {
              if (webview.id !== 'webview-home' && 
                  (webview.classList.contains('active') || webview.classList.contains('opened'))) {
                console.log('Fechando webview:', webview.id);
                webview.style.opacity = '0';
                setTimeout(() => {
                  const button = document.querySelector(`.nav-button[data-id="${webview.id}"]`);
                  if (button) {
                    button.classList.remove('opened', 'active');
                  }
                  webview.remove();
                }, 200);
              }
            });

            // Fechar janelas especiais
            [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance].forEach(async (instance) => {
              if (instance && instance.id) {
                const appName = instance.id.split('-')[0];
                console.log(`Fechando ${appName}...`);
                try {
                  if (instance.container) {
                    instance.container.style.opacity = '0';
                  }
                  await window.electronAPI.invoke(`close-${appName}-window`, instance.id);
                  console.log(`Comando de fechar ${appName} enviado`);
                  setTimeout(() => {
                    if (instance.container) {
                      instance.container.remove();
                    }
                    // Limpar a instância global
                    switch(appName) {
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
                    }
                    const button = document.querySelector(`.nav-button[data-id*="${appName}"]`);
                    if (button) {
                      button.classList.remove('opened', 'active');
                    }
                  }, 200);
                } catch (error) {
                  console.error(`Erro ao fechar ${appName}:`, error);
                  if (instance.container) {
                    instance.container.remove();
                  }
                  // Limpar a instância global mesmo em caso de erro
                  switch(appName) {
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
                  }
                  const button = document.querySelector(`.nav-button[data-id*="${appName}"]`);
                  if (button) {
                    button.classList.remove('opened', 'active');
                  }
                }
              }
            });

            // Limpar todos os botões exceto home
            document.querySelectorAll('.nav-button').forEach(button => {
              if (button.id !== 'home-button') {
                button.classList.remove('opened', 'active');
              }
            });
            currentWebview = null;
            document.getElementById('active-view-name').textContent = '';
            showWebview('webview-home', 'home-button');
          } catch (error) {
            console.error('Erro ao fechar todas as janelas:', error);
            // Limpar todas as instâncias em caso de erro
            [linkedInWindowInstance, teamsWindowInstance, slackWindowInstance, skypeWindowInstance].forEach(instance => {
              if (instance && instance.container) {
                instance.container.remove();
              }
            });
            linkedInWindowInstance = null;
            teamsWindowInstance = null;
            slackWindowInstance = null;
            skypeWindowInstance = null;
            showWebview('webview-home', 'home-button');
          }
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

  // Limpar cache periodicamente
  setInterval(() => {
    webviewCache.forEach((webview, id) => {
      if (webview && !webview.isDestroyed() && !webview.classList.contains('active')) {
        webview.remove();
        webviewCache.delete(id);
      }
    });
  }, 300000); // A cada 5 minutos

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

  // Inicialização
  const init = async () => {
    try {
      // Configurar idioma inicial
      const currentLanguage = await window.electronAPI.getLanguage();
      document.documentElement.lang = currentLanguage;
      translatePage(currentLanguage);

      await setupUserSession();
      setupProfileMenu();
      setupButtonEvents();
      setupDarkMode();
      setupContextMenu();
      setupSidebarScroll();
      refreshApplications();
      // Abrir a webview-home ao iniciar
      showWebview('webview-home', 'home-button');
    } catch (error) {
      console.error('Erro na inicialização:', error);
    }
  };

  init();
});

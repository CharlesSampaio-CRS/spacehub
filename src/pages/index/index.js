document.addEventListener('DOMContentLoaded', async () => {
  let currentZoom = 1.0;
  let currentWebview = null;
  let webviewCache = new Map();

  const services = {
    'home-button': 'webview-home',
    'settings-button': 'webview-settings',
    'todoist-button': 'webview-todoist',
  };

  const serviceMap = {
    'webview-home': '../../pages/home/home.html',
    'webview-todoist': 'https://app.todoist.com/auth/login',
    'webview-settings': '../../pages/settings/settings.html',
  };

  const getTitleFromWebviewId = (webviewId) => {
    if (!webviewId.startsWith('webview-')) return '';
    const name = webviewId.replace('webview-', '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const webviewContainer = document.querySelector('.webview-wrapper');

  const createWebview = (webviewId, url) => {
    try {
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
      webview.className = 'webview w-100 h-100 active';
      webview.src = url || '../../pages/home/home.html';

      // Configurações comuns para todas as webviews
      webview.setAttribute('preload', '../../preload.js');
      webview.setAttribute('partition', 'persist:mainSession');
      webview.setAttribute('webpreferences', 'allowRunningInsecureContent=yes, experimentalFeatures=yes, webSecurity=no, plugins=yes, webgl=yes, nodeIntegrationInSubFrames=yes, backgroundThrottling=no');

      // Configurações específicas para WhatsApp
      if (url && url.includes('web.whatsapp.com')) {
        console.log('Configurando webview do WhatsApp...');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no, webSecurity=no, allowRunningInsecureContent=yes');
        
        // Eventos específicos para WhatsApp
        webview.addEventListener('dom-ready', () => {
          console.log('WhatsApp webview DOM ready');
          webview.setZoomFactor(currentZoom);
        });

        webview.addEventListener('did-start-loading', () => {
          console.log('WhatsApp webview started loading');
        });

        webview.addEventListener('did-finish-load', () => {
          console.log('WhatsApp webview finished loading');
        });

        webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {
          console.error('WhatsApp webview failed to load:', errorCode, errorDescription);
          if (errorCode === -3 || errorCode === -102) {
            setTimeout(() => webview.reload(), 2000);
          }
        });

        // Monitorar erros de console do WhatsApp
        webview.addEventListener('console-message', (event) => {
          console.log('WhatsApp console:', event.message);
        });
      }
      // Configurações específicas para LinkedIn (mantendo o código existente)
      else if (url && url.includes('linkedin.com')) {
        console.log('Configurando webview do LinkedIn...');
        webview.setAttribute('allowpopups', 'true');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no, webSecurity=no, allowRunningInsecureContent=yes');
        
        let loadAttempts = 0;
        const maxLoadAttempts = 3;
        let loadTimeout;

        // Eventos específicos para LinkedIn
        webview.addEventListener('dom-ready', () => {
          console.log('LinkedIn webview DOM ready');
          webview.setZoomFactor(currentZoom);
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-start-loading', () => {
          console.log('LinkedIn webview started loading');
        });

        webview.addEventListener('did-finish-load', () => {
          console.log('LinkedIn webview finished loading');
          loadAttempts = 0;
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {
          console.error('LinkedIn webview failed to load:', errorCode, errorDescription);

          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            console.log(`Tentativa ${loadAttempts} de ${maxLoadAttempts} para recarregar LinkedIn...`);
            setTimeout(() => {
              webview.reload();
            }, 2000 * loadAttempts); // Aumenta o tempo entre tentativas
          } else {
            console.error('Número máximo de tentativas de carregamento atingido');
            // Mostrar mensagem de erro para o usuário
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Não foi possível carregar o LinkedIn. Por favor, tente novamente.';
            webviewContainer.appendChild(errorMsg);
          }
        });

        webview.addEventListener('crashed', () => {
          console.error('LinkedIn webview crashed');
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            console.log(`Tentativa ${loadAttempts} de ${maxLoadAttempts} para recriar LinkedIn após crash...`);
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });

        webview.addEventListener('will-navigate', (event) => {
          console.log('LinkedIn navigation:', event.url);
          if (event.url.includes('linkedin.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        webview.addEventListener('new-window', (event) => {
          console.log('LinkedIn new window:', event.url);
          if (event.url.includes('linkedin.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        // Timeout para verificar se a página carregou
        loadTimeout = setTimeout(() => {
          if (webview.getURL() === 'about:blank' || webview.getURL() === '') {
            console.log('LinkedIn webview timeout, attempting reload...');
            if (loadAttempts < maxLoadAttempts) {
              loadAttempts++;
              webview.reload();
            }
          }
        }, 10000);

        // Monitorar mudanças de URL
        webview.addEventListener('did-navigate', (event) => {
          console.log('LinkedIn navigated to:', event.url);
          if (event.url.includes('linkedin.com')) {
            clearTimeout(loadTimeout);
          }
        });

        // Monitorar erros de console
        webview.addEventListener('console-message', (event) => {
          console.log('LinkedIn console:', event.message);
        });

        // Monitorar erros de renderização
        webview.addEventListener('render-process-gone', (event) => {
          console.error('LinkedIn render process gone:', event.reason);
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });
      }

      // Eventos comuns para todas as webviews
      webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`Erro ao carregar ${webviewId}:`, errorCode, errorDescription);
      });

      // Atualizar o título da janela
      let title;
      if (webviewId === 'webview-settings') {
        title = 'Settings';
      } else if (webviewId === 'webview-home') {
        title = 'Home';
      } else {
        title = button ? button.title : webviewId.replace('webview-', '');
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

      // Adicionar a webview ao container
      webviewContainer.appendChild(webview);
      return webview;
    } catch (error) {
      console.error('Erro ao criar webview:', error);
      return null;
    }
  };

  const showWebview = (webviewId, buttonId) => {
    try {
      // Remover apenas a classe active de todas as webviews e botões
      document.querySelectorAll('.webview').forEach(w => w.classList.remove('active'));
      document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));

      // Adicionar classes ao botão atual
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.add('active');
        // Adicionar opened apenas se não for o botão home
        if (buttonId !== 'home-button') {
          button.classList.add('opened');
        }
        button.setAttribute('data-id', webviewId);
      }

      // --- LinkedIn como BrowserView ---
      if (webviewId === 'webview-linkedin') {
        document.querySelectorAll('.webview').forEach(w => w.classList.remove('active'));
        window.electronAPI.send('show-linkedin-view');
        const titleElement = document.getElementById('active-view-name');
        titleElement.textContent = 'LinkedIn';
        titleElement.setAttribute('data-translate', 'LinkedIn');
        const currentLanguage = document.documentElement.lang;
        if (typeof translations !== 'undefined' && translations[currentLanguage] && translations[currentLanguage]['LinkedIn']) {
          titleElement.textContent = translations[currentLanguage]['LinkedIn'];
        }
        currentWebview = null;
        return;
      } else {
        window.electronAPI.send('hide-linkedin-view');
      }
      // --- Fim LinkedIn ---

      // --- Slack como BrowserView ---
      if (webviewId === 'webview-slack') {
        document.querySelectorAll('.webview').forEach(w => w.classList.remove('active'));
        window.electronAPI.send('show-slack-view');
        const titleElement = document.getElementById('active-view-name');
        titleElement.textContent = 'Slack';
        titleElement.setAttribute('data-translate', 'Slack');
        const currentLanguage = document.documentElement.lang;
        if (typeof translations !== 'undefined' && translations[currentLanguage] && translations[currentLanguage]['Slack']) {
          titleElement.textContent = translations[currentLanguage]['Slack'];
        }
        currentWebview = null;
        return;
      } else {
        window.electronAPI.send('hide-slack-view');
      }
      // --- Fim Slack ---

      // Criar ou obter webview
      let webview = document.getElementById(webviewId);
      if (!webview) {
        webview = createWebview(webviewId, serviceMap[webviewId]);
      }

      if (webview) {
        webview.classList.add('active');
        updateActiveViewTitle(webview);
        currentWebview = webview;
        const sidebarButton = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
        if (sidebarButton) {
          sidebarButton.classList.add('active');
          if (sidebarButton.id !== 'home-button') {
            sidebarButton.classList.add('opened');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao mostrar webview:', error);
    }
  };

  const updateActiveViewTitle = (webview) => {
    if (!webview) return;
    const title = webview.getAttribute('alt');
    const titleElement = document.getElementById('active-view-name');
    titleElement.textContent = title;
    titleElement.setAttribute('data-translate', title);

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
        if (Array.isArray(data.data.applications)) {
          data.data.applications.forEach(app => {
            if (app.active == true) {
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

  const setupSidebarScroll = () => {
    document.getElementById('sidebar')?.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.currentTarget.scrollTop += e.deltaY;
    });
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

    const menuItems = {
      home: `
        <div class="context-menu-item" data-command="reload-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${t['Atualizar Todos']}</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-command="close-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${t['Fechar Todos']}</span>
        </div>
      `,
      other: `
        <div class="context-menu-item" data-command="reload-current">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${t['Atualizar']}</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-command="close-current">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${t['Fechar']}</span>
        </div>
      `
    };

    return currentViewId === 'webview-home' ? menuItems.home : menuItems.other;
  };

  const setupMenuPosition = (menu, x, y) => {
    const rect = document .body.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 100;
    
    let posX = Math.min(x, rect.width - menuWidth - 10);
    let posY = Math.min(y, rect.height - menuHeight - 10);
    
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
  };

  const setupMenuEvents = (menu, currentViewId) => {
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async () => {
        const command = item.getAttribute('data-command');
        menu.remove();

        // Executar comandos diretamente no renderer
        switch (command) {
          case 'reload-all':
            console.log('Executando reload-all...');
            document.querySelectorAll('webview').forEach(w => {
              if (w.classList.contains('active') || w.classList.contains('opened')) {
                console.log('Recarregando webview:', w.id);
                w.reload();
              }
            });
            // Também recarregar o BrowserView do LinkedIn se estiver ativo/aberto
            const linkedInBtnReload = document.querySelector('.nav-button[data-id="webview-linkedin"].active, .nav-button[data-id="webview-linkedin"].opened');
            if (linkedInBtnReload) {
              window.electronAPI.send('reload-linkedin-view');
            }
            break;

          case 'close-all':
            console.log('Executando close-all...');
            const currentLanguage = await window.electronAPI.getLanguage();
            const translations = {
              'pt-BR': {
                'close_all_confirmation': 'Tem certeza que deseja fechar todas as abas?'
              },
              'en-US': {
                'close_all_confirmation': 'Are you sure you want to close all tabs?'
              }
            };
            const t = translations[currentLanguage] || translations['en-US'];
            showConfirmationDialog(t['close_all_confirmation'], () => {
              document.querySelectorAll('webview').forEach(w => {
                if (w.id !== 'webview-home' && (w.classList.contains('active') || w.classList.contains('opened'))) {
                  console.log('Fechando webview:', w.id);
                  w.remove();
                  const button = document.querySelector(`.nav-button[data-id="${w.id}"]`);
                  if (button) {
                    button.classList.remove('active', 'opened');
                  }
                }
              });
              // Também destruir o BrowserView do LinkedIn se estiver ativo
              const linkedInBtn = document.querySelector('.nav-button[data-id="webview-linkedin"].active, .nav-button[data-id="webview-linkedin"].opened');
              if (linkedInBtn) {
                window.electronAPI.send('destroy-linkedin-view');
                linkedInBtn.classList.remove('active', 'opened');
              }
              // Também destruir o BrowserView do Slack se estiver ativo
              const slackBtn = document.querySelector('.nav-button[data-id="webview-slack"].active, .nav-button[data-id="webview-slack"].opened');
              if (slackBtn) {
                window.electronAPI.send('destroy-slack-view');
                slackBtn.classList.remove('active', 'opened');
              }
              document.querySelectorAll('.nav-button').forEach(b => {
                if (b.id !== 'home-button') {
                  b.classList.remove('opened');
                }
              });
              if (currentWebview && currentWebview.id !== 'webview-home') {
                currentWebview = null;
                document.getElementById('active-view-name').textContent = '';
              }
              showWebview('webview-home', 'home-button');
            });
            break;

          case 'reload-current':
            console.log('Executando reload-current para:', currentViewId);
            if (currentViewId === 'webview-linkedin') {
              window.electronAPI.send('reload-linkedin-view');
            } else if (currentViewId === 'webview-slack') {
              window.electronAPI.send('reload-slack-view');
            } else {
              const targetReload = document.getElementById(currentViewId);
              if (targetReload?.reload && isWebviewActive(currentViewId)) {
                targetReload.reload();
              }
            }
            break;

          case 'close-current':
            console.log('Executando close-current para:', currentViewId);
            if (currentViewId === 'webview-linkedin') {
              // Remove botão ativo
              const button = document.querySelector(`.nav-button[data-id="webview-linkedin"]`);
              if (button) button.classList.remove('opened', 'active');
              window.electronAPI.send('destroy-linkedin-view');
              document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
              const homeButton = document.getElementById('home-button');
              if (homeButton) homeButton.classList.add('active');
              showWebview('webview-home', 'home-button');
            } else if (currentViewId === 'webview-slack') {
              const button = document.querySelector(`.nav-button[data-id="webview-slack"]`);
              if (button) button.classList.remove('opened', 'active');
              window.electronAPI.send('destroy-slack-view');
              document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
              const homeButton = document.getElementById('home-button');
              if (homeButton) homeButton.classList.add('active');
              showWebview('webview-home', 'home-button');
            } else {
              const targetClose = document.getElementById(currentViewId);
              if (targetClose && isWebviewActive(currentViewId)) {
                const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
                if (button) {
                  button.classList.remove('opened', 'active');
                }
                targetClose.remove();
                document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                const homeButton = document.getElementById('home-button');
                if (homeButton) {
                  homeButton.classList.add('active');
                }
                showWebview('webview-home', 'home-button');
              }
            }
            break;
        }
      });
    });

    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
        if (currentViewId === 'webview-linkedin') {
          // Só restaura se o LinkedIn ainda estiver ativo
          const isLinkedInActive = document.querySelector('.nav-button[data-id="webview-linkedin"].active');
          if (isLinkedInActive) {
            window.electronAPI.send('restore-linkedin-view');
          }
        }
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  };

  // Adaptação para considerar LinkedIn ativo mesmo sem webview
  const isWebviewActive = (webviewId) => {
    if (webviewId === 'webview-linkedin') {
      // Considera LinkedIn ativo se o botão está ativo
      const button = document.querySelector(`.nav-button[data-id="webview-linkedin"]`);
      return button && button.classList.contains('active');
    }
    const webview = document.getElementById(webviewId);
    return webview && (webview.classList.contains('active') || webview.classList.contains('opened'));
  };

  const showContextMenu = async (x, y, currentViewId) => {
    // Para BrowserView, sempre mostra o menu
    if (
      currentViewId === 'webview-linkedin' ||
      currentViewId === 'webview-slack'
    ) {
      window.electronAPI.send('show-context-menu-window', {
        x,
        y,
        currentViewId
      });
      return;
    }

    // Para webviews normais, mantém a checagem
    if (!currentViewId || !isWebviewActive(currentViewId)) {
      return;
    }
    window.electronAPI.send('show-context-menu-window', {
      x,
      y,
      currentViewId
    });
  };

  // Context Menu e comunicação com main process
  const setupContextMenu = () => {
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

        // Se for o botão home, verificar se existem outras webviews abertas OU LinkedIn ativo
        if (webviewId === 'webview-home') {
          // Verificar todas as webviews existentes
          const webviews = document.querySelectorAll('webview');
          // Verificar também o LinkedIn
          const linkedInActive = document.querySelector('.nav-button[data-id="webview-linkedin"].active, .nav-button[data-id="webview-linkedin"].opened');
          // Verificar também o Slack
          const slackActive = document.querySelector('.nav-button[data-id="webview-slack"].active, .nav-button[data-id="webview-slack"].opened');
          // Verificar também os botões que estão marcados como abertos
          const hasOtherWebviews = Array.from(webviews).some(webview => {
            const isOther = webview.id !== 'webview-home' && webview.id !== 'webview-settings';
            const button = document.querySelector(`.nav-button[data-id="${webview.id}"]`);
            const isButtonOpened = button && button.classList.contains('opened');
            const isWebviewActive = webview.classList.contains('active') || webview.classList.contains('opened');
            return isOther && (isButtonOpened || isWebviewActive);
          });
          // Só mostrar o menu se houver outras webviews abertas OU LinkedIn ativo OU Slack ativo
          if (!hasOtherWebviews && !linkedInActive && !slackActive) {
            return;
          }
        }

        // Verificar se o botão está ativo ou tem uma webview aberta
        const button = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
        const isButtonActive = button && (button.classList.contains('active') || button.classList.contains('opened'));
        const webview = document.getElementById(webviewId);
        const isWebviewActiveFlag = webview && (webview.classList.contains('active') || webview.classList.contains('opened'));

        // Permitir menu para LinkedIn ou Slack se botão estiver ativo
        if (isButtonActive || isWebviewActiveFlag || webviewId === 'webview-linkedin' || webviewId === 'webview-slack') {
          showContextMenu(e.clientX, e.clientY, webviewId);
        } 
      });
    }

    document.addEventListener('contextmenu', (e) => {
      // Permitir menu de contexto para LinkedIn ou Slack quando ativo
      const isLinkedInActive = document.querySelector('.nav-button[data-id="webview-linkedin"].active');
      const isSlackActive = document.querySelector('.nav-button[data-id="webview-slack"].active');
      if (
        e.target.tagName === 'WEBVIEW' ||
        (isLinkedInActive && e.target.closest('.webview-wrapper')) ||
        (isSlackActive && e.target.closest('.webview-wrapper'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        let webviewId;
        if (e.target.tagName === 'WEBVIEW') {
          webviewId = e.target.id;
        } else if (isLinkedInActive) {
          webviewId = 'webview-linkedin';
        } else if (isSlackActive) {
          webviewId = 'webview-slack';
        }
        const button = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
        const isButtonOpened = button && button.classList.contains('opened');
        const isWebviewActiveFlag = e.target.classList.contains('active') || e.target.classList.contains('opened');
        if (isButtonOpened || isWebviewActiveFlag || webviewId === 'webview-linkedin' || webviewId === 'webview-slack') {
          showContextMenu(e.clientX, e.clientY, webviewId);
        }
      }
    });
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
          const firstName = userData.data.name ? userData.data.name.split(' ')[0] : 'Usuário';
          
          document.getElementById('profile-name').textContent = firstName;
          document.getElementById('profile-menu-name').textContent = userData.data.name || 'Usuário';
          document.getElementById('profile-menu-email').textContent = userData.data.email || 'usuario@email.com';
          
          // Atualizar avatares se houver
          if (userData.data.avatar) {
            document.getElementById('profile-avatar').src = userData.data.avatar;
            document.getElementById('profile-menu-avatar').src = userData.data.avatar;
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
      // Pega posição do botão para posicionar o menu
      const rect = profileButton.getBoundingClientRect();
      // Pega limites da content (área principal)
      const content = document.querySelector('.content') || document.body;
      const contentRect = content.getBoundingClientRect();
      // Calcula posição inicial (centralizado abaixo do avatar)
      let x = Math.round(rect.left + rect.width / 2 - 130 + 30); // 130 = metade do menu (260px), +32px para mais dentro
      let y = Math.round(rect.bottom + 90); // 16px de espaçamento para mais pra baixo
      // Garante que o menu não saia da content
      x = Math.max(contentRect.left + 32, Math.min(x, contentRect.right - 260 - 32));
      y = Math.max(contentRect.top + 8, Math.min(y, contentRect.bottom - 180 - 8));
      // Pega dados do usuário
      const user = {
        name: document.getElementById('profile-menu-name')?.textContent || 'Usuário',
        email: document.getElementById('profile-menu-email')?.textContent || 'usuario@email.com',
        avatar: document.getElementById('profile-menu-avatar')?.src || ''
      };
      window.electronAPI.send('show-profile-menu-window', { x, y, user });
    });

    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
      if (!profileMenu?.contains(e.target) && !profileButton?.contains(e.target)) {
        if (profileMenu.classList.contains('show')) {
          profileMenu?.classList.remove('show');
          // Se LinkedIn está ativo, restaurar BrowserView
          const isLinkedInActive = document.querySelector('.nav-button[data-id="webview-linkedin"].active');
          if (isLinkedInActive) {
            window.electronAPI.send('restore-linkedin-view');
          }
        }
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

  // Adicionar listener para comandos do menu de contexto nativo
  window.electronAPI.on('context-menu-command', async (event, data) => {
    const { command, currentViewId, x, y } = data || {};
    if (typeof x === 'number' && typeof y === 'number' && (currentViewId === 'webview-linkedin' || currentViewId === 'webview-slack')) {
      showContextMenu(x, y, currentViewId);
      return;
    }
    if (!command) return;
    switch (command) {
      case 'reload-all':
        document.querySelectorAll('webview').forEach(w => {
          if (w.classList.contains('active') || w.classList.contains('opened')) {
            w.reload();
          }
        });
        // Também recarregar o BrowserView do LinkedIn se estiver ativo/aberto
        const linkedInBtnReload = document.querySelector('.nav-button[data-id="webview-linkedin"].active, .nav-button[data-id="webview-linkedin"].opened');
        if (linkedInBtnReload) {
          window.electronAPI.send('reload-linkedin-view');
        }
        break;
      case 'close-all': {
        // Adiciona confirmação igual ao menu HTML
        const currentLanguage = document.documentElement.lang;
        const translations = {
          'pt-BR': {
            'close_all_confirmation': 'Tem certeza que deseja fechar todas as abas?'
          },
          'en-US': {
            'close_all_confirmation': 'Are you sure you want to close all tabs?'
          }
        };
        const t = translations[currentLanguage] || translations['en-US'];
        showConfirmationDialog(t['close_all_confirmation'], () => {
          document.querySelectorAll('webview').forEach(w => {
            if (w.id !== 'webview-home' && (w.classList.contains('active') || w.classList.contains('opened'))) {
              w.remove();
              const button = document.querySelector(`.nav-button[data-id="${w.id}"]`);
              if (button) {
                button.classList.remove('active', 'opened');
              }
            }
          });
          // Também destruir o BrowserView do LinkedIn se estiver ativo
          const linkedInBtn = document.querySelector('.nav-button[data-id="webview-linkedin"].active, .nav-button[data-id="webview-linkedin"].opened');
          if (linkedInBtn) {
            window.electronAPI.send('destroy-linkedin-view');
            linkedInBtn.classList.remove('active', 'opened');
          }
          // Também destruir o BrowserView do Slack se estiver ativo
          const slackBtn = document.querySelector('.nav-button[data-id="webview-slack"].active, .nav-button[data-id="webview-slack"].opened');
          if (slackBtn) {
            window.electronAPI.send('destroy-slack-view');
            slackBtn.classList.remove('active', 'opened');
          }
          document.querySelectorAll('.nav-button').forEach(b => {
            if (b.id !== 'home-button') {
              b.classList.remove('opened');
            }
          });
          if (currentWebview && currentWebview.id !== 'webview-home') {
            currentWebview = null;
            document.getElementById('active-view-name').textContent = '';
          }
          showWebview('webview-home', 'home-button');
        });
        break;
      }
      case 'reload-current':
        if (!currentViewId) return;
        if (currentViewId === 'webview-linkedin') {
          window.electronAPI.send('reload-linkedin-view');
        } else if (currentViewId === 'webview-slack') {
          window.electronAPI.send('reload-slack-view');
        } else {
          const targetReload = document.getElementById(currentViewId);
          if (targetReload?.reload) {
            targetReload.reload();
          }
        }
        break;
      case 'close-current':
        if (!currentViewId) return;
        if (currentViewId === 'webview-linkedin') {
          // Remove botão ativo
          const button = document.querySelector(`.nav-button[data-id="webview-linkedin"]`);
          if (button) button.classList.remove('opened', 'active');
          window.electronAPI.send('destroy-linkedin-view');
          document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
          const homeButton = document.getElementById('home-button');
          if (homeButton) homeButton.classList.add('active');
          showWebview('webview-home', 'home-button');
        } else if (currentViewId === 'webview-slack') {
          const button = document.querySelector(`.nav-button[data-id="webview-slack"]`);
          if (button) button.classList.remove('opened', 'active');
          window.electronAPI.send('destroy-slack-view');
          document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
          const homeButton = document.getElementById('home-button');
          if (homeButton) homeButton.classList.add('active');
          showWebview('webview-home', 'home-button');
        } else {
          const targetClose = document.getElementById(currentViewId);
          if (targetClose) {
            const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
            if (button) {
              button.classList.remove('opened', 'active');
            }
            targetClose.remove();
            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            const homeButton = document.getElementById('home-button');
            if (homeButton) {
              homeButton.classList.add('active');
            }
            showWebview('webview-home', 'home-button');
          }
        }
        break;
    }
  });

  // Listener para ações do menu de usuário nativo
  window.electronAPI.on('profile-menu-action', async (event, action) => {
    // Garante que o objeto translations está disponível
    const translations = {
      'pt-BR': {
        'logout_confirmation': 'Tem certeza que deseja sair?',
        'Confirmação': 'Confirmação',
        'Confirmar': 'Confirmar',
        'Cancelar': 'Cancelar'
      },
      'en-US': {
        'logout_confirmation': 'Are you sure you want to logout?',
        'Confirmação': 'Confirmation',
        'Confirmar': 'Confirm',
        'Cancelar': 'Cancel'
      }
    };
    if (action === 'settings') {
      showWebview('webview-settings', 'settings-button');
    } else if (action === 'logout') {
      const currentLanguage = document.documentElement.lang;
      showConfirmationDialog(translations[currentLanguage]?.logout_confirmation || 'Tem certeza que deseja sair?', async () => {
        try {
          const rememberLogin = localStorage.getItem('rememberLogin') === 'true';
          if (!rememberLogin) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('userUuid');
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
            localStorage.removeItem('rememberLogin');
          }
          await window.electronAPI.invoke('logout');
          await window.electronAPI.invoke('create-login-window');
          window.electronAPI.invoke('close-current-window');
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
        }
      });
    }
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

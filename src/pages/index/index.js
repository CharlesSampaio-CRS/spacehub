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
      const title = button ? button.title : webviewId.replace('webview-', '');
      document.getElementById('active-view-name').textContent = title;
      webview.setAttribute('alt', title);

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

      // Adicionar classe active ao botão atual
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.add('active');
        button.setAttribute('data-id', webviewId);
      }

      // Criar ou obter webview
      let webview = document.getElementById(webviewId);
      if (!webview) {
        webview = createWebview(webviewId, serviceMap[webviewId]);
        // Adicionar classe opened ao botão quando a webview é criada
        if (button) {
          button.classList.add('opened');
        }
      }

      if (webview) {
        webview.classList.add('active');
        updateActiveViewTitle(webview);
        currentWebview = webview;

        // Atualizar o botão correspondente na sidebar
        const sidebarButton = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
        if (sidebarButton) {
          sidebarButton.classList.add('active');
        }
      }
    } catch (error) {
      console.error('Erro ao mostrar webview:', error);
    }
  };

  const updateActiveViewTitle = (webview) => {
    if (!webview) return;
    const title = webview.getAttribute('alt');
    document.getElementById('active-view-name').textContent = title || '';
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
    img.src = `../../assets/${app.application.toLowerCase()}.png`;
    img.alt = app.application;
    img.style.width = '20px';
    img.style.height = '20px';
    img.style.objectFit = 'contain';
    img.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

    // Fallback para ícone personalizado se o ícone padrão não carregar
    img.onerror = () => {
      img.src = app.icon;
      // Garantir que o ícone personalizado também mantenha o estilo
      img.style.width = '20px';
      img.style.height = '20px';
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

  const getMenuTemplate = (currentViewId) => {
    const menuItems = {
      home: `
        <div class="context-menu-item" data-command="reload-applications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Atualizar Todos</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-command="close-all-webviews">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Fechar Todos</span>
        </div>
      `,
      other: `
        <div class="context-menu-item" data-command="reload-current-webview">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Atualizar</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-command="close-current-webview">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Fechar</span>
        </div>
      `
    };

    return currentViewId === 'webview-home' ? menuItems.home : menuItems.other;
  };

  const setupMenuPosition = (menu, x, y) => {
    const rect = document.body.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 100;
    
    let posX = Math.min(x, rect.width - menuWidth - 10);
    let posY = Math.min(y, rect.height - menuHeight - 10);
    
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
  };

  const setupMenuEvents = (menu, currentViewId) => {
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const command = item.getAttribute('data-command');
        window.electronAPI.invoke('context-menu-command', command, currentViewId);
        menu.remove();
      });
    });

    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  };

  const showContextMenu = (x, y, currentViewId) => {
    if (!hasOpenWebviews()) {
      return;
    }

    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = getMenuTemplate(currentViewId);
    
    setupMenuPosition(menu, x, y);
    document.body.appendChild(menu);
    setupMenuEvents(menu, currentViewId);
  };

  // Context Menu e comunicação com main process
  const setupContextMenu = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Se clicar no botão home, mostrar menu de contexto do home
        if (e.target.closest('#home-button')) {
          showContextMenu(e.clientX, e.clientY, 'webview-home');
          return;
        }
        // Para outros elementos, usar a webview atual
        const currentViewId = currentWebview?.id || '';
        showContextMenu(e.clientX, e.clientY, currentViewId);
      });
    }

    // Adicionar evento de contexto para as webviews
    document.addEventListener('contextmenu', (e) => {
      if (e.target.tagName === 'WEBVIEW') {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, e.target.id);
      }
    });

    // Adicionar evento de contexto para o botão do Todoist
    document.getElementById('todoist-button')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const todoistWebview = document.getElementById('webview-todoist');
      if (todoistWebview) {
        showContextMenu(e.clientX, e.clientY, 'webview-todoist');
      }
    });

    // Receber comandos do menu de contexto
    window.electronAPI.on('context-menu-command', async (event, command, targetId) => {
      switch (command) {
        case 'reload-applications':
          // Recarregar apenas as webviews que estão abertas
          document.querySelectorAll('webview').forEach(w => {
            if (w.reload) {
              w.reload();
            }
          });
          break;
        case 'close-all-webviews':
          const currentLanguage = await window.electronAPI.getLanguage();
          showConfirmationDialog(translations[currentLanguage]['close_all_confirmation'], () => {
            document.querySelectorAll('webview').forEach(w => {
              if (w.id !== 'webview-home') {
                w.remove();
                // Remover classes do botão correspondente
                const button = document.querySelector(`.nav-button[data-id="${w.id}"]`);
                if (button) {
                  button.classList.remove('active', 'opened');
                }
              }
            });
            document.querySelectorAll('.nav-button').forEach(b => {
              if (b.id !== 'home-button') {
                b.classList.remove('opened');
              }
            });
            if (currentWebview && currentWebview.id !== 'webview-home') {
              currentWebview = null;
              document.getElementById('active-view-name').textContent = '';
            }
            // Voltar para a webview home
            showWebview('webview-home', 'home-button');
          });
          break;
        case 'reload-current-webview':
          const targetReload = document.getElementById(targetId);
          if (targetReload?.reload) targetReload.reload();
          break;
        case 'close-current-webview':
          const targetClose = document.getElementById(targetId);
          if (targetClose) {
            // Desmarcar o botão como aberto e ativo antes de remover a webview
            const button = document.querySelector(`.nav-button[data-id="${targetId}"]`);
            if (button) {
              button.classList.remove('opened', 'active');
            }

            // Remover a webview
            targetClose.remove();
            
            // Voltar para a home
            document.querySelectorAll('.nav-button').forEach(btn => {
              btn.classList.remove('active');
            });
            
            // Ativar o botão home
            const homeButton = document.getElementById('home-button');
            if (homeButton) {
              homeButton.classList.add('active');
            }
            
            showWebview('webview-home', 'home-button');
          }
          break;
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

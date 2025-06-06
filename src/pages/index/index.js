document.addEventListener('DOMContentLoaded', () => {
  let currentZoom = 1.0;
  let currentWebview = null;

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

  const createWebview = (webviewId) => {
    const button = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
    if (button) {
      button.classList.add('opened');
    }

    const webview = document.createElement('webview');

    webview.id = webviewId;
    webview.className = 'webview w-100 h-100 active';
    webview.src = serviceMap[webviewId] || '../../pages/home/home.html';
    webview.setAttribute('partition', 'persist:mainSession');
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    webview.setAttribute('alt', getTitleFromWebviewId(webviewId));
    webview.setAttribute('preload', '../../preload.js');

    webview.addEventListener('dom-ready', () => {
      webview.setZoomFactor(currentZoom);
    });
    webview.addEventListener('new-window', e => {
      e.preventDefault();
      webview.loadURL(e.url);
    });
    webview.addEventListener('will-navigate', e => {
      if (e.url !== webview.src) {
        e.preventDefault();
        webview.loadURL(e.url);
      }
    });

    webviewContainer.appendChild(webview);
    return webview;
  };

  const showWebview = (webviewId, buttonId) => {
    document.querySelectorAll('webview').forEach(w => w.classList.remove('active'));
    document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));

    let webview = document.getElementById(webviewId);
    if (!webview) webview = createWebview(webviewId);
    else webview.classList.add('active');

    document.getElementById(buttonId)?.classList.add('active');

    const button = document.getElementById(buttonId);
    if (button && button.id !== 'home-button') {
      button.classList.add('active', 'opened');
    }

    updateActiveViewTitle(webview);
    currentWebview = webview;
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

              const button = document.createElement('button');
              button.id = buttonId;
              button.className = 'nav-button';
              button.innerHTML = `<img src="${app.icon}" alt="${app.application}"/>`;

              button.addEventListener('click', () => showWebview(appId, buttonId));
              navSection?.appendChild(button);
            }
          });
        }
      })
      .catch(error => console.error('Error loading applications:', error));
  };

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
        if (!webview) webview = createWebview(webviewId);
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

  const setupLogout = () => {
    document.getElementById('logout-button')?.addEventListener('click', () => {
      showConfirmationDialog('Deseja realmente sair do Space Hub?', () => {
        window.electronAPI.logout();
      });
    });
  };

  const hasOpenWebviews = () => {
    const webviews = document.querySelectorAll('webview');
    console.log(webviews);
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
    window.electronAPI.on('context-menu-command', (event, command, targetId) => {
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
          showConfirmationDialog('Deseja realmente fechar todas as janelas?', () => {
            document.querySelectorAll('webview').forEach(w => {
              if (w.id !== 'webview-home') {
                w.remove();
              }
            });
            document.querySelectorAll('.nav-button.opened').forEach(b => {
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

  const showConfirmationDialog = (message, onConfirm) => {
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
      <div class="confirmation-content">
        <h3>Confirmação</h3>
        <p>${message}</p>
        <div class="confirmation-buttons">
          <button class="confirm-btn">Confirmar</button>
          <button class="cancel-btn">Cancelar</button>
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

  // Inicialização
  setupButtonEvents();
  setupNotificationActions();
  setupMenus();
  setupSidebarScroll();
  setupLogout();
  setupContextMenu();
  refreshApplications();
  showWebview('webview-home', 'home-button');
});

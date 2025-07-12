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

      // Configurações comuns para todas as webviews (otimizadas para performance)
      webview.setAttribute('preload', '../../preload.js');
      webview.setAttribute('partition', 'persist:mainSession');
      webview.setAttribute('webpreferences', 'allowRunningInsecureContent=yes, webSecurity=no, plugins=yes, webgl=yes, backgroundThrottling=no');

      // Configurações específicas para WhatsApp
      if (url && url.includes('web.whatsapp.com')) {
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no, webSecurity=no, allowRunningInsecureContent=yes');
        webview.setAttribute('allowpopups', 'true');
        
        // Eventos específicos para WhatsApp
        webview.addEventListener('dom-ready', () => {
          webview.setZoomFactor(currentZoom);
        });

        webview.addEventListener('did-start-loading', () => {
        });

        webview.addEventListener('did-finish-load', () => {
        });

        webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {
          if (errorCode === -3 || errorCode === -102) {
            setTimeout(() => webview.reload(), 2000);
          }
        });

        // Handler para abrir links externos do WhatsApp
        webview.addEventListener('new-window', (event) => {
          const url = event.url;
          
          // Verificar se é um link do WhatsApp ou relacionado
          if (url.includes('web.whatsapp.com') || url.includes('wa.me')) {
            // Links internos do WhatsApp - abrir na mesma webview
            event.preventDefault();
            webview.loadURL(url);
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            // Links externos - abrir no navegador padrão
            event.preventDefault();
            window.electronAPI.send('open-external-link', url);
          } else if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('sms:') || 
                     url.startsWith('geo:') || url.startsWith('maps:') || url.startsWith('instagram://') ||
                     url.startsWith('youtube://') || url.startsWith('twitter://') || url.startsWith('facebook://')) {
            // Links de aplicativos específicos - abrir no aplicativo padrão
            event.preventDefault();
            window.electronAPI.send('open-external-link', url);
          }
        });

        // Handler para navegação dentro do WhatsApp
        webview.addEventListener('will-navigate', (event) => {
          const url = event.url;
          
          // Permitir navegação interna do WhatsApp
          if (url.includes('web.whatsapp.com') || url.includes('wa.me')) {
            // Navegação interna - permitir
            return;
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            // Links externos - abrir no navegador padrão
            event.preventDefault();
            window.electronAPI.send('open-external-link', url);
          } else if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('sms:') || 
                     url.startsWith('geo:') || url.startsWith('maps:') || url.startsWith('instagram://') ||
                     url.startsWith('youtube://') || url.startsWith('twitter://') || url.startsWith('facebook://')) {
            // Links de aplicativos específicos - abrir no aplicativo padrão
            event.preventDefault();
            window.electronAPI.send('open-external-link', url);
          }
        });

        // Handler para links de mídia e arquivos
        webview.addEventListener('will-navigate-in-page', (event) => {
          const url = event.url;
          
          // Verificar se é um link de mídia ou arquivo
          if (url && (url.includes('blob:') || url.includes('data:') || url.includes('file:'))) {
            // Links de mídia internos - permitir
            return;
          }
        });

        // Handler para download de arquivos
        webview.addEventListener('will-download', (event, item, webContents) => {
          // Permitir download de arquivos do WhatsApp
          // O arquivo será salvo na pasta de downloads padrão
        });

        // Handler para links de mídia compartilhada
        webview.addEventListener('dom-ready', () => {
          // Injetar script para melhorar a experiência de links
          webview.executeJavaScript(`
            // Interceptar cliques em links para melhor controle
            document.addEventListener('click', function(e) {
              const link = e.target.closest('a');
              if (link && link.href) {
                const url = link.href;
                
                // Se for um link externo, abrir no navegador padrão
                if (!url.includes('web.whatsapp.com') && !url.includes('wa.me') && 
                    (url.startsWith('http://') || url.startsWith('https://'))) {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Enviar para o processo principal abrir externamente
                  window.electronAPI.send('open-external-link', url);
                  return false;
                }
              }
            }, true);
            
            // Melhorar a experiência de visualização de mídia
            document.addEventListener('DOMContentLoaded', function() {
              // Aguardar carregamento completo da página
              setTimeout(function() {
                // Verificar se há elementos de mídia que precisam de ajustes
                const mediaElements = document.querySelectorAll('img, video, audio');
                mediaElements.forEach(function(element) {
                  element.style.maxWidth = '100%';
                  element.style.height = 'auto';
                });
              }, 1000);
            });
          `);
        });

        // Monitorar erros de console do WhatsApp
        webview.addEventListener('console-message', (event) => {
        });
      }
      // Configurações específicas para Teams
      else if (url && url.includes('teams.microsoft.com')) {
        webview.setAttribute('allowpopups', 'true');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        // Otimização: Remover plugins, experimentalFeatures, webgl e ativar backgroundThrottling
        webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no, webSecurity=no, allowRunningInsecureContent=yes, backgroundThrottling=yes');
        
        let loadAttempts = 0;
        const maxLoadAttempts = 2; // Reduzido para evitar travamentos
        let loadTimeout;

        // Eventos específicos para Teams
        webview.addEventListener('dom-ready', () => {
          webview.setZoomFactor(currentZoom);
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-start-loading', () => {
        });

        webview.addEventListener('did-finish-load', () => {
          loadAttempts = 0;
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {

          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              webview.reload();
            }, 2000 * loadAttempts);
          } else {
            // Mostrar mensagem de erro para o usuário
          }
        });

        webview.addEventListener('crashed', () => {
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });

        webview.addEventListener('will-navigate', (event) => {
          if (event.url.includes('teams.microsoft.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        webview.addEventListener('new-window', (event) => {
          if (event.url.includes('teams.microsoft.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        // Timeout para verificar se a página carregou
        loadTimeout = setTimeout(() => {
          if (webview.getURL() === 'about:blank' || webview.getURL() === '') {
            if (loadAttempts < maxLoadAttempts) {
              loadAttempts++;
              webview.reload();
            }
          }
        }, 10000);

        // Monitorar mudanças de URL
        webview.addEventListener('did-navigate', (event) => {
          if (event.url.includes('teams.microsoft.com')) {
            clearTimeout(loadTimeout);
          }
        });

        // Monitorar erros de console
        webview.addEventListener('console-message', (event) => {
        });

        // Monitorar erros de renderização
        webview.addEventListener('render-process-gone', (event) => {
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });
      }
      // Configurações específicas para outras aplicações Microsoft (Outlook, Office, etc.)
      else if (url && (url.includes('outlook.office.com') || url.includes('office.com') || url.includes('portal.office.com'))) {
        webview.setAttribute('allowpopups', 'true');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no, webSecurity=no, allowRunningInsecureContent=yes, experimentalFeatures=yes, plugins=yes, webgl=yes');
        
        let loadAttempts = 0;
        const maxLoadAttempts = 3;
        let loadTimeout;

        // Eventos específicos para Microsoft Office
        webview.addEventListener('dom-ready', () => {
          webview.setZoomFactor(currentZoom);
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-start-loading', () => {
        });

        webview.addEventListener('did-finish-load', () => {
          loadAttempts = 0;
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {

          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              webview.reload();
            }, 2000 * loadAttempts);
          } else {
            // Mostrar mensagem de erro para o usuário
          }
        });

        webview.addEventListener('crashed', () => {
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });

        webview.addEventListener('will-navigate', (event) => {
          if (event.url.includes('office.com') || event.url.includes('microsoft.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        webview.addEventListener('new-window', (event) => {
          if (event.url.includes('office.com') || event.url.includes('microsoft.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        // Timeout para verificar se a página carregou
        loadTimeout = setTimeout(() => {
          if (webview.getURL() === 'about:blank' || webview.getURL() === '') {
            if (loadAttempts < maxLoadAttempts) {
              loadAttempts++;
              webview.reload();
            }
          }
        }, 10000);

        // Monitorar mudanças de URL
        webview.addEventListener('did-navigate', (event) => {
          if (event.url.includes('office.com') || event.url.includes('microsoft.com')) {
            clearTimeout(loadTimeout);
          }
        });

        // Monitorar erros de console
        webview.addEventListener('console-message', (event) => {
        });

        // Monitorar erros de renderização
        webview.addEventListener('render-process-gone', (event) => {
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });
      }
      // Configurações específicas para LinkedIn (mantendo o código existente)
      else if (url && url.includes('linkedin.com')) {
        webview.setAttribute('allowpopups', 'true');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no, webSecurity=no, allowRunningInsecureContent=yes');
        
        let loadAttempts = 0;
        const maxLoadAttempts = 3;
        let loadTimeout;

        // Eventos específicos para LinkedIn
        webview.addEventListener('dom-ready', () => {
          webview.setZoomFactor(currentZoom);
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-start-loading', () => {
        });

        webview.addEventListener('did-finish-load', () => {
          loadAttempts = 0;
          clearTimeout(loadTimeout);
        });

        webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {

          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              webview.reload();
            }, 2000 * loadAttempts); // Aumenta o tempo entre tentativas
          } else {
            // Mostrar mensagem de erro para o usuário
          }
        });

        webview.addEventListener('crashed', () => {
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });

        webview.addEventListener('will-navigate', (event) => {
          if (event.url.includes('linkedin.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        webview.addEventListener('new-window', (event) => {
          if (event.url.includes('linkedin.com')) {
            event.preventDefault();
            webview.loadURL(event.url);
          }
        });

        // Timeout para verificar se a página carregou
        loadTimeout = setTimeout(() => {
          if (webview.getURL() === 'about:blank' || webview.getURL() === '') {
            if (loadAttempts < maxLoadAttempts) {
              loadAttempts++;
              webview.reload();
            }
          }
        }, 10000);

        // Monitorar mudanças de URL
        webview.addEventListener('did-navigate', (event) => {
          if (event.url.includes('linkedin.com')) {
            clearTimeout(loadTimeout);
          }
        });

        // Monitorar erros de console
        webview.addEventListener('console-message', (event) => {
        });

        // Monitorar erros de renderização
        webview.addEventListener('render-process-gone', (event) => {
          if (loadAttempts < maxLoadAttempts) {
            loadAttempts++;
            setTimeout(() => {
              createWebview(webviewId, url);
            }, 2000 * loadAttempts);
          }
        });
      }
      // Configurações específicas para Slack
      else if (url && url.includes('slack.com')) {
        webview.setAttribute('allowpopups', 'true');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no, webSecurity=no, allowRunningInsecureContent=yes');

        // Abrir links de troca de workspace e links internos na própria webview
        webview.addEventListener('new-window', (event) => {
          const url = event.url;
          if (url.includes('slack.com') || url.includes('slack-edge.com')) {
            // Se for popup de login/troca de workspace, abrir em nova janela Electron
            if (url.includes('/signin') || url.includes('/ssb/redirect')) {
              event.preventDefault();
              window.electronAPI.send('open-popup-window', url);
            } else {
              // Links internos normais: abrir na própria webview
              event.preventDefault();
              webview.loadURL(url);
            }
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            event.preventDefault();
            window.electronAPI.send('open-external-link', url);
          }
        });
        webview.addEventListener('will-navigate', (event) => {
          const url = event.url;
          if (url.includes('slack.com') || url.includes('slack-edge.com')) {
            // Permitir navegação interna
            return;
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            event.preventDefault();
            window.electronAPI.send('open-external-link', url);
          }
        });
      }

      // Eventos comuns para todas as webviews
      webview.addEventListener('did-fail-load', (event, errorCode, errorDescription) => {
      });

      // Adicionar a webview ao container
      webviewContainer.appendChild(webview);
      return webview;
    } catch (error) {
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
        currentWebview = null;
        return;
      } else {
        window.electronAPI.send('hide-slack-view');
      }
      // --- Fim Slack ---

      // --- Teams como Webview ---
      // Não remover mais a webview do Teams do DOM ao trocar de aba
      // --- Fim Teams ---

      // Criar ou obter webview
      let webview = document.getElementById(webviewId);
      if (!webview) {
        webview = createWebview(webviewId, serviceMap[webviewId]);
      }

      if (webview) {
        webview.classList.add('active');
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
    }
  };

  const updateActiveViewTitle = (webview) => {
    // Remover todas as linhas que atualizam o texto do elemento #active-view-name
    // Exemplo:
    // titleElement.textContent = title;
    // titleElement.setAttribute('data-translate', title);
    // ... e similares em showWebview, updateActiveViewTitle, createWebview, etc.
  };

  // Funções para persistência da ordem dos botões
  function saveAppButtonOrder(order) {
    localStorage.setItem('appButtonOrder', JSON.stringify(order));
  }

  function getAppButtonOrder() {
    try {
      return JSON.parse(localStorage.getItem('appButtonOrder')) || [];
    } catch {
      return [];
    }
  }

  function applyAppButtonOrder(navSection) {
    const order = getAppButtonOrder();
    if (!order.length) return;
    // Seleciona todos os botões exceto o home e os desabilitados
    const buttons = Array.from(navSection.querySelectorAll('.nav-button:not(#home-button):not(.disabled-app)'));
    // Ordena os botões conforme o array salvo
    order.forEach(buttonId => {
      const btn = buttons.find(b => b.id === buttonId);
      if (btn) navSection.appendChild(btn);
    });
  }

  function updateAndSaveAppButtonOrder(navSection) {
    // Salva a ordem atual dos botões exceto o home e os desabilitados
    const order = Array.from(navSection.querySelectorAll('.nav-button:not(#home-button):not(.disabled-app)')).map(btn => btn.id);
    saveAppButtonOrder(order);
  }

  // Versão simplificada do setupAppButtonDragAndDrop para não interferir na ordenação
  const setupAppButtonDragAndDropSimple = (navSection) => {
    // Garante que todos os botões (exceto o Home) tenham draggable=true
    navSection.querySelectorAll('.nav-button:not(#home-button)').forEach(btn => {
      // Só permitir drag para apps ativos
      if (!btn.classList.contains('disabled-app')) {
        btn.setAttribute('draggable', 'true');
      } else {
        btn.setAttribute('draggable', 'false');
      }
      
      // Reatribui o listener de clique
      const appId = btn.getAttribute('data-id');
      const buttonId = btn.id;
      
      // Verificar se é um app ativo ou inativo
      if (!btn.classList.contains('disabled-app')) {
        btn.onclick = () => showWebview(appId, buttonId);
      } else {
        btn.onclick = () => showWebview('webview-settings', 'settings-button');
      }
    });
    
    // Reatribui o listener de clique ao botão home
    const homeButton = navSection.querySelector('#home-button');
    if (homeButton) {
      homeButton.onclick = () => showWebview('webview-home', 'home-button');
    }
  };

  function setupAppButtonDragAndDrop(navSection) {
    // Remove event listeners antigos (clonando o node)
    const newNavSection = navSection.cloneNode(true);
    navSection.parentNode.replaceChild(newNavSection, navSection);
    navSection = newNavSection;

    // Garante que todos os botões (exceto o Home) tenham draggable=true
    navSection.querySelectorAll('.nav-button:not(#home-button)').forEach(btn => {
      // Só permitir drag para apps ativos
      if (!btn.classList.contains('disabled-app')) {
        btn.setAttribute('draggable', 'true');
      } else {
        btn.setAttribute('draggable', 'false');
      }
      
      // Reatribui o listener de clique
      const appId = btn.getAttribute('data-id');
      const buttonId = btn.id;
      
      // Verificar se é um app ativo ou inativo
      if (!btn.classList.contains('disabled-app')) {
        btn.onclick = () => showWebview(appId, buttonId);
      } else {
        btn.onclick = () => showWebview('webview-settings', 'settings-button');
      }
    });
    // Reatribui o listener de clique ao botão home
    const homeButton = navSection.querySelector('#home-button');
    if (homeButton) {
      homeButton.onclick = () => showWebview('webview-home', 'home-button');
    }

    let dragged = null;
    let dragOverBtn = null;

    navSection.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('nav-button') && e.target.id !== 'home-button' && !e.target.classList.contains('disabled-app')) {
        dragged = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.id);
        setTimeout(() => e.target.classList.add('dragging'), 0);
      }
    });

    navSection.addEventListener('dragend', (e) => {
      if (dragged) dragged.classList.remove('dragging');
      if (dragOverBtn) dragOverBtn.classList.remove('drag-over');
      dragged = null;
      dragOverBtn = null;
    });

    navSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragged) return;
      const afterElement = getDragAfterElement(navSection, e.clientY);
      if (afterElement && afterElement !== dragged && afterElement.id !== 'home-button' && !afterElement.classList.contains('disabled-app')) {
        navSection.insertBefore(dragged, afterElement);
        if (dragOverBtn && dragOverBtn !== afterElement) dragOverBtn.classList.remove('drag-over');
        dragOverBtn = afterElement;
        dragOverBtn.classList.add('drag-over');
      } else if (!afterElement && dragged) {
        navSection.appendChild(dragged);
        if (dragOverBtn) dragOverBtn.classList.remove('drag-over');
        dragOverBtn = null;
      }
    });

    navSection.addEventListener('dragleave', (e) => {
      if (dragOverBtn) dragOverBtn.classList.remove('drag-over');
      dragOverBtn = null;
    });

    navSection.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragOverBtn) dragOverBtn.classList.remove('drag-over');
      // Remove .dragging de todos os botões antes de clonar
      navSection.querySelectorAll('.nav-button.dragging').forEach(btn => btn.classList.remove('dragging'));
      updateAndSaveAppButtonOrder(navSection);
      // Reaplica drag-and-drop para garantir que funcione após reordenação
      setTimeout(() => setupAppButtonDragAndDrop(navSection), 0);
    });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.nav-button:not(#home-button):not(.dragging):not(.disabled-app)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: -Infinity }).element;
  }

  const loadWithToken = async (token, userUuid) => {
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

    try {
      // Tentar usar dados pré-carregados primeiro
      let trialStatus = await window.electronAPI.getTrialStatus();
      let applications = await window.electronAPI.getUserApplications();
      
      // Se não houver dados pré-carregados, buscar da API
      if (!trialStatus) {
        trialStatus = await window.electronAPI.checkTrialStatus(userUuid);
      }
      
      if (!applications || applications.length === 0) {
        const response = await fetch(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        applications = data.data?.applications || [];
      }
      
      if (Array.isArray(applications)) {
        // Mostrar TODOS os aplicativos para todos os usuários
        const appsToShow = applications;
        
        // Ordenar aplicativos: ativos primeiro (de baixo para cima), depois inativos
        const sortedApps = appsToShow.sort((a, b) => {
          // Se ambos são ativos ou ambos são inativos, manter ordem original
          if (a.active === b.active) {
            return 0;
          }
          // Aplicativos ativos vêm primeiro (serão inseridos de baixo para cima)
          return a.active ? -1 : 1;
        });
        
        // Recupera ordem salva apenas para aplicativos ativos
        const savedOrder = getAppButtonOrder();
        
        // Separar aplicativos ativos e inativos
        const activeApps = sortedApps.filter(app => app.active);
        const inactiveApps = sortedApps.filter(app => !app.active);
        
        // Ordenar aplicativos ativos conforme ordem salva
        const orderedActiveApps = savedOrder.length
          ? activeApps.slice().sort((a, b) => {
              const aId = `${a.application.toLowerCase()}-button`;
              const bId = `${b.application.toLowerCase()}-button`;
              const aIdx = savedOrder.indexOf(aId);
              const bIdx = savedOrder.indexOf(bId);
              if (aIdx === -1 && bIdx === -1) return 0;
              if (aIdx === -1) return 1;
              if (bIdx === -1) return -1;
              return aIdx - bIdx;
            })
          : activeApps;
        
        // Combinar aplicativos ativos ordenados + inativos (ativos primeiro)
        const finalOrderedApps = [...orderedActiveApps, ...inactiveApps];
        
        finalOrderedApps.forEach(app => {
          const appId = `webview-${app.application.toLowerCase()}`;
          const buttonId = `${app.application.toLowerCase()}-button`;

          // Adicionar ao serviceMap apenas se estiver ativo
          if (app.active) {
            serviceMap[appId] = app.url;
            services[buttonId] = appId;
          }

          const button = createApplicationButton(app, trialStatus);
          if (app.active) {
            button.addEventListener('click', () => showWebview(appId, buttonId));
          } else {
            // Para apps inativos, redirecionar para settings
            button.addEventListener('click', () => {
              showWebview('webview-settings', 'settings-button');
            });
          }
          navSection?.appendChild(button);
        });
        // Remover a chamada que interfere na ordenação
        // applyAppButtonOrder(navSection);
        // Ativa drag-and-drop
        setupAppButtonDragAndDrop(navSection);
      }

      // Adicionar botão de trial no final do sidebar se for usuário free
      if (trialStatus.plan === 'free') {
        const trialButton = document.createElement('button');
        trialButton.id = 'trial-button';
        trialButton.className = 'nav-button trial-button';
        trialButton.title = trialStatus.isInTrial ? 'Trial Ativo' : 'Fazer Upgrade';
        trialButton.setAttribute('data-id', 'trial-button');
        
        // Definir ícone baseado no status do trial
        const icon = trialStatus.isInTrial ? 'fas fa-clock' : 'fas fa-crown';
        const color = trialStatus.isInTrial ? '#4ecdc4' : '#ff6b6b';
        
        trialButton.innerHTML = `<i class="${icon}" style="color: ${color}; font-size: 24px;"></i>`;
        
        trialButton.addEventListener('click', () => {
          // Abrir site de pagamentos
          window.electronAPI.openExternal('https://spaceapp-digital.com/pricing');
        });
        
        navSection?.appendChild(trialButton);
      }
    } catch (error) {
      // Silenciar erros de rede
    }
  };

  function createApplicationButton(app, trialStatus) {
    const button = document.createElement('button');
    const appId = `webview-${app.application.toLowerCase()}`;
    const buttonId = `${app.application.toLowerCase()}-button`;
    
    button.id = buttonId;
    button.className = 'nav-button';
    button.title = app.application;
    button.setAttribute('data-id', appId);
    button.setAttribute('draggable', 'true'); // Torna arrastável
    button.style.cursor = 'grab'; // Visual de arrasto

    // Se o app não estiver ativo, aplicar classe de desabilitado
    if (!app.active) {
      button.classList.add('disabled-app');
      // Remover o title/alt para aplicativos inativos
      button.removeAttribute('title');
    }

    const img = document.createElement('img');
    img.src = app.icon;
    img.alt = app.application;
    img.width = 24;
    img.height = 24;
    img.style.objectFit = 'contain';
    img.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    img.draggable = false; // Evita que o <img> capture o drag

    // Fallback para ícone local se o ícone da API não carregar
    img.onerror = () => {
      img.src = `../../assets/${app.application.toLowerCase()}.png`;
      img.width = 24;
      img.height = 24;
      img.style.objectFit = 'contain';
    };

    button.appendChild(img);

    // Remover a adição do ícone de coroa para apps inativos

    // Garante que dragstart funcione ao clicar na imagem
    img.addEventListener('mousedown', (e) => {
      // Redireciona o drag para o botão
      e.preventDefault();
      button.dispatchEvent(new MouseEvent('mousedown', e));
    });

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

  // Nova função para atualização suave das aplicações
  let isRefreshing = false; // Flag para evitar múltiplas chamadas simultâneas
  
  const smoothRefreshApplications = async () => {
    if (isRefreshing) {
      console.log('⏳ Atualização já em andamento, ignorando chamada...');
      return;
    }
    
    isRefreshing = true;
    console.log('🔄 Iniciando atualização suave das aplicações...');
    
    try {
      const token = await window.electronAPI.invoke('get-token');
      const userUuid = await window.electronAPI.invoke('get-userUuid');
      if (!token || !userUuid) {
        console.log('❌ Token ou userUuid não encontrados, usando fallback');
        refreshApplications();
        return;
      }

      const trialStatus = await window.electronAPI.checkTrialStatus(userUuid);
      
      const response = await fetch(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!Array.isArray(data.data.applications)) {
        console.log('❌ Dados de aplicações inválidos, usando fallback');
        refreshApplications();
        return;
      }

      console.log('✅ Dados obtidos com sucesso:', data.data.applications.length, 'aplicações');

      const applications = data.data.applications;
      const navSection = document.getElementById('nav-section');
      if (!navSection) {
        console.log('❌ Nav section não encontrada, usando fallback');
        refreshApplications();
        return;
      }

      // Ordenar aplicativos: ativos primeiro, depois inativos
      const sortedApps = applications.sort((a, b) => {
        if (a.active === b.active) {
          return 0;
        }
        return a.active ? -1 : 1;
      });
      
      // Recupera ordem salva apenas para aplicativos ativos
      const savedOrder = getAppButtonOrder();
      
      // Separar aplicativos ativos e inativos
      const activeApps = sortedApps.filter(app => app.active);
      const inactiveApps = sortedApps.filter(app => !app.active);
      
      console.log('📊 Aplicações ativas:', activeApps.length, '| Inativas:', inactiveApps.length);
      
      // Ordenar aplicativos ativos conforme ordem salva
      const orderedActiveApps = savedOrder.length
        ? activeApps.slice().sort((a, b) => {
            const aId = `${a.application.toLowerCase()}-button`;
            const bId = `${b.application.toLowerCase()}-button`;
            const aIdx = savedOrder.indexOf(aId);
            const bIdx = savedOrder.indexOf(bId);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          })
        : activeApps;
      
      // Combinar aplicativos ativos ordenados + inativos (ativos primeiro)
      const finalOrderedApps = [...orderedActiveApps, ...inactiveApps];

      // Salvar o botão ativo e opened antes de remover
      const prevActive = navSection.querySelector('.nav-button.active');
      const prevOpened = navSection.querySelector('.nav-button.opened');
      const prevActiveId = prevActive ? prevActive.id : null;
      const prevOpenedId = prevOpened ? prevOpened.id : null;

      // Remover todos os botões de aplicação (exceto home/trial) antes de inserir novamente
      navSection.querySelectorAll('.nav-button:not(#home-button):not(#trial-button)').forEach(btn => btn.remove());

      // Restaurar classe active/opened no botão home se necessário
      const homeButton = navSection.querySelector('#home-button');
      if (homeButton && homeButton.id === prevActiveId) homeButton.classList.add('active');
      if (homeButton && homeButton.id === prevOpenedId) homeButton.classList.add('opened');

      // Processar cada aplicação na ordem correta
      finalOrderedApps.forEach((app, index) => {
        const appId = `webview-${app.application.toLowerCase()}`;
        const buttonId = `${app.application.toLowerCase()}-button`;

        // Adicionar ao serviceMap apenas se estiver ativo
        if (app.active) {
          serviceMap[appId] = app.url;
          services[buttonId] = appId;
        }

        // Criar novo botão
        const button = createApplicationButton(app, trialStatus);
        if (app.active) {
          button.addEventListener('click', () => showWebview(appId, buttonId));
        } else {
          button.addEventListener('click', () => {
            showWebview('webview-settings', 'settings-button');
          });
        }
        // Restaurar classe active/opened se for o mesmo botão
        if (buttonId === prevActiveId) button.classList.add('active');
        if (buttonId === prevOpenedId) button.classList.add('opened');
        // Inserir na posição correta (antes do trial, se existir)
        const trialButton = navSection.querySelector('#trial-button');
        if (trialButton) {
          navSection.insertBefore(button, trialButton);
        } else {
          navSection.appendChild(button);
        }
      });

      // Reativar drag-and-drop
      setupAppButtonDragAndDrop(navSection);
      console.log('✅ Atualização suave concluída com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro na atualização suave:', error);
      console.log('🔄 Usando fallback (refreshApplications)...');
      refreshApplications();
    } finally {
      isRefreshing = false;
    }
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
  // Adaptação para considerar LinkedIn ativo mesmo sem webview
  const isWebviewActive = (webviewId) => {
    if (webviewId === 'webview-linkedin') {
      // Considera LinkedIn ativo se o botão está ativo
      const button = document.querySelector(`.nav-button[data-id="webview-linkedin"]`);
      return button && button.classList.contains('active');
    }
    if (webviewId === 'webview-slack') {
      // Considera Slack ativo se o botão está ativo
      const button = document.querySelector(`.nav-button[data-id="webview-slack"]`);
      return button && button.classList.contains('active');
    }
    if (webviewId === 'webview-teams') {
      // Considera Teams ativo se o botão está ativo
      const button = document.querySelector(`.nav-button[data-id="webview-teams"]`);
      return button && button.classList.contains('active');
    }
    const webview = document.getElementById(webviewId);
    return webview && (webview.classList.contains('active') || webview.classList.contains('opened'));
  };

  const showContextMenu = async (x, y, currentViewId) => {
    // Para BrowserView, sempre mostra o menu
    if (
      currentViewId === 'webview-linkedin' ||
      currentViewId === 'webview-slack' ||
      currentViewId === 'webview-teams'
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
          // Verificar também o Teams
          const teamsActive = document.querySelector('.nav-button[data-id="webview-teams"].active, .nav-button[data-id="webview-teams"].opened');
          // Verificar também os botões que estão marcados como abertos
          const hasOtherWebviews = Array.from(webviews).some(webview => {
            const isOther = webview.id !== 'webview-home' && webview.id !== 'webview-settings';
            const button = document.querySelector(`.nav-button[data-id="${webview.id}"]`);
            const isButtonOpened = button && button.classList.contains('opened');
            const isWebviewActive = webview.classList.contains('active') || webview.classList.contains('opened');
            return isOther && (isButtonOpened || isWebviewActive);
          });
          // Só mostrar o menu se houver outras webviews abertas OU LinkedIn ativo OU Slack ativo OU Teams ativo
          if (!hasOtherWebviews && !linkedInActive && !slackActive && !teamsActive) {
            return;
          }
        }

        // Verificar se o botão está ativo ou tem uma webview aberta
        const button = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
        const isButtonActive = button && (button.classList.contains('active') || button.classList.contains('opened'));
        const webview = document.getElementById(webviewId);
        const isWebviewActiveFlag = webview && (webview.classList.contains('active') || webview.classList.contains('opened'));

        // Permitir menu para LinkedIn ou Slack se botão estiver ativo
        if (isButtonActive || isWebviewActiveFlag || webviewId === 'webview-linkedin' || webviewId === 'webview-slack' || webviewId === 'webview-teams') {
          showContextMenu(e.clientX, e.clientY, webviewId);
        } 
      });
    }

    document.addEventListener('contextmenu', (e) => {
      // Permitir menu de contexto para LinkedIn ou Slack quando ativo
      const isLinkedInActive = document.querySelector('.nav-button[data-id="webview-linkedin"].active');
      const isSlackActive = document.querySelector('.nav-button[data-id="webview-slack"].active');
      const isTeamsActive = document.querySelector('.nav-button[data-id="webview-teams"].active');
      if (
        e.target.tagName === 'WEBVIEW' ||
        (isLinkedInActive && e.target.closest('.webview-wrapper')) ||
        (isSlackActive && e.target.closest('.webview-wrapper')) ||
        (isTeamsActive && e.target.closest('.webview-wrapper'))
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
        } else if (isTeamsActive) {
          webviewId = 'webview-teams';
        }
        const button = document.querySelector(`.nav-button[data-id="${webviewId}"]`);
        const isButtonOpened = button && button.classList.contains('opened');
        const isWebviewActiveFlag = e.target.classList.contains('active') || e.target.classList.contains('opened');
        if (isButtonOpened || isWebviewActiveFlag || webviewId === 'webview-linkedin' || webviewId === 'webview-slack' || webviewId === 'webview-teams') {
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
    console.log('📡 Evento reload-applications recebido!');
    smoothRefreshApplications();
  });

  // Teste manual temporário - remover depois
  window.testRefresh = () => {
    console.log('🧪 Teste manual de refresh iniciado');
    smoothRefreshApplications();
  };

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

  // Remover limpeza periódica de cache para melhor performance

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
    }
  };

  const setupProfileMenu = async () => {
    const profileButton = document.getElementById('profile-button');
    const profileMenu = document.getElementById('profile-menu');
    const profileSettings = document.getElementById('profile-settings');
    const profileLogout = document.getElementById('profile-logout');

    try {
      // Tentar usar dados pré-carregados primeiro
      let userData = await window.electronAPI.getUserInfo();
      
      // Se não houver dados pré-carregados, buscar da API
      if (!userData) {
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
            userData = await response.json();
          }
        }
      }

      if (userData) {
        const user = userData.data || userData;
        const firstName = user.name ? user.name.split(' ')[0] : 'Usuário';
        
        document.getElementById('profile-name').textContent = firstName;
        document.getElementById('profile-menu-name').textContent = user.name || 'Usuário';
        document.getElementById('profile-menu-email').textContent = user.email || 'usuario@email.com';
        
        // Atualizar avatares se houver
        let avatarSrc = '../../assets/avatarrobot.png';
        
        document.getElementById('profile-avatar').src = avatarSrc;
        document.getElementById('profile-menu-avatar').src = avatarSrc;

        // Salvar dados do usuário no localStorage
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      // Silenciar erros
    }

    // Toggle do menu
    profileButton?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const currentLanguage = await window.electronAPI.getLanguage();
      const t = window.translations?.[currentLanguage] || window.translations?.['pt-BR'] || {};
      document.querySelector('#profile-settings span').textContent = t['Configurações'] || 'Configurações';
      document.querySelector('#profile-logout span').textContent = t['Sair'] || 'Sair';
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
      const profileMenuWindow = window.electronAPI.send('show-profile-menu-window', { x, y, user });
      profileMenuWindow.webContents.send('set-language', currentLanguage);
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

  // Adicionar traduções para trial
  const trialTranslations = {
    'pt-BR': {
      'trial_expired_notification': 'Seu período de trial expirou. Apenas 3 aplicações podem estar ativas no plano gratuito.'
    },
    'en-US': {
      'trial_expired_notification': 'Your trial period has expired. Only 3 applications can be active in the free plan.'
    }
  };

  // Adicionar listener para mudanças no idioma
  window.electronAPI.onLanguageChanged((language) => {
    document.documentElement.lang = language;
    translatePage(language);
  });

  // Adicionar listener para comandos do menu de contexto nativo
  window.electronAPI.on('context-menu-command', async (event, data) => {
    const { command, currentViewId, x, y } = data || {};
    if (typeof x === 'number' && typeof y === 'number' && (currentViewId === 'webview-linkedin' || currentViewId === 'webview-slack' || currentViewId === 'webview-teams')) {
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
        // Também destruir o BrowserView do Slack se estiver ativo
        const slackBtn = document.querySelector('.nav-button[data-id="webview-slack"].active, .nav-button[data-id="webview-slack"].opened');
        if (slackBtn) {
          window.electronAPI.send('destroy-slack-view');
          slackBtn.classList.remove('active', 'opened');
        }
        // Também destruir o BrowserView do Teams se estiver ativo
        const teamsBtn = document.querySelector('.nav-button[data-id="webview-teams"].active, .nav-button[data-id="webview-teams"].opened');
        if (teamsBtn) {
          window.electronAPI.send('destroy-teams-view');
          teamsBtn.classList.remove('active', 'opened');
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
          // Também destruir o BrowserView do Teams se estiver ativo
          const teamsBtn = document.querySelector('.nav-button[data-id="webview-teams"].active, .nav-button[data-id="webview-teams"].opened');
          if (teamsBtn) {
            window.electronAPI.send('destroy-teams-view');
            teamsBtn.classList.remove('active', 'opened');
          }
          document.querySelectorAll('.nav-button').forEach(b => {
            if (b.id !== 'home-button') {
              b.classList.remove('opened');
            }
          });
          if (currentWebview && currentWebview.id !== 'webview-home') {
            currentWebview = null;
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
        } else if (currentViewId === 'webview-teams') {
          window.electronAPI.send('reload-teams-view');
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
        } else if (currentViewId === 'webview-teams') {
          const button = document.querySelector(`.nav-button[data-id="webview-teams"]`);
          if (button) button.classList.remove('opened', 'active');
          window.electronAPI.send('destroy-teams-view');
          // Remover o elemento webview do Teams do DOM
          const teamsWebview = document.getElementById('webview-teams');
          if (teamsWebview) teamsWebview.remove();
          document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
          const homeButton = document.getElementById('home-button');
          if (homeButton) {
            homeButton.classList.add('active');
          }
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

  // Listener para logout automático quando trial expirar
  window.electronAPI.onForceLogout((data) => {
    const { reason, message } = data;
    
    // Mostrar notificação de logout
    const notification = document.createElement('div');
    notification.className = 'trial-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Aguardar 3 segundos e então fazer logout
    setTimeout(async () => {
      try {
        await window.electronAPI.forceLogout();
      } catch (error) {
        console.error('Erro ao fazer logout automático:', error);
      }
    }, 3000);
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
        }
      });
    }
  });

  // Inicialização
  const init = async () => {
    try {
      // (Removido localStorage.removeItem('user'); para não afetar o carregamento)
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
    }
  };

  init();
});

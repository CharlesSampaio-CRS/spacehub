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

  // Ajustar o container principal
  const webviewContainer = document.querySelector('.webview-container');
  if (webviewContainer) {
    webviewContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;
  }

  const webviewWrapper = document.querySelector('.webview-wrapper');
  if (webviewWrapper) {
    webviewWrapper.style.cssText = `
      position: absolute;
      top: 60px;
      left: 80px;
      right: 0;
      bottom: 0;
      overflow: hidden;
      background-color: transparent;
      width: calc(100% - 80px);
      height: calc(100% - 60px);
    `;
  }

  // Ajustar z-index para cabeçalho e barra lateral
  const headerElement = document.getElementById('header');
  if (headerElement) {
    headerElement.style.position = 'relative';
    headerElement.style.zIndex = '1001'; /* Maior que o z-index das webviews */
  }

  const sidebarElement = document.getElementById('sidebar');
  if (sidebarElement) {
    sidebarElement.style.position = 'relative';
    sidebarElement.style.zIndex = '1001'; /* Maior que o z-index das webviews */
  }

  // Adicionar variável global para controlar a janela do LinkedIn
  let linkedInWindowInstance = null;

  const createLinkedInWindow = async (webviewId, wrapperBounds) => {
    try {
      console.log('Iniciando criação da janela do LinkedIn...');
      
      // Verificar se já existe uma instância ativa
      if (linkedInWindowInstance && linkedInWindowInstance.container) {
        console.log('Janela do LinkedIn já existe, reutilizando...');
        const container = linkedInWindowInstance.container;
        
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
        container.style.display = 'flex';
        container.style.opacity = '1';
        return linkedInWindowInstance;
      }

      // Remover qualquer container existente do LinkedIn antes de criar um novo
      document.querySelectorAll('.linkedin-window-container').forEach(container => {
        if (container !== linkedInWindowInstance?.container) {
          console.log('Removendo container antigo do LinkedIn...');
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

      // Obter as dimensões do webview-container
      const webviewContainer = document.querySelector('.webview-container');
      const containerBounds = webviewContainer ? webviewContainer.getBoundingClientRect().toJSON() : wrapperBounds;

      // Ajustar as dimensões para respeitar header, sidebar e margens
      const adjustedBounds = {
        ...containerBounds,
        top: headerHeight + headerMargin,
        left: sidebarWidth,
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight - (headerHeight + headerMargin + bottomMargin)
      };

      // Criar uma janela filha que se integra com a área de conteúdo
      const windowData = {
        type: 'linkedin-auth',
        parent: webviewId,
        url: 'https://www.linkedin.com/login',
        options: {
          width: adjustedBounds.width,
          height: adjustedBounds.height,
          modal: false,
          frame: false,
          transparent: true,
          backgroundColor: '#ffffff',
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
          }
        }
      };

      console.log('Solicitando criação da janela do LinkedIn...');
      console.log('adjustedBounds:', adjustedBounds);
      const linkedInWindow = await window.electronAPI.invoke('create-linkedin-window', windowData, adjustedBounds);
      
      if (linkedInWindow) {
        console.log('Janela do LinkedIn criada com sucesso:', linkedInWindow.id);
        
        // Criar um container para a janela
        const container = document.createElement('div');
        container.id = `${webviewId}-container`;
        container.className = 'linkedin-window-container webview';
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
        if (webviewContainer) {
          console.log('Adicionando container do LinkedIn ao DOM...');
          webviewContainer.appendChild(container);
          
          // Garantir que o container esteja visível
          container.style.display = 'flex';
          container.style.opacity = '1';

          // Adicionar listener para redimensionamento da janela
          window.addEventListener('resize', () => {
            const newHeaderHeight = header ? header.offsetHeight : 60;
            const newSidebarWidth = sidebar ? sidebar.offsetWidth : 80;
            
            container.style.top = `${newHeaderHeight + headerMargin}px`;
            container.style.left = `${newSidebarWidth}px`;
            container.style.width = `calc(100% - ${newSidebarWidth}px)`;
            container.style.height = `calc(100% - ${newHeaderHeight + headerMargin + bottomMargin}px)`;

            // Atualizar a janela do LinkedIn com as novas dimensões
            if (linkedInWindowInstance && linkedInWindowInstance.id) {
              const newBounds = {
                x: newSidebarWidth,
                y: newHeaderHeight + headerMargin,
                width: window.innerWidth - newSidebarWidth,
                height: window.innerHeight - (newHeaderHeight + headerMargin + bottomMargin)
              };
              window.electronAPI.invoke('update-linkedin-window-bounds', linkedInWindowInstance.id, newBounds);
            }
          });
        } else {
          console.error('Container da webview não encontrado');
          return null;
        }

        // Criar e armazenar a instância da janela
        const windowInstance = {
          id: linkedInWindow.id,
          container: container,
          addEventListener: (event, callback) => {
            if (event === 'dom-ready') {
              window.electronAPI.on('linkedin-window-ready', (data) => {
                if (data.windowId === linkedInWindow.id) {
                  callback();
                }
              });
            }
          },
          remove: () => {
            console.log('Removendo janela do LinkedIn (instância):', linkedInWindow.id);
            container.style.opacity = '0';
            setTimeout(() => {
              window.electronAPI.invoke('close-linkedin-window', linkedInWindow.id);
              container.remove();
              linkedInWindowInstance = null;
            }, 200);
          },
          reload: () => {
            console.log('Recarregando janela do LinkedIn (instância):', linkedInWindow.id);
            window.electronAPI.invoke('reload-linkedin-window', linkedInWindow.id);
          }
        };

        // Armazenar a instância globalmente
        linkedInWindowInstance = windowInstance;
        console.log('Instância da janela do LinkedIn armazenada');
        return windowInstance;
      }
      console.error('Falha ao criar janela do LinkedIn');
      return null;
    } catch (error) {
      console.error('Erro ao criar janela do LinkedIn:', error);
      return null;
    }
  };

  const createWebview = (webviewId, url) => {
    try {
      // Se for LinkedIn, usar a janela simulada
      if (url && url.includes('linkedin.com')) {
        return createLinkedInWindow(webviewId);
      }

      // Para outras webviews, esconder a janela do LinkedIn se existir
      if (linkedInWindowInstance && linkedInWindowInstance.container) {
        linkedInWindowInstance.container.style.opacity = '0';
        setTimeout(() => {
          linkedInWindowInstance.container.style.display = 'none';
        }, 200);
      }

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
      // Configurações específicas para LinkedIn
      else if (url && url.includes('linkedin.com')) {
        console.log('Configurando webview do LinkedIn...');
        webview.setAttribute('allowpopups', 'false');
        webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        // Atualizar configurações de segurança
        const securePreferences = [
          'contextIsolation=yes',
          'nodeIntegration=no',
          'webSecurity=yes',
          'allowRunningInsecureContent=no',
          'enableRemoteModule=no',
          'sandbox=yes',
          'javascript=yes',
          'plugins=yes',
          'webgl=yes',
          'backgroundThrottling=no'
        ].join(', ');
        
        webview.setAttribute('webpreferences', securePreferences);
        
        // Configurar headers via preload script
        webview.setAttribute('preload', '../../preload-linkedin.js');
        
        let loadAttempts = 0;
        const maxLoadAttempts = 3;
        let loadTimeout;
        let isWebviewReady = false;

        // Função para limpar cache de forma segura
        const clearWebviewCache = async () => {
          try {
            if (isWebviewReady && webview) {
              // Limpar cache usando a API do webview
              await webview.executeJavaScript(`
                if (window.caches) {
                  caches.keys().then(function(names) {
                    for (let name of names) {
                      caches.delete(name);
                    }
                  });
                }
                // Limpar localStorage e sessionStorage
                localStorage.clear();
                sessionStorage.clear();
                // Limpar cookies
                document.cookie.split(";").forEach(function(c) { 
                  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
              `);
              console.log('Cache limpo com sucesso');
            }
          } catch (error) {
            console.error('Erro ao limpar cache:', error);
          }
        };

        // Eventos específicos para LinkedIn
        webview.addEventListener('dom-ready', () => {
          console.log('LinkedIn webview DOM ready');
          isWebviewReady = true;
          webview.setZoomFactor(currentZoom);
          clearTimeout(loadTimeout);

          // Limpar cache quando o webview estiver pronto
          if (loadAttempts === 0) {
            clearWebviewCache();
          }

          // Injetar script para desabilitar login social e configurar a página
          webview.executeJavaScript(`
            // Remover botões de login social e forçar login direto
            const removeSocialLogin = () => {
              // Remover botões de login com Google e Microsoft
              const socialButtons = document.querySelectorAll('button[data-id*="google"], button[data-id*="microsoft"], .social-login-button, .social-login-container');
              socialButtons.forEach(button => {
                if (button && button.parentNode) {
                  button.parentNode.removeChild(button);
                }
              });

              // Remover links de login social
              const socialLinks = document.querySelectorAll('a[href*="google"], a[href*="microsoft"], .social-login-link');
              socialLinks.forEach(link => {
                if (link && link.parentNode) {
                  link.parentNode.removeChild(link);
                }
              });

              // Esconder seções de login social
              const socialSections = document.querySelectorAll('.social-login-section, .social-login-divider');
              socialSections.forEach(section => {
                if (section && section.parentNode) {
                  section.parentNode.removeChild(section);
                }
              });
            };

            // Executar imediatamente e observar mudanças no DOM
            removeSocialLogin();

            // Observar mudanças no DOM para remover novos elementos de login social
            const observer = new MutationObserver((mutations) => {
              mutations.forEach(() => {
                removeSocialLogin();
              });
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true
            });

            // Adicionar meta tag CSP restritiva
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = "default-src 'self' https://*.linkedin.com https://*.licdn.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                           "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.linkedin.com https://*.licdn.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                           "style-src 'self' 'unsafe-inline' https://*.linkedin.com https://*.licdn.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                           "img-src 'self' data: https://*.linkedin.com https://*.licdn.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                           "connect-src 'self' https://*.linkedin.com https://*.licdn.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                           "frame-src 'self' https://*.linkedin.com https://*.google.com https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                           "font-src 'self' data: https://*.linkedin.com https://*.google.com https://*.gstatic.com https://*.microsoft.com;";
            document.head.appendChild(meta);

            // Verificar se estamos em uma página de erro
            const isErrorPage = document.body.textContent.includes("Page not found") || 
                               document.body.textContent.includes("Uh oh") ||
                               document.body.textContent.includes("can't seem to find the page");
            
            if (isErrorPage) {
              console.log('Detectada página de erro do LinkedIn');
              // Tentar redirecionar para a página inicial do LinkedIn
              if (!window.location.href.includes('linkedin.com/feed')) {
                window.location.href = 'https://www.linkedin.com/feed/';
              }
            }

            // Monitorar mudanças na URL
            const originalPushState = history.pushState;
            history.pushState = function() {
              originalPushState.apply(this, arguments);
              // Verificar se a nova URL é válida e remover login social se necessário
              if (window.location.href.includes('linkedin.com')) {
                console.log('LinkedIn navigation to:', window.location.href);
                setTimeout(removeSocialLogin, 100); // Pequeno delay para garantir que o DOM foi atualizado
              }
            };

            // Adicionar botão de retorno para feed se estiver em página de erro
            if (isErrorPage) {
              const feedButton = document.createElement('button');
              feedButton.textContent = 'Go to your feed';
              feedButton.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #0a66c2; color: white; border: none; border-radius: 4px; cursor: pointer; z-index: 9999;';
              feedButton.onclick = () => window.location.href = 'https://www.linkedin.com/feed/';
              document.body.appendChild(feedButton);
            }
          `).catch(error => {
            console.error('Erro ao executar script no webview:', error);
          });
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
      
      // Obter as dimensões do webview-container para a janela do LinkedIn
      const webviewContainer = document.querySelector('.webview-container');
      let containerBounds = null;
      if (webviewContainer) {
        containerBounds = webviewContainer.getBoundingClientRect().toJSON();
        // Ajustar as dimensões para respeitar header, sidebar e margens
        containerBounds = {
          ...containerBounds,
          top: headerHeight + headerMargin,
          left: sidebarWidth,
          width: window.innerWidth - sidebarWidth,
          height: window.innerHeight - (headerHeight + headerMargin + bottomMargin)
        };
        console.log('Dimensões ajustadas do webview-container:', containerBounds);
      }
      
      // Primeiro, esconder todas as webviews e remover classes active
      document.querySelectorAll('.webview, .linkedin-window-container').forEach(w => {
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

      // Verificar se é LinkedIn
      const url = serviceMap[webviewId];
      if (url && url.includes('linkedin.com')) {
        console.log('Iniciando exibição do LinkedIn...');
        
        // Se já existe uma janela do LinkedIn, apenas reutilizá-la
        if (linkedInWindowInstance && linkedInWindowInstance.container) {
          console.log('Reutilizando janela do LinkedIn existente...');
          const container = linkedInWindowInstance.container;
          
          // Remover qualquer container duplicado que possa existir
          document.querySelectorAll('.linkedin-window-container').forEach(existingContainer => {
            if (existingContainer !== container) {
              existingContainer.remove();
            }
          });
          
          container.style.display = 'flex';
          container.style.opacity = '1';
          container.classList.add('active');
          currentWebview = linkedInWindowInstance;
          
          // Forçar a exibição da janela
          window.electronAPI.invoke('show-linkedin-window', linkedInWindowInstance.id, containerBounds).then(() => {
            console.log('Janela do LinkedIn exibida com sucesso');
          }).catch(error => {
            console.error('Erro ao exibir janela do LinkedIn:', error);
          });
        } else {
          // Se não existe, criar uma nova janela
          console.log('Criando nova janela do LinkedIn...');
          // Remover qualquer container existente antes de criar um novo
          document.querySelectorAll('.linkedin-window-container').forEach(container => container.remove());
          createNewLinkedInWindow(webviewId, containerBounds);
        }
      } else {
        // Para outras webviews, esconder o LinkedIn completamente
        if (linkedInWindowInstance && linkedInWindowInstance.container) {
          console.log('Escondendo janela do LinkedIn...');
          linkedInWindowInstance.container.style.display = 'none';
          linkedInWindowInstance.container.style.opacity = '0';
          linkedInWindowInstance.container.classList.remove('active');
          
          window.electronAPI.invoke('hide-linkedin-window', linkedInWindowInstance.id).then(() => {
            console.log('Janela do LinkedIn ocultada com sucesso');
          }).catch(error => {
            console.error('Erro ao ocultar janela do LinkedIn:', error);
          });
        }

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

  // Função auxiliar para criar nova janela do LinkedIn
  const createNewLinkedInWindow = async (webviewId, wrapperBounds) => {
    try {
      // Se já existe uma instância, não criar outra
      if (linkedInWindowInstance && linkedInWindowInstance.container) {
        console.log('Janela do LinkedIn já existe, reutilizando...');
        return linkedInWindowInstance;
      }

      // Remover qualquer container existente do LinkedIn
      document.querySelectorAll('.linkedin-window-container').forEach(container => container.remove());

      // Criar nova janela
      const webview = await createLinkedInWindow(webviewId, wrapperBounds);
      if (webview) {
        webview.container.classList.add('active');
        currentWebview = webview;
        
        // Forçar a exibição da janela
        window.electronAPI.invoke('show-linkedin-window', webview.id, wrapperBounds).then(() => {
          console.log('Nova janela do LinkedIn exibida com sucesso');
        }).catch(error => {
          console.error('Erro ao exibir nova janela do LinkedIn:', error);
        });
      }
    } catch (error) {
      console.error('Erro ao criar nova janela do LinkedIn:', error);
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
    if (titleElement) {
      titleElement.textContent = title;
      titleElement.setAttribute('data-translate', title);

      // Traduzir o título imediatamente
      const currentLanguage = document.documentElement.lang;
      if (translations[currentLanguage] && translations[currentLanguage][title]) {
        titleElement.textContent = translations[currentLanguage][title];
      }
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
    const rect = document.body.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 100;
    
    // Considerar o offset da sidebar (80px) e do header (60px)
    const sidebarWidth = 80;
    const headerHeight = 60;
    
    // Ajustar as coordenadas para considerar o offset
    let posX = x;
    let posY = y;
    
    // Garantir que o menu não ultrapasse os limites da área de conteúdo
    posX = Math.min(Math.max(posX, sidebarWidth), rect.width - menuWidth - 10);
    posY = Math.min(Math.max(posY, headerHeight), rect.height - menuHeight - 10);
    
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
  };

  const showContextMenu = async (x, y, currentViewId) => {
    if (!currentViewId) {
      console.log('No currentViewId provided');
      return;
    }

    const isLinkedIn = currentViewId.includes('linkedin');
    const isActive = isLinkedIn ? 
      (linkedInWindowInstance && linkedInWindowInstance.container && linkedInWindowInstance.container.classList.contains('active')) :
      isWebviewActive(currentViewId);

    console.log('showContextMenu called:', {
      currentViewId,
      isLinkedIn,
      isActive,
      linkedInInstance: linkedInWindowInstance
    });

    if (!isActive) {
      console.log('Context menu not shown because webview is not active');
      return;
    }

    // Remover menu existente se houver
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Criar novo menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = await getMenuTemplate(currentViewId);
    
    // Posicionar o menu
    setupMenuPosition(menu, x, y);
    document.body.appendChild(menu);

    // Configurar eventos do menu
    setupMenuEvents(menu, currentViewId);

    // Adicionar evento de clique para fechar o menu quando clicar fora
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };

    // Adicionar o listener com um pequeno delay para evitar que o menu feche imediatamente
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  };

  // Context Menu e comunicação com main process
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

        // Verificar se é o botão do LinkedIn
        const isLinkedInButton = webviewId.includes('linkedin');
        const isButtonActive = target.classList.contains('active') || target.classList.contains('opened');
        
        // Se for o botão do LinkedIn, verificar se a janela está ativa
        const isLinkedInActive = isLinkedInButton ? 
          (linkedInWindowInstance && linkedInWindowInstance.container && linkedInWindowInstance.container.classList.contains('active')) :
          false;

        // Se for o botão do LinkedIn e a janela estiver ativa, ou se for outro botão ativo
        if ((isLinkedInButton && isLinkedInActive) || (!isLinkedInButton && isButtonActive)) {
          console.log('Mostrando menu de contexto para:', webviewId, 'isLinkedIn:', isLinkedInButton);
          showContextMenu(e.clientX, e.clientY, webviewId);
        }
      });
    }

    // Adicionar evento de contexto para a janela do LinkedIn
    document.addEventListener('contextmenu', (e) => {
      const linkedInContainer = e.target.closest('.linkedin-window-container');
      if (linkedInContainer && linkedInContainer.classList.contains('active')) {
        e.preventDefault();
        e.stopPropagation();
        
        const webviewId = linkedInContainer.id.replace('-container', '');
        console.log('Context menu on LinkedIn container:', webviewId, linkedInWindowInstance);
        if (webviewId && linkedInWindowInstance && linkedInWindowInstance.container === linkedInContainer) {
          showContextMenu(e.clientX, e.clientY, webviewId);
        }
      }
    });

    // Adicionar evento de contexto para webviews normais
    document.addEventListener('contextmenu', (e) => {
      const webview = e.target.closest('webview');
      if (webview && webview.classList.contains('active')) {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, webview.id);
      }
    });
  };

  const setupMenuEvents = (menu, currentViewId) => {
    console.log('Setting up menu events for:', currentViewId);
    
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const command = item.getAttribute('data-command');
        console.log('Menu item clicked:', command, 'currentViewId:', currentViewId);
        
        menu.remove();

        const isLinkedIn = currentViewId.includes('linkedin');
        const isHome = currentViewId === 'webview-home';
        console.log('Menu context:', { isLinkedIn, isHome, currentViewId, linkedInInstance: linkedInWindowInstance });

        switch (command) {
          case 'reload-current':
            if (isLinkedIn) {
              // Recarregar apenas a janela do LinkedIn
              if (linkedInWindowInstance && linkedInWindowInstance.id) {
                console.log('Recarregando janela do LinkedIn...', linkedInWindowInstance.id);
                try {
                  // Primeiro esconder com animação
                  if (linkedInWindowInstance.container) {
                    linkedInWindowInstance.container.style.opacity = '0';
                  }
                  
                  // Recarregar a janela
                  await window.electronAPI.invoke('reload-linkedin-window', linkedInWindowInstance.id);
                  console.log('Comando de recarregar LinkedIn enviado');
                  
                  // Mostrar novamente após um pequeno delay
                  setTimeout(() => {
                    if (linkedInWindowInstance && linkedInWindowInstance.container) {
                      linkedInWindowInstance.container.style.opacity = '1';
                    }
                  }, 200);
                } catch (error) {
                  console.error('Erro ao recarregar LinkedIn:', error);
                  if (linkedInWindowInstance && linkedInWindowInstance.container) {
                    linkedInWindowInstance.container.style.opacity = '1';
                  }
                }
              } else {
                console.log('LinkedIn não está ativo para recarregar');
              }
            } else {
              // Recarregar webview normal
              const webview = document.getElementById(currentViewId);
              if (webview && isWebviewActive(currentViewId)) {
                console.log('Recarregando webview:', currentViewId);
                webview.reload();
              }
            }
            break;

          case 'close-current':
            if (isLinkedIn) {
              // Fechar apenas a janela do LinkedIn
              if (linkedInWindowInstance && linkedInWindowInstance.id) {
                console.log('Fechando janela do LinkedIn...', linkedInWindowInstance.id);
                try {
                  // Primeiro esconder com animação
                  if (linkedInWindowInstance.container) {
                    linkedInWindowInstance.container.style.opacity = '0';
                  }
                  
                  // Fechar a janela do Electron
                  await window.electronAPI.invoke('close-linkedin-window', linkedInWindowInstance.id);
                  console.log('Comando de fechar LinkedIn enviado');
                  
                  // Limpar recursos após um pequeno delay
                  setTimeout(() => {
                    // Remover o container se ainda existir
                    if (linkedInWindowInstance && linkedInWindowInstance.container) {
                      linkedInWindowInstance.container.remove();
                    }
                    
                    // Limpar a instância
                    const oldInstance = linkedInWindowInstance;
                    linkedInWindowInstance = null;
                    
                    // Atualizar estado do botão
                    const button = document.querySelector(`.nav-button[data-id*="linkedin"]`);
                    if (button) {
                      button.classList.remove('opened', 'active');
                    }
                    
                    // Mostrar home se não houver outras webviews ativas
                    if (!hasOpenWebviews()) {
                      showWebview('webview-home', 'home-button');
                    }
                    
                    console.log('LinkedIn fechado e recursos limpos');
                  }, 200);
                } catch (error) {
                  console.error('Erro ao fechar LinkedIn:', error);
                  // Mesmo com erro, tentar limpar recursos
                  if (linkedInWindowInstance && linkedInWindowInstance.container) {
                    linkedInWindowInstance.container.remove();
                  }
                  linkedInWindowInstance = null;
                  
                  // Atualizar estado do botão mesmo em caso de erro
                  const button = document.querySelector(`.nav-button[data-id*="linkedin"]`);
                  if (button) {
                    button.classList.remove('opened', 'active');
                  }
                  
                  if (!hasOpenWebviews()) {
                    showWebview('webview-home', 'home-button');
                  }
                }
              } else {
                console.log('LinkedIn não está ativo para fechar');
              }
            } else {
              // Fechar webview normal
              const webview = document.getElementById(currentViewId);
              if (webview && isWebviewActive(currentViewId)) {
                console.log('Fechando webview:', currentViewId);
                webview.style.opacity = '0';
                
                setTimeout(() => {
                  // Atualizar estado do botão
                  const button = document.querySelector(`.nav-button[data-id="${currentViewId}"]`);
                  if (button) {
                    button.classList.remove('opened', 'active');
                  }
                  
                  // Remover webview
                  webview.remove();
                  
                  // Mostrar home se não houver outras webviews ativas
                  if (!hasOpenWebviews()) {
                    showWebview('webview-home', 'home-button');
                  }
                }, 200);
              }
            }
            break;

          case 'reload-all':
            console.log('Recarregando todas as webviews...');
            
            // Recarregar todas as webviews normais ativas
            document.querySelectorAll('webview').forEach(webview => {
              if (webview.id !== 'webview-home' && 
                  (webview.classList.contains('active') || webview.classList.contains('opened'))) {
                console.log('Recarregando webview:', webview.id);
                webview.reload();
              }
            });

            // Recarregar LinkedIn se estiver ativo
            if (linkedInWindowInstance && linkedInWindowInstance.container) {
              console.log('Recarregando LinkedIn...');
              try {
                linkedInWindowInstance.container.style.opacity = '0';
                await window.electronAPI.invoke('reload-linkedin-window', linkedInWindowInstance.id);
                setTimeout(() => {
                  linkedInWindowInstance.container.style.opacity = '1';
                }, 200);
              } catch (error) {
                console.error('Erro ao recarregar LinkedIn:', error);
                linkedInWindowInstance.container.style.opacity = '1';
              }
            }
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
                // Fechar todas as webviews normais
                document.querySelectorAll('webview').forEach(webview => {
                  if (webview.id !== 'webview-home' && 
                      (webview.classList.contains('active') || webview.classList.contains('opened'))) {
                    console.log('Fechando webview:', webview.id);
                    webview.style.opacity = '0';
                    
                    setTimeout(() => {
                      // Atualizar estado do botão
                      const button = document.querySelector(`.nav-button[data-id="${webview.id}"]`);
                      if (button) {
                        button.classList.remove('opened', 'active');
                      }
                      webview.remove();
                    }, 200);
                  }
                });

                // Fechar LinkedIn se estiver ativo
                if (linkedInWindowInstance && linkedInWindowInstance.id) {
                  console.log('Fechando LinkedIn...');
                  if (linkedInWindowInstance.container) {
                    linkedInWindowInstance.container.style.opacity = '0';
                  }
                  
                  await window.electronAPI.invoke('close-linkedin-window', linkedInWindowInstance.id);
                  console.log('Comando de fechar LinkedIn enviado');
                  
                  setTimeout(() => {
                    if (linkedInWindowInstance && linkedInWindowInstance.container) {
                      linkedInWindowInstance.container.remove();
                    }
                    linkedInWindowInstance = null;
                    
                    // Atualizar estado do botão do LinkedIn
                    const linkedInButton = document.querySelector(`.nav-button[data-id*="linkedin"]`);
                    if (linkedInButton) {
                      linkedInButton.classList.remove('opened', 'active');
                    }
                  }, 200);
                }

                // Atualizar todos os botões
                document.querySelectorAll('.nav-button').forEach(button => {
                  if (button.id !== 'home-button') {
                    button.classList.remove('opened', 'active');
                  }
                });

                // Limpar webview atual e mostrar home
                currentWebview = null;
                document.getElementById('active-view-name').textContent = '';
                showWebview('webview-home', 'home-button');
              } catch (error) {
                console.error('Erro ao fechar todas as janelas:', error);
                // Limpar tudo mesmo em caso de erro
                if (linkedInWindowInstance && linkedInWindowInstance.container) {
                  linkedInWindowInstance.container.remove();
                }
                linkedInWindowInstance = null;
                showWebview('webview-home', 'home-button');
              }
            });
            break;
        }
      });
    });
  };

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

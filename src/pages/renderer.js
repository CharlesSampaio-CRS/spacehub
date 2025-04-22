const { ipcRenderer } = require('electron');

let webview = null;
let currentSite = 'home';

document.addEventListener('DOMContentLoaded', () => {
    initializeWebview();
    setupNavigationButtons();
    displayAppVersion();
});

// Inicializa o Webview, criando um novo se necessário
function initializeWebview() {
    webview = document.getElementById('webview');
    if (!webview) createWebView();
    setupWebView();
}

// Cria e configura o Webview
function createWebView() {
    const container = document.getElementById('content-container');
    if (!container) return;

    webview = document.createElement('webview');
    webview.id = 'webview';
    webview.classList.add('w-full', 'h-full');
    webview.setAttribute('allowpopups', 'false');
    webview.setAttribute('webpreferences', 'contextIsolation=false, nodeIntegration=false, nativeWindowOpen=false');
    container.innerHTML = '';
    container.appendChild(webview);
    setupWebView();
}

// Configura os eventos do Webview
function setupWebView() {
    if (!webview) return;

    // Eventos de carregamento
    webview.addEventListener('did-start-loading', toggleLoadingIndicator(true));
    webview.addEventListener('did-finish-load', toggleLoadingIndicator(false));
    webview.addEventListener('did-fail-load', handleWebviewError);
    
    // Eventos de navegação
    webview.addEventListener('new-window', handleNewWindow);

    // Injetar script para capturar cliques em links externos
    webview.addEventListener('dom-ready', injectJavaScript);
    
    // Manipulador para mensagens IPC
    webview.addEventListener('ipc-message', handleLinkClick);
}

// Exibe ou oculta o indicador de carregamento
function toggleLoadingIndicator(isLoading) {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.classList.toggle('hidden', !isLoading);
    }
}

// Lida com erros de carregamento do Webview
function handleWebviewError(event) {
    console.error('Erro ao carregar página:', event);
    toggleLoadingIndicator(false);
    displayErrorMessage(`Erro ao carregar: ${event.errorDescription || 'Falha no carregamento'}`);
}

// Exibe a mensagem de erro
function displayErrorMessage(message) {
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    if (errorContainer && errorMessage) {
        errorContainer.classList.remove('hidden');
        errorMessage.textContent = message;
    }
}

// Lida com a abertura de novas janelas no Webview
function handleNewWindow(event) {
    event.preventDefault();
    const isInternalSite = Object.values(getSitesList()).some(siteUrl =>
        event.url.startsWith(siteUrl) || isRelatedDomain(event.url, currentSite)
    );
    
    if (isInternalSite) {
        webview.src = event.url;
    } else {
        ipcRenderer.send('open-external', event.url);
    }
}

// Injeta script para interceptar cliques em links
function injectJavaScript() {
    const script = `
        document.addEventListener('click', (e) => {
            let target = e.target;
            while (target && target.tagName !== 'A') {
                target = target.parentElement;
            }
            if (target && target.tagName === 'A' && target.getAttribute('target') === '_blank') {
                e.preventDefault();
                e.stopPropagation();
                window.postMessage({ type: 'link-clicked', url: target.href }, '*');
                return false;
            }
        }, true);

        window.addEventListener('message', (event) => {
            if (event.data?.type === 'link-clicked') {
                window.postMessage({ type: 'electron-link-clicked', url: event.data.url }, '*');
            }
        });
    `;
    webview.executeJavaScript(script).catch(err => console.error('Erro ao injetar JavaScript:', err));
}

// Lida com o clique de link, navega ou abre externamente
function handleLinkClick(event) {
    if (event.channel === 'link-clicked') {
        const url = event.args[0];
        if (isRelatedDomain(url, currentSite)) {
            navigateWebViewTo(url);
        } else {
            ipcRenderer.send('open-external', url);
        }
    }
}

// Configura os botões de navegação
function setupNavigationButtons() {
    const navButtons = document.querySelectorAll('[data-nav]');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const siteKey = button.getAttribute('data-nav');
            currentSite = siteKey;

            if (siteKey === 'home') {
                ipcRenderer.send('navigate', 'home');
            } else {
                if (!webview) createWebView();
                ipcRenderer.send('navigate-webview', siteKey);
            }

            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

// Normaliza URLs para comparação
function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.origin + parsed.pathname;
    } catch {
        return url;
    }
}

// Navega para a URL no Webview
function navigateWebViewTo(url) {
    if (!webview) createWebView();

    const currentURL = webview.getURL();
    if (normalizeUrl(currentURL) !== normalizeUrl(url)) {
        webview.src = url;
    }
}

// Exibe a versão do app
async function displayAppVersion() {
    try {
        const version = await ipcRenderer.invoke('get-app-version');
        const versionElement = document.getElementById('app-version');
        if (versionElement) versionElement.textContent = `Versão: ${version}`;
    } catch (err) {
        console.error('Erro ao obter versão do app:', err);
    }
}

// Recebe a URL para carregar no Webview
ipcRenderer.on('load-url', (event, data) => {
    if (!webview) createWebView();

    if (data.title && document.getElementById('page-title')) {
        document.getElementById('page-title').textContent = capitalizeFirstLetter(data.title);
    }

    if (data.partition) {
        webview.setAttribute('partition', data.partition);
    }

    webview.style.display = 'block';
    navigateWebViewTo(data.url);
    document.getElementById('error-container')?.classList.add('hidden');
    currentSite = data.title || 'unknown';
});

// Lida com a navegação externa
ipcRenderer.on('open-external', (event, url) => {
    ipcRenderer.send('open-external', url);
});

// Exibe o erro de carregamento
ipcRenderer.on('load-error', (event, data) => {
    console.error(`Erro ao carregar ${data.site}:`, data.error);
    displayErrorMessage(`Erro ao carregar ${data.site}: ${data.error}`);
});

// Mostra o indicador de carregamento
ipcRenderer.on('site-loading', (event, data) => {
    if (data.title && document.getElementById('page-title')) {
        document.getElementById('page-title').textContent = capitalizeFirstLetter(data.title);
    }
    toggleLoadingIndicator(true);
});

// Armazena o token no localStorage
ipcRenderer.on('set-token', (event, token) => {
    if (token) {
        console.log('Token recebido:', token);
        localStorage.setItem('token', token);
    } else {
        console.warn('Token inválido ou ausente');
        alert('Token inválido, por favor, faça login novamente.');
    }
});

// Função auxiliar para capitalizar a primeira letra de uma string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

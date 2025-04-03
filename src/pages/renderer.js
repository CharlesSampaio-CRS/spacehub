// renderer.js - inclua este arquivo no seu index.html
const { ipcRenderer } = require('electron');

// Referência para o elemento webview (se estiver usando webview)
let webview = null;
let currentSite = 'home';

// Inicialização - será chamada quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicialize o elemento webview se estiver usando essa abordagem
    webview = document.getElementById('webview');
    
    if (webview) {
        setupWebView();
    } else {
        // Se a abordagem BrowserWindow direta estiver sendo usada, 
        // criaremos um webview para sites específicos que precisam dele
        createWebView();
    }
    
    // Configure os botões de navegação
    setupNavigationButtons();
});

// Configurar o webview com todos os eventos necessários
function setupWebView() {
    if (!webview) return;
    
    webview.addEventListener('did-start-loading', () => {
        document.getElementById('loading-indicator')?.classList.remove('hidden');
    });
    
    webview.addEventListener('did-finish-load', () => {
        document.getElementById('loading-indicator')?.classList.add('hidden');
    });
    
    webview.addEventListener('did-fail-load', (event) => {
        console.error('Erro ao carregar página:', event);
        document.getElementById('loading-indicator')?.classList.add('hidden');
        
        if (document.getElementById('error-container')) {
            document.getElementById('error-container').classList.remove('hidden');
            document.getElementById('error-message').textContent = 
                `Erro ao carregar: ${event.errorDescription || 'Falha no carregamento'}`;
        }
    });
    
    // IMPORTANTE: Capturar a abertura de novas janelas
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        
        console.log('Tentativa de abrir nova janela:', e.url);
        
        // Verificar se é uma URL de site que devemos manter em nossa aplicação
        const isInternalSite = Object.values(getSitesList()).some(siteUrl => 
            e.url.startsWith(siteUrl) || isRelatedDomain(e.url, currentSite)
        );
        
        if (isInternalSite) {
            // Carregar a URL no webview atual
            webview.src = e.url;
        } else {
            // Abrir no navegador externo (via ipcRenderer)
            ipcRenderer.send('open-external', e.url);
        }
    });
    
    // Interceptar cliques em links via JavaScript (para sites que usam JS para abrir novas janelas)
    webview.addEventListener('dom-ready', () => {
        webview.executeJavaScript(`
            document.addEventListener('click', (e) => {
                // Verificar se o clique foi em um link
                let target = e.target;
                while (target && target.tagName !== 'A') {
                    target = target.parentElement;
                }
                
                if (target && target.tagName === 'A' && target.getAttribute('target') === '_blank') {
                    // Evitar abertura em nova janela
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Notificar o electron para lidar com este link
                    window.postMessage({ 
                        type: 'link-clicked', 
                        url: target.href 
                    }, '*');
                    
                    return false;
                }
            }, true);
            
            // Escutar mensagens de eventos JavaScript
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'link-clicked') {
                    // Enviar mensagem para o processo principal
                    window.postMessage({ 
                        type: 'electron-link-clicked', 
                        url: event.data.url 
                    }, '*');
                }
            });
        `).catch(err => console.error('Erro ao injetar JavaScript:', err));
    });
    
    // Capturar mensagens do script injetado
    webview.addEventListener('ipc-message', (event) => {
        if (event.channel === 'link-clicked') {
            const url = event.args[0];
            handleLinkClick(url);
        }
    });
}

// Criar webview dinamicamente para suporte adequado a sites externos
function createWebView() {
    const container = document.getElementById('content-container');
    if (!container) return;
    
    webview = document.createElement('webview');
    webview.setAttribute('id', 'webview');
    webview.classList.add('w-full', 'h-full');
    
    // Definir atributos importantes
    webview.setAttribute('allowpopups', 'false');
    webview.setAttribute('webpreferences', 'contextIsolation=false, nodeIntegration=false, nativeWindowOpen=false');
    
    // Adicionar ao container
    container.innerHTML = '';
    container.appendChild(webview);
    
    // Configurar eventos
    setupWebView();
}

// Função para verificar se um domínio está relacionado ao site atual
function isRelatedDomain(url, currentSite) {
    const relatedDomains = {
        'whatsapp': ['web.whatsapp.com', 'whatsapp.com'],
        'telegram': ['web.telegram.org', 'telegram.org'],
        'gmail': ['mail.google.com', 'accounts.google.com'],
        'outlook': ['outlook.live.com', 'login.live.com', 'outlook.office.com'],
        'linkedin': ['linkedin.com'],
        'discord': ['discord.com', 'discordapp.com']
    };
    
    // Verificar se a URL contém algum domínio relacionado ao site atual
    return relatedDomains[currentSite]?.some(domain => url.includes(domain)) || false;
}

// Lidar com cliques em links
function handleLinkClick(url) {
    if (isRelatedDomain(url, currentSite)) {
        // Manter na aplicação - carregar no webview
        webview.src = url;
    } else {
        // Abrir externamente
        ipcRenderer.send('open-external', url);
    }
}

// Configurar os botões de navegação no sidebar
function setupNavigationButtons() {
    // Obter todos os botões de navegação
    const navButtons = document.querySelectorAll('[data-nav]');
    
    // Adicionar evento de clique para cada botão
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const siteKey = button.getAttribute('data-nav');
            currentSite = siteKey;
            
            if (siteKey === 'home') {
                // Carregar página home diretamente
                ipcRenderer.send('navigate', 'home');
            } else {
                // Usar abordagem webview para carregamento de sites externos
                // Isso dá mais controle sobre como os links são tratados
                if (!webview) {
                    createWebView();
                }
                
                // Usar o método webview em vez do carregamento direto
                ipcRenderer.send('navigate-webview', siteKey);
            }
            
            // Atualizar UI para mostrar botão ativo
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

// Função para obter a lista de sites
function getSitesList() {
    return {
        chatgpt: 'https://chatgpt.com/auth/login',
        whatsapp: 'https://web.whatsapp.com/',
        telegram: 'https://web.telegram.org/k/',
        gmail: 'https://accounts.google.com/signin/v2/identifier?service=mail',
        outlook: 'https://login.live.com/',
        linkedin: 'https://www.linkedin.com/login',
        messenger: 'https://www.messenger.com',
        discord: 'https://discord.com/login',
        // ... outros sites
        home: 'file://home.html'
    };
}

// Lidar com o evento 'load-url' (para método webview)
ipcRenderer.on('load-url', (event, data) => {
    if (!webview) {
        createWebView();
    }
    
    // Atualizar o título da página se necessário
    if (data.title && document.getElementById('page-title')) {
        document.getElementById('page-title').textContent = data.title.charAt(0).toUpperCase() + data.title.slice(1);
    }
    
    // Definir partição para o webview (importante para manter cookies separados)
    if (data.partition) {
        webview.setAttribute('partition', data.partition);
    }
    
    // Garantir que o webview esteja visível
    webview.style.display = 'block';
    
    // Carregar a URL no webview
    webview.src = data.url;
    
    // Ocultar mensagens de erro se estiverem visíveis
    document.getElementById('error-container')?.classList.add('hidden');
    
    // Atualizar site atual
    currentSite = data.title || 'unknown';
});

// Adicionar handler para links externos
ipcRenderer.on('open-external', (event, url) => {
    // Isso será manipulado pelo processo principal
    ipcRenderer.send('open-external', url);
});

// Lidar com erros de carregamento
ipcRenderer.on('load-error', (event, data) => {
    console.error(`Erro ao carregar ${data.site}:`, data.error);
    
    if (document.getElementById('error-container')) {
        document.getElementById('error-container').classList.remove('hidden');
        document.getElementById('error-message').textContent = 
            `Erro ao carregar ${data.site}: ${data.error}`;
    }
});

// Lidar com o evento 'site-loading'
ipcRenderer.on('site-loading', (event, data) => {
    // Atualizar o título da página se necessário
    if (data.title && document.getElementById('page-title')) {
        document.getElementById('page-title').textContent = data.title.charAt(0).toUpperCase() + data.title.slice(1);
    }
    
    // Mostrar indicador de carregamento
    document.getElementById('loading-indicator')?.classList.remove('hidden');
});
const { ipcRenderer } = require('electron');

// Configurações
document.getElementById('config').addEventListener('click', () => {
    ipcRenderer.send('show-link-registration');
});

// Logout com confirmação
document.getElementById('logout').addEventListener('click', () => {
    if (confirm('Você tem certeza que deseja sair?')) {
        ipcRenderer.send('logout-success');
    }
});

// Seleção dos itens da sidebar
const sidebarItems = document.querySelectorAll('.sidebar-item');

sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove a classe "active" de todos os itens
        sidebarItems.forEach(i => i.classList.remove('active'));

        // Adiciona "active" ao item clicado
        item.classList.add('active');

        // Envia evento para o processo principal do Electron
        ipcRenderer.send(`show-${item.id}`);
    });
});

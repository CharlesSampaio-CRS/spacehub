const { ipcRenderer } = require('electron');

document.getElementById('config').addEventListener('click', () => {
    ipcRenderer.send('show-link-registration');
});

document.getElementById('logout').addEventListener('click', () => {
    const confirmLogout = confirm('Você tem certeza que deseja sair?');
    if (confirmLogout) {
        ipcRenderer.send('logout-success');
    }
});

const sidebarItems = document.querySelectorAll('.sidebar-item');
sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        const eventName = `show-${item.id}`;
        ipcRenderer.send(eventName);
    });
});
 
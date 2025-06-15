const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const menuContent = document.getElementById('context-menu-content');

    ipcRenderer.on('show-context-menu', (event, menuTemplate, currentViewId) => {
        menuContent.innerHTML = ''; // Limpar conteúdo anterior
        
        menuTemplate.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                menuContent.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.setAttribute('data-command', item.command);
                menuItem.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${item.icon_svg}
                    </svg>
                    <span>${item.label}</span>
                `;
                menuItem.addEventListener('click', () => {
                    ipcRenderer.send('context-menu-action', item.command, currentViewId);
                    window.close(); // Fechar a janela do menu após o clique
                });
                menuContent.appendChild(menuItem);
            }
        });

        // Adicionar evento para fechar o menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!menuContent.contains(e.target)) {
                window.close();
            }
        });

        // Adicionar listener para quando a janela perder o foco
        window.addEventListener('blur', () => {
            window.close();
        });

        // Ajustar tema (dark/light mode)
        ipcRenderer.invoke('get-dark-mode').then(isDark => {
            document.documentElement.classList.toggle('dark-mode', isDark);
            document.body.classList.toggle('dark-mode', isDark);
        });
    });
}); 
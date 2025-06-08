const setupDarkMode = () => {
  // Verificar o estado atual do modo escuro no store do Electron
  window.electronAPI.invoke('get-dark-mode').then(isDarkMode => {
    updateDarkMode(isDarkMode);
  });

  // Adicionar listener para mudanças no modo escuro
  window.electronAPI.onDarkModeChanged((isDark) => {
    updateDarkMode(isDark);
  });

  // Adicionar listener para o evento de mudança do modo escuro
  window.addEventListener('storage', (event) => {
    if (event.key === 'darkMode') {
      updateDarkMode(event.newValue === 'true');
    }
  });
};

const updateDarkMode = (isDark) => {
  document.documentElement.classList.toggle("dark-mode", isDark);
  document.body.classList.toggle("dark-mode", isDark);
  localStorage.setItem('darkMode', isDark);
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
}); 
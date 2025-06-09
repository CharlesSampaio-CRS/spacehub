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

// Objeto com as traduções
const translations = {
  'pt-BR': {
    'Aplicativos Integrados': 'Aplicativos Integrados',
    'whatsapp-desc': 'Centralize todas as suas conversas pessoais e grupos em um único lugar.',
    'telegram-desc': 'Integre seus canais, grupos e conversas particulares em uma única plataforma.',
    'discord-desc': 'Unifique seus servidores, canais e mensagens diretas em um só lugar.',
    'slack-desc': 'Mantenha a comunicação com sua equipe sem precisar sair do aplicativo.',
    'Por que escolher o SpaceApp?': 'Por que escolher o SpaceApp?',
    'Centralização Total': 'Centralização Total',
    'centralization-desc': 'Tenha acesso a todas as suas conversas de diferentes plataformas em uma única interface, eliminando a necessidade de alternar entre aplicativos.',
    'Personalização Inteligente': 'Personalização Inteligente',
    'personalization-desc': 'Selecione exatamente quais conversas deseja acompanhar e receba notificações sem precisar alternar entre telas.',
    'Notificações Centralizadas': 'Notificações Centralizadas',
    'notifications-desc': 'Receba todos os seus alertas em um único local, com controle personalizado sobre quais notificações deseja visualizar.'
  },
  'en-US': {
    'Aplicativos Integrados': 'Integrated Apps',
    'whatsapp-desc': 'Centralize all your personal conversations and groups in one place.',
    'telegram-desc': 'Integrate your channels, groups, and private conversations in a single platform.',
    'discord-desc': 'Unify your servers, channels, and direct messages in one place.',
    'slack-desc': 'Keep in touch with your team without leaving the app.',
    'Por que escolher o SpaceApp?': 'Why Choose SpaceApp?',
    'Centralização Total': 'Total Centralization',
    'centralization-desc': 'Access all your conversations from different platforms in a single interface, eliminating the need to switch between apps.',
    'Personalização Inteligente': 'Smart Personalization',
    'personalization-desc': 'Select exactly which conversations you want to follow and receive notifications without switching screens.',
    'Notificações Centralizadas': 'Centralized Notifications',
    'notifications-desc': 'Receive all your alerts in one place, with personalized control over which notifications you want to view.'
  }
};

// Função para traduzir os elementos
function translatePage(language) {
  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    if (translations[language] && translations[language][key]) {
      element.textContent = translations[language][key];
    }
  });
}

// Configurar o idioma inicial e listeners
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Obter o idioma atual do Electron
    const currentLanguage = await window.electronAPI.getLanguage();
    document.documentElement.lang = currentLanguage;
    translatePage(currentLanguage);

    // Adicionar listener para mudanças no idioma
    window.electronAPI.onLanguageChanged((language) => {
      document.documentElement.lang = language;
      translatePage(language);
    });
  } catch (error) {
    console.error('Erro ao configurar idioma:', error);
  }
});

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
}); 
const getAuthData = async () => {
  try {
    const token = await window.electronAPI.invoke('get-token');
    const userUuid = await window.electronAPI.invoke('get-userUuid');
    return { token, userUuid };
  } catch (err) {
    console.error("Erro ao obter token ou userUuid:", err);
    return null;
  }
};

const loadApplications = async () => {
  const auth = await getAuthData();
  if (!auth) return;

  fetch(`https://spaceapp-digital-api.onrender.com/spaces/${auth.userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    }
  })
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data.applications)) return;

      const listContainer = document.getElementById("applicationsList");
      listContainer.innerHTML = "";

      data.applications
        .sort((a, b) => b.active - a.active)
        .forEach(app => {
          const appItem = document.createElement("div");
          appItem.classList.add("application-item");

          appItem.innerHTML = `
            <div class="application-info">
              <img src="${app.icon}" alt="${app.application}" width="32" height="32" />
              <p><strong>${app.application}</strong></p>
            </div>
            <div class="application-toggle">
              <label class="toggle-switch">
                <input type="checkbox" ${app.active ? "checked" : ""} id="toggle-${app.uuid}" />
                <span class="slider"></span>
              </label>
            </div>
          `;

          listContainer.appendChild(appItem);
        });
    })
    .catch(error => console.error('Erro ao carregar aplicações:', error));
};

const updateApplications = async () => {
  try {
    const auth = await getAuthData();
    if (!auth) return;

    const toggles = document.querySelectorAll('.application-toggle input[type="checkbox"]');
    const applications = Array.from(toggles).map(toggle => ({
      uuid: toggle.id.replace('toggle-', ''),
      active: toggle.checked
    }));

    const payload = {
      userUuid: auth.userUuid,
      applications
    };

    // Desabilitar o botão de salvar
    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      saveButton.disabled = true;
    }

    // Enviar requisição PUT para salvar as configurações
    const res = await fetch('https://spaceapp-digital-api.onrender.com/spaces', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Erro ao salvar as configurações');
    }
    await window.electronAPI.send('reload-applications');
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    alert('Erro ao salvar as configurações.');
  } finally {
    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
  loadApplications();
};

const loadUserInfo = async () => {
  const auth = await getAuthData();
  if (!auth) return;

  fetch(`https://spaceapp-digital-api.onrender.com/users/${auth.userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data?.name && data?.email && data?.plan) {
        document.getElementById("userType").textContent = data.type || "Desconhecido";
        document.getElementById("userName").textContent = data.name;
        document.getElementById("userEmail").textContent = data.email;
        document.getElementById("userPlan").textContent = data.plan;
      }
    })
    .catch(error => console.error('Erro ao carregar dados do usuário:', error));
};

const setupDarkModeToggle = () => {
  const toggle = document.getElementById("dark-mode-toggle");
  const toggleIcon = document.getElementById("dark-mode-icon");
  if (!toggle || !toggleIcon) return;

  // Verificar o estado atual do modo escuro no store do Electron
  window.electronAPI.invoke('get-dark-mode').then(isDarkMode => {
    toggle.checked = isDarkMode;
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    
    // Definir o ícone inicial
    toggleIcon.innerHTML = isDarkMode ? '🌙' : '☀️';
  });

  // Adicionar listener para mudanças no modo escuro
  window.electronAPI.onDarkModeChanged((isDark) => {
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("dark-mode", isDark);
    toggle.checked = isDark;
    toggleIcon.innerHTML = isDark ? '🌙' : '☀️';
    localStorage.setItem('darkMode', isDark);
  });

  toggle.addEventListener("change", () => {
    const isDark = toggle.checked;
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem('darkMode', isDark);
    window.electronAPI.sendDarkModeChanged(isDark);
    
    // Atualizar o ícone
    toggleIcon.innerHTML = isDark ? '🌙' : '☀️';
  });
};

const setupNotificationToggle = () => {
  const toggle = document.getElementById("notification-toggle");
  const toggleIcon = document.getElementById("notification-icon");
  if (!toggle || !toggleIcon) return;

  // Verificar o estado atual das notificações
  const isEnabled = toggle.checked;
  toggleIcon.innerHTML = isEnabled ? '🔔' : '🔕';

  toggle.addEventListener("change", () => {
    const isEnabled = toggle.checked;
    toggleIcon.innerHTML = isEnabled ? '🔔' : '🔕';
    // Aqui você pode adicionar a lógica para salvar a preferência das notificações
    localStorage.setItem('notifications', isEnabled);
  });
};

const setupAutoLoginToggle = () => {
  const toggle = document.getElementById("auto-login-toggle");
  const toggleIcon = document.getElementById("auto-login-icon");
  if (!toggle || !toggleIcon) return;

  const isEnabled = toggle.checked;
  toggleIcon.innerHTML = isEnabled ? '🔐' : '🔓';

  toggle.addEventListener("change", () => {
    const isEnabled = toggle.checked;
    toggleIcon.innerHTML = isEnabled ? '🔐' : '🔓';
    localStorage.setItem('autoLogin', isEnabled);
  });
};

const setupCompactLayoutToggle = () => {
  const toggle = document.getElementById("compact-layout-toggle");
  const toggleIcon = document.getElementById("compact-layout-icon");
  if (!toggle || !toggleIcon) return;

  const isEnabled = toggle.checked;
  toggleIcon.innerHTML = isEnabled ? '📱' : '💻';

  toggle.addEventListener("change", () => {
    const isEnabled = toggle.checked;
    toggleIcon.innerHTML = isEnabled ? '📱' : '💻';
    localStorage.setItem('compactLayout', isEnabled);
  });
};

const setupFullscreenToggle = () => {
  const toggle = document.getElementById("fullscreen-toggle");
  const toggleIcon = document.getElementById("fullscreen-icon");
  if (!toggle || !toggleIcon) return;

  const isEnabled = toggle.checked;
  toggleIcon.innerHTML = isEnabled ? '🖥️' : '📺';

  toggle.addEventListener("change", () => {
    const isEnabled = toggle.checked;
    toggleIcon.innerHTML = isEnabled ? '🖥️' : '📺';
    localStorage.setItem('fullscreen', isEnabled);
  });
};

// Objeto com as traduções
const translations = {
  'pt-BR': {
    'Perfil': 'Perfil',
    'Nome': 'Nome',
    'Email': 'Email',
    'Plano': 'Plano',
    'Preferências': 'Preferências',
    'Notificações': 'Notificações',
    'Modo Escuro': 'Tema',
    'Auto Login': 'Auto Login',
    'Idioma': 'Idioma',
    'Aplicações': 'Aplicações',
    'Salvar': 'Salvar',
    'Configurações': 'Configurações',
    'Confirmação': 'Confirmação',
    'Confirmar': 'Confirmar',
    'Cancelar': 'Cancelar',
    'language_change_confirmation': 'Deseja realmente mudar o idioma? A aplicação será reiniciada.'
  },
  'en-US': {
    'Perfil': 'Profile',
    'Nome': 'Name',
    'Email': 'Email',
    'Plano': 'Plan',
    'Preferências': 'Preferences',
    'Notificações': 'Notifications',
    'Modo Escuro': 'Theme',
    'Auto Login': 'Auto Login',
    'Idioma': 'Language',
    'Aplicações': 'Applications',
    'Salvar': 'Save',
    'Configurações': 'Settings',
    'Confirmação': 'Confirmation',
    'Confirmar': 'Confirm',
    'Cancelar': 'Cancel',
    'language_change_confirmation': 'Do you really want to change the language? The application will be restarted.'
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

const setupLanguageToggle = () => {
  const toggle = document.getElementById("language-toggle");
  const toggleIcon = document.getElementById("language-icon");
  if (!toggle || !toggleIcon) return;

  // Verificar o estado atual do idioma no store do Electron
  window.electronAPI.getLanguage().then(language => {
    toggle.checked = language === 'en-US';
    document.documentElement.lang = language;
    translatePage(language);
    
    // Atualizar o ícone inicial
    toggleIcon.innerHTML = language === 'pt-BR' ? '🇧🇷' : '🇺🇸';
  });

  // Evento de mudança do toggle
  toggle.addEventListener('change', async () => {
    const newLanguage = toggle.checked ? 'en-US' : 'pt-BR';
    const currentLanguage = await window.electronAPI.getLanguage();

    const showConfirmationDialog = async (message, onConfirm) => {
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
        toggle.checked = !toggle.checked;
        toggleIcon.innerHTML = currentLanguage === 'pt-BR' ? '🇧🇷' : '🇺🇸';
      });
    };

    showConfirmationDialog(translations[currentLanguage]['language_change_confirmation'], async () => {
      await window.electronAPI.setLanguage(newLanguage);
      await window.electronAPI.restartApp();
    });
  });
};

const initializeSettingsPage = () => {
  loadApplications();
  loadUserInfo();
  setupDarkModeToggle();
  setupNotificationToggle();
  setupAutoLoginToggle();
  setupCompactLayoutToggle();
  setupFullscreenToggle();
  setupLanguageToggle();

  const saveButton = document.getElementById("saveButton");
  if (saveButton) {
    saveButton.addEventListener("click", updateApplications);
  }
};

initializeSettingsPage();

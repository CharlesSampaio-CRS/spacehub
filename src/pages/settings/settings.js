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
    toggleIcon.textContent = language === 'pt-BR' ? '🇧🇷' : '🇺🇸';
  });

  // Adicionar listener para mudanças no idioma
  window.electronAPI.onLanguageChanged((language) => {
    toggle.checked = language === 'en-US';
    document.documentElement.lang = language;
    translatePage(language);
    toggleIcon.textContent = language === 'pt-BR' ? '🇧🇷' : '🇺🇸';
  });

  // Evento de mudança do toggle
  toggle.addEventListener('change', () => {
    const newLanguage = toggle.checked ? 'en-US' : 'pt-BR';
    window.electronAPI.sendLanguageChanged(newLanguage);
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

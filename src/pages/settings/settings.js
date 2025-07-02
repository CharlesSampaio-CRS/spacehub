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
      if (!Array.isArray(data.data.applications)) return;

      const listContainer = document.getElementById("applicationsList");
      listContainer.innerHTML = "";

      data.data.applications
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

    // Printar o token enviado
    console.log('Token enviado no header Authorization:', auth.token);

    // Desabilitar o botão de salvar
    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      saveButton.disabled = true;
    }

    // Enviar requisição PUT para salvar as configurações
    const res = await fetch('http://localhost:3000/spaces', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify(payload)
    });

    // Tentar logar o corpo da resposta
    let responseBody;
    try {
      responseBody = await res.json();
    } catch (e) {}

    if (!res.ok) {
      alert('Erro ao salvar as configurações: ' + (responseBody?.message || res.status));
    }

    await window.electronAPI.send('reload-applications');
  } catch (error) {
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
    .then(data => {      const user = data?.data || data;
      const typeElem = document.getElementById("userType");
      const nameElem = document.getElementById("userName");
      const emailElem = document.getElementById("userEmail");
      const planElem = document.getElementById("userPlan");
      if (!typeElem || !nameElem || !emailElem || !planElem) {
        console.error('Elementos de usuário não encontrados no DOM.');
        return;
      }
      // Preenche os campos, mesmo que estejam vazios
      typeElem.textContent = user.type || "Desconhecido";
      nameElem.textContent = user.name || "-";
      emailElem.textContent = user.email || "-";
      planElem.textContent = user.plan || "-";
    })
    .catch(error => {
      console.error('Erro ao carregar dados do usuário:', error);
      // Opcional: exibir mensagem de erro na interface
      const nameElem = document.getElementById("userName");
      if (nameElem) nameElem.textContent = "Erro ao carregar usuário";
    });
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
    'language_change_confirmation': 'Deseja realmente mudar o idioma para %s? A aplicação será reiniciada.',
    'Português': 'Português',
    'Inglês': 'Inglês',
    'update_available': 'Uma nova versão está disponível para download.',
    'current_version': 'Versão Atual',
    'new_version': 'Nova Versão',
    'latest_version': 'Você está usando a versão mais recente.',
    'update_check_error': 'Não foi possível verificar atualizações no momento.',
    'restart_confirmation': 'O sistema será reiniciado para aplicar a atualização. Deseja continuar?',
    'Atualizar': 'Atualizar',
    'OK': 'OK',
    'Erro': 'Erro'
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
    'language_change_confirmation': 'Do you really want to change the language to %s? The application will be restarted.',
    'Português': 'Portuguese',
    'Inglês': 'English',
    'update_available': 'A new version is available for download.',
    'current_version': 'Current Version',
    'new_version': 'New Version',
    'latest_version': 'You are using the latest version.',
    'update_check_error': 'Unable to check for updates at this time.',
    'restart_confirmation': 'The system will restart to apply the update. Do you want to continue?',
    'Atualizar': 'Update',
    'OK': 'OK',
    'Erro': 'Error'
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
    
    // Atualizar o ícone imediatamente
    toggleIcon.innerHTML = newLanguage === 'pt-BR' ? '🇧🇷' : '🇺🇸';

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

    const languageName = newLanguage === 'pt-BR' ? translations[currentLanguage]['Português'] : translations[currentLanguage]['Inglês'];
    const confirmationMessage = translations[currentLanguage]['language_change_confirmation'].replace('%s', languageName);

    showConfirmationDialog(confirmationMessage, async () => {
      try {
        await window.electronAPI.setLanguage(newLanguage);
        // Pequeno delay antes de reiniciar para garantir que a mudança de idioma foi processada
        setTimeout(() => {
          window.electronAPI.restartApp().catch(() => {
            // Ignorar erro de objeto destruído
          });
        }, 100);
      } catch (error) {
        console.error('Erro ao mudar idioma:', error);
        // Reverter o toggle em caso de erro
        toggle.checked = !toggle.checked;
        toggleIcon.innerHTML = currentLanguage === 'pt-BR' ? '🇧🇷' : '🇺🇸';
      }
    });
  });
};

// Função para carregar informações do sistema
async function loadSystemInfo() {
  try {
    const version = await window.electronAPI.getAppVersion();
    const versionButton = document.getElementById('versionButton');
    console.log('Versão obtida:', version); // Debug
    
    if (versionButton) {
      versionButton.querySelector('#appVersion').textContent = `v${version}`;
      versionButton.title = `Clique para verificar atualizações`;
      
      // Remover listener anterior se existir
      versionButton.removeEventListener('click', checkForUpdates);
      
      // Adicionar novo listener
      versionButton.addEventListener('click', () => {
        console.log('Verificando atualizações...'); // Debug
        checkForUpdates();
      });
    } else {
      console.error('Botão de versão não encontrado!'); // Debug
    }
  } catch (error) {
    console.error('Erro ao carregar versão:', error);
    const versionButton = document.getElementById('versionButton');
    if (versionButton) {
      versionButton.querySelector('#appVersion').textContent = 'v?.?.?';
    }
  }
}

const initializeSettingsPage = async () => {
  console.log('Inicializando página de configurações...'); // Debug
  
  // Carregar informações do sistema primeiro
  await loadSystemInfo();
  
  // Carregar outras informações
  loadApplications();
  loadUserInfo();
  
  // Restaurar configurações de tema e toggles
  setupDarkModeToggle();
  setupNotificationToggle();
  setupAutoLoginToggle();
  setupCompactLayoutToggle();
  setupFullscreenToggle();
  setupLanguageToggle();
  
  // Configurar eventos
  const saveButton = document.getElementById("saveButton");
  if (saveButton) {
    saveButton.addEventListener("click", updateApplications);
  }
};

// Garantir que o evento DOMContentLoaded está sendo chamado
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM carregado, inicializando...'); // Debug
  await initializeSettingsPage();
});

// Função para verificar atualizações
async function checkForUpdates() {
  try {
    console.log('Iniciando verificação de atualizações...'); // Debug
    
    // Sempre obter a versão atual primeiro
    const currentVersion = await window.electronAPI.getAppVersion();
    console.log('Versão atual:', currentVersion); // Debug
    
    // Verificar se há atualizações disponíveis
    const latestVersion = await window.electronAPI.checkForUpdates();
    console.log('Última versão disponível:', latestVersion); // Debug
    
    // Se não houver nova versão ou se a versão atual for igual à mais recente
    if (!latestVersion || latestVersion === currentVersion) {
      console.log('Usando versão mais recente'); // Debug
      Swal.fire({
        title: translations[currentLanguage]['Confirmação'],
        html: `
          <div class="confirmation-dialog">
            <div class="confirmation-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="confirmation-content">
              <p>${translations[currentLanguage]['latest_version']}</p>
              <div class="version-info">
                <span>${translations[currentLanguage]['current_version']}: v${currentVersion}</span>
              </div>
            </div>
          </div>
        `,
        confirmButtonText: translations[currentLanguage]['OK'],
        confirmButtonColor: '#3085d6',
        customClass: {
          container: 'confirmation-dialog-container'
        }
      });
      return;
    }
    
    // Se houver uma nova versão disponível
    console.log('Nova versão disponível:', latestVersion); // Debug
    Swal.fire({
      title: translations[currentLanguage]['Confirmação'],
      html: `
        <div class="confirmation-dialog">
          <div class="confirmation-icon">
            <i class="fas fa-download"></i>
          </div>
          <div class="confirmation-content">
            <p>${translations[currentLanguage]['update_available']}</p>
            <div class="version-info">
              <span>${translations[currentLanguage]['current_version']}: v${currentVersion}</span>
              <span>${translations[currentLanguage]['new_version']}: v${latestVersion}</span>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: translations[currentLanguage]['Atualizar'],
      cancelButtonText: translations[currentLanguage]['Cancelar'],
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      customClass: {
        container: 'confirmation-dialog-container'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Segundo modal - Confirmação de reinicialização
        Swal.fire({
          title: translations[currentLanguage]['Confirmação'],
          html: `
            <div class="confirmation-dialog">
              <div class="confirmation-icon">
                <i class="fas fa-sync-alt"></i>
              </div>
              <div class="confirmation-content">
                <p>${translations[currentLanguage]['restart_confirmation']}</p>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: translations[currentLanguage]['Confirmar'],
          cancelButtonText: translations[currentLanguage]['Cancelar'],
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          customClass: {
            container: 'confirmation-dialog-container'
          }
        }).then((restartResult) => {
          if (restartResult.isConfirmed) {
            console.log('Iniciando atualização...'); // Debug
            window.electronAPI.downloadUpdate();
          }
        });
      }
    });
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
    Swal.fire({
      title: translations[currentLanguage]['Erro'],
      html: `
        <div class="confirmation-dialog">
          <div class="confirmation-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="confirmation-content">
            <p>${translations[currentLanguage]['update_check_error']}</p>
          </div>
        </div>
      `,
      confirmButtonText: translations[currentLanguage]['OK'],
      confirmButtonColor: '#3085d6',
      customClass: {
        container: 'confirmation-dialog-container'
      }
    });
  }
}

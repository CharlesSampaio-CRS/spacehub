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

  try {
    const response = await fetch(`https://spaceapp-digital-api.onrender.com/spaces/${auth.userUuid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      }
    });
    const data = await response.json();
    if (!Array.isArray(data.data.applications)) return;

    const listContainer = document.getElementById("applicationsList");
    listContainer.innerHTML = "";
    data.data.applications
      .sort((a, b) => b.active - a.active)
      .forEach(app => {
        const isChecked = app.active == true;
        const appItem = document.createElement("div");
        appItem.classList.add("application-item");

        appItem.innerHTML = `
          <div class="application-info">
            <img src="${app.icon}" alt="${app.application}" width="32" height="32" />
            <p><strong>${app.application}</strong></p>
          </div>
          <div class="application-toggle">
            <label class="toggle-switch">
              <input type="checkbox" ${isChecked ? 'checked' : ''} id="toggle-${app.uuid}" />
              <span class="slider"></span>
            </label>
          </div>
        `;
        listContainer.appendChild(appItem);
      });
  } catch (error) {
    console.error('Erro ao carregar aplicações:', error);
  }
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

    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      saveButton.disabled = true;
    }

    const res = await fetch('https://spaceapp-digital-api.onrender.com/spaces', {
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
    'Erro': 'Erro',
    'Limpar': 'Limpar'
  },
  'en-US': {
    'Perfil': 'Profile',
    'Nome': 'Name',
    'Email': 'Email',
    'Plano': 'Plan',
    'Preferências': 'Preferences',
    'Notificações': 'Notifications',
    'Modo Escuro': 'Theme',
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
    'Erro': 'Error',
    'Limpar': 'Clear'
  }
};

// Função para traduzir os elementos
function translatePage(language) {
  
  const elements = document.querySelectorAll('[data-translate]');
  
  let translatedCount = 0;
  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    if (translations[language] && translations[language][key]) {
      element.textContent = translations[language][key];
      translatedCount++;
    }
  });
  
}

const setupLanguageToggle = () => {
  const toggle = document.getElementById("language-toggle");
  const toggleIcon = document.getElementById("language-icon");
  if (!toggle || !toggleIcon) {
    return;
  }


  // Verificar o idioma atual
  window.electronAPI.invoke('get-language').then(currentLanguage => {
    const isEnglish = currentLanguage === 'en-US';
    toggle.checked = isEnglish;
    toggleIcon.innerHTML = isEnglish ? '🇺🇸' : '🇧🇷';
  }).catch(error => {
    console.error('Erro ao obter idioma atual:', error);
  });

  toggle.addEventListener("change", async () => {
    const newLanguage = toggle.checked ? 'en-US' : 'pt-BR';
    const languageName = toggle.checked ? 'Inglês' : 'Português';
    
    // Obter idioma atual para a mensagem de confirmação
    const currentLanguage = await window.electronAPI.invoke('get-language');
    
    // Salvar estado original do toggle
    const originalChecked = toggle.checked;
    const originalIcon = toggleIcon.innerHTML;
    
    // Mostrar diálogo de confirmação personalizado
    const showConfirmationDialog = async (message, onConfirm) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog';
      dialog.innerHTML = `
        <div class="confirmation-content">
          <h3>${translations[currentLanguage]?.['Confirmação'] || 'Confirmação'}</h3>
          <p>${message}</p>
          <div class="confirmation-buttons">
            <button class="confirm-btn">${translations[currentLanguage]?.['Confirmar'] || 'Confirmar'}</button>
            <button class="cancel-btn">${translations[currentLanguage]?.['Cancelar'] || 'Cancelar'}</button>
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
        // Reverter o toggle se cancelar
        toggle.checked = !originalChecked;
        toggleIcon.innerHTML = originalChecked ? '🇺🇸' : '🇧🇷';
        console.log('Mudança de idioma cancelada pelo usuário');
      });
    };
    
    const confirmMessage = translations[currentLanguage]?.language_change_confirmation?.replace('%s', languageName) || 
                          `Deseja realmente mudar o idioma para ${languageName}? A aplicação será reiniciada.`;
    
    showConfirmationDialog(confirmMessage, () => {
      toggleIcon.innerHTML = toggle.checked ? '🇺🇸' : '🇧🇷';
      
      // Enviar mudança para o main process
      window.electronAPI.setLanguage(newLanguage);
      
      // Salvar no localStorage
      localStorage.setItem('language', newLanguage);
      
      // Reiniciar a aplicação
      setTimeout(() => {
        window.electronAPI.restartApp();
      }, 500);
    });
  });
};

const setupClearCacheButton = () => {
  const clearCacheButton = document.getElementById('clear-cache-button');
  
  if (clearCacheButton) {
    clearCacheButton.addEventListener('click', async () => {
      try {
        // Mostrar loading no botão
        const originalContent = clearCacheButton.innerHTML;
        clearCacheButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Limpando...</span>';
        clearCacheButton.disabled = true;
        
        // Obter idioma atual para traduções
        const currentLanguage = await window.electronAPI.invoke('get-language');
        const translations = {
          'pt-BR': {
            'clear_cache_confirmation': 'Deseja realmente limpar o cache de todas as aplicações?',
            'cache_cleared': 'Cache limpo com sucesso!',
            'cache_clear_error': 'Erro ao limpar cache',
            'Confirmação': 'Confirmação',
            'Confirmar': 'Confirmar',
            'Cancelar': 'Cancelar'
          },
          'en-US': {
            'clear_cache_confirmation': 'Do you really want to clear the cache of all applications?',
            'cache_cleared': 'Cache cleared successfully!',
            'cache_clear_error': 'Error clearing cache',
            'Confirmação': 'Confirmation',
            'Confirmar': 'Confirm',
            'Cancelar': 'Cancel'
          }
        };
        
        const t = translations[currentLanguage] || translations['pt-BR'];
        
        // Mostrar diálogo de confirmação
        const showConfirmationDialog = async (message, onConfirm) => {
          const dialog = document.createElement('div');
          dialog.className = 'confirmation-dialog';
          dialog.innerHTML = `
            <div class="confirmation-content">
              <h3>${t['Confirmação']}</h3>
              <p>${message}</p>
              <div class="confirmation-buttons">
                <button class="confirm-btn">${t['Confirmar']}</button>
                <button class="cancel-btn">${t['Cancelar']}</button>
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
          });
        };
        
        showConfirmationDialog(t.clear_cache_confirmation, async () => {
          try {
            // Limpar cache
            const result = await window.electronAPI.clearCache();
            
            if (result.success) {
              // Mostrar mensagem de sucesso
              const successMessage = document.createElement('div');
              successMessage.className = 'cache-success-message';
              successMessage.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${t.cache_cleared}</span>
              `;
              document.body.appendChild(successMessage);
              
              // Remover mensagem após 3 segundos
              setTimeout(() => {
                if (successMessage.parentNode) {
                  successMessage.parentNode.removeChild(successMessage);
                }
              }, 3000);
              
            } else {
              throw new Error(result.error || 'Erro desconhecido');
            }
          } catch (error) {
            console.error('Erro ao limpar cache:', error);
            
            // Mostrar mensagem de erro
            const errorMessage = document.createElement('div');
            errorMessage.className = 'cache-error-message';
            errorMessage.innerHTML = `
              <i class="fas fa-exclamation-circle"></i>
              <span>${t.cache_clear_error}: ${error.message}</span>
            `;
            document.body.appendChild(errorMessage);
            
            // Remover mensagem após 5 segundos
            setTimeout(() => {
              if (errorMessage.parentNode) {
                errorMessage.parentNode.removeChild(errorMessage);
              }
            }, 5000);
          }
        });
        
      } catch (error) {
        console.error('Erro ao configurar limpeza de cache:', error);
      } finally {
        // Restaurar botão
        clearCacheButton.innerHTML = '<i class="fas fa-trash"></i> <span data-translate="Limpar">Limpar</span>';
        clearCacheButton.disabled = false;
      }
    });
  }
};

// Função para carregar informações do sistema
async function loadSystemInfo() {
  try {
    const version = await window.electronAPI.getAppVersion();
    const versionButton = document.getElementById('versionButton');
    console.log('Versão obtida:', version); // Debug
    
    if (versionButton) {
      versionButton.querySelector('#appVersion').textContent = `v${version}`;
      versionButton.title = `Updates`;
      
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
  setupCompactLayoutToggle();
  setupFullscreenToggle();
  setupLanguageToggle();
  setupClearCacheButton(); // Adicionar chamada para o novo botão
  
  // Aplicar idioma inicial
  const currentLanguage = await window.electronAPI.invoke('get-language');
  translatePage(currentLanguage);
  
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

window.electronAPI.on('reload-applications', () => {
  // Função que recarrega as aplicações do menu lateral
  carregarAplicacoesSidebar();
});

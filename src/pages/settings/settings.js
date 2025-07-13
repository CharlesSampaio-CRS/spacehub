const getAuthData = async () => {
  try {
    const token = await window.electronAPI.invoke('get-token');
    const userUuid = await window.electronAPI.invoke('get-userUuid');
    return { token, userUuid };
  } catch (err) {
    return null;
  }
};

// Remover funções isInTrial, getAllowedApps, banners de trial, limitação de toggles, e toda lógica de limitação de apps baseada em plano/trial
// O frontend só exibe o que vier do backend

const loadApplications = async () => {
  const auth = await getAuthData();
  if (!auth) return;

  // Obter status do trial/plano
  const trialStatus = await window.electronAPI.getTrialStatus();

  try {
    // Buscar dados do usuário para validação de plano/trial
    let user = await window.electronAPI.getUserInfo();
    if (!user) {
      // Fallback: buscar da API
      const response = await fetch(`https://spaceapp-digital-api.onrender.com/users/${auth.userUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });
      const userData = await response.json();
      user = userData?.data || userData;
    }
    // const allowedApps = getAllowedApps(user); // Removido

    let applications = await window.electronAPI.getUserApplications();
    if (!applications || applications.length === 0) {
      const response = await fetch(`https://spaceapp-digital-api.onrender.com/spaces/${auth.userUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });
      const data = await response.json();
      applications = data.data?.applications || [];
    }
    if (!Array.isArray(applications)) return;

    const listContainer = document.getElementById("applicationsList");
    listContainer.innerHTML = "";

    // Ordenar aplicações: ativas primeiro, depois inativas
    const sortedApplications = applications.sort((a, b) => {
      if (a.active === b.active) {
        return a.application.localeCompare(b.application);
      }
      return b.active - a.active;
    });

    // Remover lógica de desativação de apps não permitidos
    // if (Array.isArray(allowedApps)) { // Removido
    //   sortedApplications.forEach(app => {
    //     const isAllowed = allowedApps.includes(app.application.toLowerCase());
    //     app.active = isAllowed;
    //   });
    //   // Atualizar no servidor
    //   try {
    //     await fetch('https://spaceapp-digital-api.onrender.com/spaces', {
    //       method: 'PUT',
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${auth.token}`
    //       },
    //       body: JSON.stringify({
    //         userUuid: auth.userUuid,
    //         applications: sortedApplications
    //       })
    //     });
    //   } catch (error) {
    //     // Silenciar erros de rede
    //   }
    // }

    sortedApplications.forEach(app => {
      const appItem = document.createElement("div");
      appItem.className = "application-card";
      appItem.style.position = 'relative';
      
      // Verificar se o app deve estar desabilitado
      const isDisabled = trialStatus && trialStatus.plan === 'free' && !trialStatus.isInTrial;
      const defaultApps = ['whatsapp', 'discord', 'linkedin'];
      const shouldDisableIcon = isDisabled && !defaultApps.includes(app.application.toLowerCase());
      
      appItem.innerHTML = `
        <div class="application-info">
          <div class="app-icon-wrapper">
            <img src="${app.icon}" alt="${app.application}" class="app-icon ${shouldDisableIcon ? 'icon-disabled' : ''}" onerror="this.src='../../assets/${app.application.toLowerCase()}.png'">
          </div>
          <div>
            <p><strong>${app.application}</strong></p>
          </div>
        </div>
        <div class="application-toggle">
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-${app.uuid}" ${app.active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `;
      listContainer.appendChild(appItem);
    });

    // Desabilitar toggles se trial expirado e app não for padrão
    if (trialStatus && trialStatus.plan === 'free' && !trialStatus.isInTrial) {
      const defaultApps = ['whatsapp', 'discord', 'linkedin'];
      sortedApplications.forEach(app => {
        if (!defaultApps.includes(app.application.toLowerCase())) {
          const toggle = document.getElementById(`toggle-${app.uuid}`);
          if (toggle) {
            toggle.disabled = true;
            toggle.closest('.toggle-switch').classList.add('disabled');
          }
        }
      });
    }

    // Adicionar eventos aos toggles
    const toggles = document.querySelectorAll('.application-toggle input[type="checkbox"]');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', updateApplications);
    });

  } catch (error) {
    // Silenciar erros de rede
  }
};

const showSaveNotification = (success, language, customMessage = null) => {
  // Remover notificação anterior, se existir
  document.querySelectorAll('.save-toast-notification').forEach(n => n.remove());

  const t = translations[language] || translations['pt-BR'];
  const message = customMessage || (success ? t.save_success || 'Alterações salvas com sucesso!' : t.save_error || 'Erro ao salvar alterações!');
  const icon = success ? 'fa-check-circle' : 'fa-exclamation-triangle';
  const color = success ? '#4ecdc4' : '#ff6b6b';

  const notification = document.createElement('div');
  notification.className = 'save-toast-notification';
  notification.style.position = 'fixed';
  notification.style.top = '32px';
  notification.style.right = '32px';
  notification.style.zIndex = '9999';
  notification.style.background = '#fff';
  notification.style.color = '#222';
  notification.style.padding = '18px 32px 18px 24px';
  notification.style.borderRadius = '10px';
  notification.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '16px';
  notification.style.fontSize = '16px';
  notification.style.minWidth = '260px';
  notification.style.maxWidth = '400px';
  notification.style.borderLeft = `6px solid ${color}`;
  notification.innerHTML = `
    <i class="fas ${icon}" style="font-size: 22px; color: ${color};"></i>
    <span style="flex:1;">${message}</span>
    <button class="close-toast-btn" style="background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:#888;">&times;</button>
  `;
  document.body.appendChild(notification);
  // Fechar ao clicar no botão
  notification.querySelector('.close-toast-btn').onclick = () => notification.remove();
  // Remover após 10 segundos
  setTimeout(() => notification.remove(), 10000);
};

const updateApplications = async () => {
  try {
    const auth = await getAuthData();
    if (!auth) return;
    // Buscar dados do usuário para validação de plano/trial
    let user = await window.electronAPI.getUserInfo();
    if (!user) {
      // Fallback: buscar da API
      const response = await fetch(`https://spaceapp-digital-api.onrender.com/users/${auth.userUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });
      const userData = await response.json();
      user = userData?.data || userData;
    }
    // const allowedApps = getAllowedApps(user); // Removido
    const currentLanguage = await window.electronAPI.invoke('get-language');
    const toggles = document.querySelectorAll('.application-toggle input[type="checkbox"]');
    let applications = Array.from(toggles).map(toggle => ({
      uuid: toggle.id.replace('toggle-', ''),
      active: toggle.checked
    }));
    // Remover lógica de desativação de apps não permitidos
    // if (Array.isArray(allowedApps)) { // Removido
    //   applications = applications.map(app => {
    //     const appData = toggles.find(toggle => toggle.id === `toggle-${app.uuid}`);
    //     const appName = appData.closest('.application-card').querySelector('p strong').textContent;
    //     const isAllowed = allowedApps.includes(appName.toLowerCase());
    //     if (!isAllowed) {
    //       app.active = false;
    //       if (appData) {
    //         appData.checked = false;
    //         appData.disabled = true;
    //         const toggleSwitch = appData.closest('.toggle-switch');
    //         if (toggleSwitch) {
    //           toggleSwitch.classList.add('disabled');
    //         }
    //       }
    //     } else {
    //       if (appData) {
    //         appData.disabled = false;
    //         const toggleSwitch = appData.closest('.toggle-switch');
    //         if (toggleSwitch) {
    //           toggleSwitch.classList.remove('disabled');
    //         }
    //       }
    //     }
    //     return app;
    //   });
    //   const warningMessage = translations[currentLanguage]['only_3_apps_allowed'] || 
    //                         'Apenas 3 aplicações podem estar ativas no plano gratuito. Aplicações extras foram desativadas.'; // Removido
    //   const notification = document.createElement('div'); // Removido
    //   notification.className = 'trial-notification'; // Removido
    //   notification.innerHTML = ` // Removido
    //     <div class="notification-content"> // Removido
    //       <i class="fas fa-exclamation-triangle"></i> // Removido
    //       <span>${warningMessage}</span> // Removido
    //       <button class="close-notification">&times;</button> // Removido
    //     </div> // Removido
    //   `; // Removido
    //   document.body.appendChild(notification); // Removido
    //   setTimeout(() => { // Removido
    //     if (notification.parentNode) { // Removido
    //       notification.parentNode.removeChild(notification); // Removido
    //     } // Removido
    //   }, 5000); // Removido
    //   notification.querySelector('.close-notification').addEventListener('click', () => { // Removido
    //     if (notification.parentNode) { // Removido
    //       notification.parentNode.removeChild(notification); // Removido
    //     } // Removido
    //   }); // Removido
    // } // Removido
    // Buscar estado atual das aplicações no backend
    const response = await fetch(`https://spaceapp-digital-api.onrender.com/spaces/${auth.userUuid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      }
    });
    const data = await response.json();
    if (!Array.isArray(data.data.applications)) return;
    const updatedApplications = data.data.applications.map(app => {
      const toggleState = applications.find(t => t.uuid === app.uuid);
      return {
        ...app,
        active: toggleState ? toggleState.active : app.active
      };
    });
    await fetch('https://spaceapp-digital-api.onrender.com/spaces', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        userUuid: auth.userUuid,
        applications: updatedApplications
      })
    });
    // Atualizar dados pré-carregados
    await window.electronAPI.updateUserApplications(updatedApplications);
    // Atualizar imediatamente após salvar
    loadApplications();
    showSaveNotification(true, currentLanguage);
    // Recarregar a sidebar na página principal
    window.electronAPI.send('reload-applications');
  } catch (error) {
    const currentLanguage = await window.electronAPI.invoke('get-language');
    showSaveNotification(false, currentLanguage);
  }
};

const loadUserInfo = async () => {
  const auth = await getAuthData();
  if (!auth) return;

  try {
    // Buscar dados do usuário
    let user = await window.electronAPI.getUserInfo();
    if (!user) {
      // Fallback: buscar da API
      const response = await fetch(`https://spaceapp-digital-api.onrender.com/users/${auth.userUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });
      const userData = await response.json();
      user = userData?.data || userData;
    }
    const currentLanguage = await window.electronAPI.invoke('get-language');

    const nameElem = document.getElementById("userName");
    const emailElem = document.getElementById("userEmail");
    if (!nameElem || !emailElem) {
      return;
    }
    nameElem.textContent = user.name || "-";
    emailElem.textContent = user.email || "-";

    // Buscar status do trial/plano do backend
    const trialStatus = await window.electronAPI.getTrialStatus();
    const trialCardPlaceholder = document.getElementById("trialCardPlaceholder");
    if (!trialCardPlaceholder) {
      return;
    }
    // Criar card de plano como .application-card
    const trialCard = document.createElement("div");
    trialCard.className = "application-card";
    let inner = '';
    if (trialStatus && trialStatus.plan === 'free') {
      if (trialStatus.isInTrial) {
        // Banner de trial ativo
        inner = `
          <div class="trial-info">
            <div class="info-content">
              <i class="fas fa-clock"></i>
              <div>
                <h4>${translations[currentLanguage]?.['trial_active'] || 'Período de Trial Ativo'}</h4>
                <p>${(translations[currentLanguage]?.['trial_days_left'] || 'Você tem %s dias restantes no período gratuito.').replace('%s', trialStatus.daysLeft ?? '-')}</p>
                <button id="upgrade-plan-btn" class="upgrade-btn">
                  <i class="fas fa-crown"></i>
                  ${translations[currentLanguage]?.['upgrade_plan'] || 'Fazer Upgrade'}
                </button>
              </div>
            </div>
          </div>
        `;
        trialCard.className = "application-card";
      } else {
        // Banner de trial expirado
        inner = `
          <div class="trial-warning">
            <div class="warning-content">
              <i class="fas fa-exclamation-triangle"></i>
              <div>
                <h4>${translations[currentLanguage]?.['trial_expired'] || 'Período de Trial Expirado'}</h4>
                <p>${translations[currentLanguage]?.['trial_expired_message'] || 'Seu período gratuito de 14 dias expirou. Faça upgrade para continuar usando todas as aplicações.'}</p>
                <button id="upgrade-plan-btn" class="upgrade-btn">
                  <i class="fas fa-crown"></i>
                  ${translations[currentLanguage]?.['upgrade_plan'] || 'Fazer Upgrade'}
                </button>
              </div>
            </div>
          </div>
        `;
        trialCard.className = "application-card";
      }
    } else if (trialStatus && trialStatus.plan && trialStatus.plan !== 'free') {
      // Usuário premium - mostrar informações do plano atual, sem banner de trial
      inner = `
        <div class="premium-status">
          <div class="status-content">
            <i class="fas fa-crown"></i>
            <div>
              <h4>${translations[currentLanguage]?.['premium_plan_active'] ||  'Premium'}</h4>
              <p>${translations[currentLanguage]?.['premium_plan_description'] || 'Acesso completo a todos os recursos'}</p>
            </div>
          </div>
        </div>
      `;
      trialCard.className = "application-card premium-card";
    }
    trialCard.innerHTML = inner;
    // Limpar placeholder e adicionar o card
    trialCardPlaceholder.innerHTML = '';
    trialCardPlaceholder.appendChild(trialCard);
    // Adicionar eventos aos botões
    const upgradeBtn = trialCard.querySelector('#upgrade-plan-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        // Abrir site de pagamentos
        window.electronAPI.openExternal('https://pay.infinitepay.io/charles-roberto-142/VC1DLUMtSQ-AAGvqtNpt-140,00');
      });
    }

  } catch (error) {
    // Silenciar erros de rede
  }
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
    'Limpar': 'Limpar',
    'trial_expired': 'Período de Trial Expirado',
    'trial_expired_message': 'Seu período gratuito de 14 dias expirou. Faça upgrade para continuar usando todas as aplicações.',
    'trial_active': 'Período de Trial Ativo',
    'trial_days_left': 'Você tem %s dias restantes no período gratuito.',
    'upgrade_plan': 'Fazer Upgrade',
    'free_plan_limit': 'Limite do plano gratuito',
    'only_3_apps_allowed': 'Apenas 3 aplicações podem estar ativas no plano gratuito. Aplicações extras foram desativadas.',
    'clear_cache_confirmation': 'Deseja realmente limpar o cache de todas as aplicações?',
    'cache_cleared': 'Cache limpo com sucesso!',
    'cache_clear_error': 'Erro ao limpar cache',
    'save_success': 'Alterações salvas com sucesso!',
    'save_error': 'Erro ao salvar alterações!',
    'Desconhecido': 'Desconhecido',
    'premium_plan_active': 'Premium',
    'premium_plan_description': 'Acesso completo a todos os recursos',
    'manage': 'Gerenciar',
    'premium_only': 'Disponível apenas para usuários premium'
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
    'Sair': 'Logout',
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
    'restart_confirmation': 'The system will be restarted to apply the update. Do you want to continue?',
    'Atualizar': 'Update',
    'OK': 'OK',
    'Erro': 'Error',
    'Limpar': 'Clear',
    'trial_expired': 'Trial Period Expired',
    'trial_expired_message': 'Your 14-day free period has expired. Upgrade to continue using all applications.',
    'trial_active': 'Trial Period Active',
    'trial_days_left': 'You have %s days remaining in your free period.',
    'upgrade_plan': 'Upgrade Plan',
    'only_3_apps_allowed': 'Only 3 applications can be active in the free plan. Extra applications have been deactivated.',
    'free_plan_limit': 'Free plan limit',
    'clear_cache_confirmation': 'Do you really want to clear the cache of all applications?',
    'cache_cleared': 'Cache cleared successfully!',
    'cache_clear_error': 'Error clearing cache',
    'save_success': 'Changes saved successfully!',
    'save_error': 'Error saving changes!',
    'Desconhecido': 'Unknown',
    'premium_plan_active': 'Premium',
    'premium_plan_description': 'Full access to all features',
    'manage': 'Manage',
    'premium_only': 'Available only for premium users'
  }
};

// Função para traduzir os elementos
function translatePage(language) {
  
  // Atualizar o atributo lang do HTML
  document.documentElement.lang = language === 'en-US' ? 'en' : 'pt-BR';
  
  const elements = document.querySelectorAll('[data-translate]');
  
  let translatedCount = 0;
  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    if (translations[language] && translations[language][key]) {
      element.textContent = translations[language][key];
      translatedCount++;
    }
  });
  
  // Traduzir o título da página
  const titleElement = document.querySelector('title[data-translate]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-translate');
    if (translations[language] && translations[language][key]) {
      titleElement.textContent = translations[language][key];
    }
  }
  
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
    
    if (versionButton) {
      versionButton.querySelector('#appVersion').textContent = `v${version}`;
      versionButton.title = `Updates`;
      
      // Remover listener anterior se existir
      versionButton.removeEventListener('click', checkForUpdates);
      
      // Adicionar novo listener
      versionButton.addEventListener('click', () => {
        checkForUpdates();
      });
    } else {
      console.error('Botão de versão não encontrado!');
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
    // Carregar outras informações
    loadApplications();
  // Carregar informações do sistema primeiro
  await loadSystemInfo();

  loadUserInfo();
  // Restaurar configurações de tema e toggles
  setupDarkModeToggle();
  setupNotificationToggle();
  setupCompactLayoutToggle();
  setupFullscreenToggle();
  setupLanguageToggle();
  setupClearCacheButton();
  
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
  // Aguardar um pouco para garantir que tudo esteja carregado
  setTimeout(async () => {
    await initializeSettingsPage();
  }, 100);
});

// Função para verificar atualizações
async function checkForUpdates() {
  try {
    // Obter idioma atual
    const currentLanguage = await window.electronAPI.invoke('get-language');
    
    // Sempre obter a versão atual primeiro
    const currentVersion = await window.electronAPI.getAppVersion();
    
    // Verificar se há atualizações disponíveis
    const latestVersion = await window.electronAPI.checkForUpdates();
    
    // Se não houver nova versão ou se a versão atual for igual à mais recente
    if (!latestVersion || latestVersion === currentVersion) {
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
            window.electronAPI.downloadUpdate();
          }
        });
      }
    });
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
    // Obter idioma atual para mensagem de erro
    const currentLanguage = await window.electronAPI.invoke('get-language');
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
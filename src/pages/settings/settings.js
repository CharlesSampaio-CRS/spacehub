const loadWithToken = (token, userUuid) => {
  fetch(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (Array.isArray(data.applications)) {
      const listContainer = document.getElementById("applicationsList");
      listContainer.innerHTML = "";

      data.applications.forEach(app => {
        const appItem = document.createElement("div");
        appItem.classList.add("application-item");

        appItem.innerHTML = `
          <div class="application-info">
            <img src="${app.icon}" alt="${app.application}" width="32" height="32" />
            <p><strong>${app.application}</strong></p>
          </div>
          <div class="application-toggle">
            <label class="toggle-switch">
              <input type="checkbox" ${app.active ? "checked" : ""} disabled />
              <span class="slider"></span>
            </label>
          </div>
        `;

        listContainer.appendChild(appItem);
      });
    }
  })
  .catch(error => console.error('Error loading applications:', error));
};

const populateUserData = (token, userUuid) => {
  fetch(`https://spaceapp-digital-api.onrender.com/users/${userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data && data.name && data.email && data.plan) {
      document.getElementById("userType").textContent = data.type || "Desconhecido";
      document.getElementById("userName").textContent = data.name;
      document.getElementById("userEmail").textContent = data.email;
      document.getElementById("userPlan").textContent = data.plan;
    }
  })
  .catch(error => console.error('Error loading user data:', error));
};

const setupZoomControl = () => {
  const zoomInput = document.getElementById("zoom-range");
  const zoomValue = document.getElementById("zoom-value");

  zoomInput.addEventListener("input", () => {
    const scale = parseFloat(zoomInput.value);
    zoomValue.textContent = scale.toFixed(1);

    document.body.style.transform = `scale(${scale})`;
    document.body.style.transformOrigin = "center center";
    document.body.style.transition = "transform 0.2s ease";

    const scrollX = (document.body.scrollWidth * scale - window.innerWidth) / 2;
    const scrollY = (document.body.scrollHeight * scale - window.innerHeight) / 2;
    window.scrollTo(scrollX, scrollY);
  });
};

const toggleUpdateButtonState = (isUpdating, updateAvailable, showNoUpdateMessage = false, isDownloading = false) => {
  const updateButton = document.getElementById("update-version-button");

  if (isUpdating) {
    updateButton.disabled = true;
    updateButton.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> Atualizando...`;
  } else if (isDownloading) {
    updateButton.disabled = true;
    updateButton.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> Baixando versão...`;
  } else {
    updateButton.disabled = false;
    if (showNoUpdateMessage) {
      updateButton.innerHTML = `<i class="fas fa-sync-alt"></i> Nenhuma atualização disponível`;
      setTimeout(() => {
        updateButton.innerHTML = `<i class="fas fa-sync-alt"></i> Atualizar versão`;
      }, 3000); // Exibe a mensagem por 3 segundos
    } else if (updateAvailable) {
      updateButton.innerHTML = `<i class="fas fa-sync-alt"></i> Atualizar e Reiniciar`;
      updateButton.addEventListener('click', initiateUpdate);
    } else {
      updateButton.innerHTML = `<i class="fas fa-sync-alt"></i> Atualizar versão`;
    }
  }
};

const initiateUpdate = async () => {
  try {
    toggleUpdateButtonState(true, false); // Desativa o botão enquanto está atualizando

    const updateAvailable = await window.electronAPI.checkForUpdates();
    
    if (updateAvailable) {
      console.log('Nova atualização encontrada!');
      
      // Inicia o download e exibe "Baixando versão..."
      toggleUpdateButtonState(false, updateAvailable, false, true);
      
      // Baixa a atualização
      await window.electronAPI.downloadUpdate();
      
      // Após o download, muda o estado para "Atualizando..."
      toggleUpdateButtonState(true, false);
      
      // Instala a atualização
      await window.electronAPI.installUpdate();
      
      console.log('Atualização instalada com sucesso!');
      
      // Reinicia a aplicação após a instalação
      await window.electronAPI.restartApp();
      
      console.log('Aplicação reiniciada!');
      toggleUpdateButtonState(false, false); // Finaliza o estado após o reinício
    } else {
      console.log('Nenhuma atualização disponível');
      toggleUpdateButtonState(false, false, true); // Exibe "Nenhuma atualização disponível"
    }
  } catch (error) {
    console.error('Erro ao verificar ou atualizar:', error);
    toggleUpdateButtonState(false, false); // Em caso de erro
  }
};

const displayAppVersion = () => {
  window.electronAPI.getAppVersion().then(version => {
    document.getElementById("appVersion").textContent = `Versão: ${version}`;
  }).catch(error => console.error('Erro ao obter a versão da aplicação:', error));
};

const setupDarkModeToggle = () => {
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode", darkModeToggle.checked);
    });
  }
};

const initializeSettingsPage = () => {
  window.electronAPI.invoke('get-token').then(token => {
    if (token) {
      window.electronAPI.invoke('get-userUuid').then(userUuid => {
        if (userUuid) {
          loadWithToken(token, userUuid);
          populateUserData(token, userUuid);
        }
      }).catch(err => console.error('Erro ao obter userUuid:', err));
    }
  }).catch(err => console.error('Erro ao obter token:', err));

  setupZoomControl();
  setupDarkModeToggle();
  displayAppVersion();

  document.getElementById("update-version-button").addEventListener("click", initiateUpdate);
};

initializeSettingsPage();

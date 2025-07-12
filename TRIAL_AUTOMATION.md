# Sistema de Verificação Automática de Trial - SpaceHub

## Visão Geral

O SpaceHub agora possui um sistema completo de verificação automática de trial que executa em diferentes momentos para garantir que os usuários sejam adequadamente limitados após o período de 14 dias.

## Funcionalidades Implementadas

### 1. Verificação ao Abrir o Sistema
- **Momento**: 5 segundos após o sistema ser iniciado
- **Ação**: Verifica todos os usuários free e limita aplicações se necessário
- **Log**: "Executando primeira verificação de trial..."

### 2. Verificação Diária às 00:00
- **Agendamento**: Calcula automaticamente o próximo horário de execução
- **Precisão**: Usa `setTimeout` para execução exata às 00:00
- **Recursivo**: Após cada execução, agenda a próxima para o dia seguinte
- **Log**: "Próxima verificação agendada para: [data/hora]"

### 3. Verificação de Meia-Noite
- **Backup**: Verificação adicional a cada minuto para garantir que não perca a meia-noite
- **Detecção**: Verifica se `now.getHours() === 0 && now.getMinutes() === 0`
- **Log**: "Verificação de meia-noite detectada..."

### 4. Logout Automático
- **Condição**: Usuários free que saíram do trial
- **Momento**: Durante a verificação de meia-noite
- **Ação**: Envia evento `force-logout` para todas as janelas
- **Notificação**: Mostra mensagem por 3 segundos antes do logout

### 5. Limitação de Aplicações
- **Durante o trial**: Acesso ilimitado a todas as aplicações
- **Após o trial**: Apenas **WhatsApp**, **Discord** e **LinkedIn** permanecem ativas
- **Outras aplicações**: São automaticamente desativadas
- **Lógica**: Baseada em lista fixa de aplicações permitidas

## Limitação de Aplicações

### Lógica de Seleção
Após o período de trial de 14 dias, o sistema mantém ativas apenas as seguintes aplicações:

1. **WhatsApp** - Comunicação instantânea
2. **Discord** - Comunicação em equipe
3. **LinkedIn** - Networking profissional

### Implementação
```javascript
// Lista fixa de aplicações permitidas
const allowedApps = ['whatsapp', 'discord', 'linkedin'];

// Verificação case-insensitive
active: allowedApps.includes(app.application.toLowerCase())
```

### Comportamento
- **Durante o trial**: Todas as aplicações funcionam normalmente
- **Após o trial**: Apenas WhatsApp, Discord e LinkedIn permanecem ativas
- **Outras aplicações**: São automaticamente desativadas
- **Usuário pode reativar**: Mas apenas se desativar uma das 3 aplicações permitidas

### Vantagens
- **Previsibilidade**: Usuário sabe exatamente quais apps ficarão ativas
- **Essenciais**: Foca nas aplicações mais importantes para comunicação
- **Simplicidade**: Lógica clara e fácil de entender
- **Flexibilidade**: Fácil de modificar a lista de aplicações permitidas

## Implementação Técnica

### Main Process (`src/main.js`)

#### Trial Manager Aprimorado
```javascript
const trialManager = {
  // Funções existentes...
  
  // Limitar aplicações para usuários free fora do trial
  limitApplicationsForFreeUser: (applications) => {
    // Lista das aplicações que devem permanecer ativas após o trial
    const allowedApps = ['whatsapp', 'discord', 'linkedin'];
    
    // Desativar todas as aplicações exceto as permitidas
    return applications.map(app => ({
      ...app,
      active: allowedApps.includes(app.application.toLowerCase())
    }));
  },
  
  // Novas funções
  getNextExecutionTime: () => {
    // Calcula próximo horário às 00:00
  },
  
  isMidnight: () => {
    // Verifica se é meia-noite
  },
  
  startDailyTrialCheck: () => {
    // Sistema completo de agendamento
  },
  
  manualCheck: async () => {
    // Verificação manual para testes
  }
};
```

#### Handlers IPC Adicionais
- `manual-trial-check`: Executa verificação manual
- `force-logout`: Força logout do usuário
- `check-trial-status`: Verifica status do trial (existente)
- `limit-applications`: Limita aplicações (existente)

### Preload (`src/preload.js`)

#### Novas APIs
```javascript
const trialAPI = {
  // APIs existentes...
  manualTrialCheck: () => ipcRenderer.invoke('manual-trial-check'),
  forceLogout: () => ipcRenderer.invoke('force-logout'),
  onForceLogout: (callback) => ipcRenderer.on('force-logout', callback)
};
```

### Renderer Process

#### Página Principal (`src/pages/index/index.js`)
```javascript
// Listener para logout automático
window.electronAPI.onForceLogout((data) => {
  const { reason, message } = data;
  
  // Mostrar notificação
  // Aguardar 3 segundos
  // Executar logout
});
```

#### Página de Configurações (`src/pages/settings/settings.js`)
```javascript
// Botão de teste manual
const setupTrialTestButton = () => {
  // Cria botão "Testar Trial"
  // Executa verificação manual
  // Mostra feedback visual
};
```

## Fluxo de Execução

### 1. Inicialização do Sistema
```
Sistema inicia
↓
Aguarda 5 segundos
↓
Executa primeira verificação
↓
Agenda próxima execução às 00:00
```

### 2. Verificação Diária
```
00:00 - Execução agendada
↓
Verifica todos os usuários free
↓
Limita aplicações se necessário
↓
Verifica logout automático
↓
Agenda próxima execução (00:00 do dia seguinte)
```

### 3. Logout Automático
```
Usuário free fora do trial detectado
↓
Envia evento force-logout
↓
Mostra notificação por 3 segundos
↓
Limpa dados de autenticação
↓
Fecha todas as janelas
↓
Abre nova janela de login
```

## Logs do Sistema

### Verificação Automática
```
Iniciando sistema de verificação automática de trial...
Próxima verificação agendada para: 01/01/2024 00:00:00
Executando verificação automática de trial...
Usuário user@example.com saiu do trial, limitando aplicações...
Aplicações limitadas para usuário user@example.com
```

### Logout Automático
```
Usuário user@example.com saiu do trial, verificando se está logado...
Usuário user@example.com deve ser deslogado automaticamente
Verificação de meia-noite detectada...
```

### Verificação Manual
```
Executando verificação manual de trial...
Encontrados 5 usuários free
Usuário user1@example.com: Em trial
Usuário user2@example.com: Trial expirado
```

## Testes e Debug

### Botão de Teste Manual
- **Localização**: Página de configurações, após botão "Limpar Cache"
- **Função**: Executa verificação manual imediata
- **Feedback**: Mensagem de sucesso/erro
- **Logs**: Console do main process

### Verificação Manual via Console
```javascript
// No console do main process
await trialManager.manualCheck();
```

## Configuração e Personalização

### Horário de Execução
- **Padrão**: 00:00 (meia-noite)
- **Modificação**: Alterar em `getNextExecutionTime()`

### Intervalo de Verificação
- **Backup**: A cada minuto
- **Modificação**: Alterar em `setInterval(..., 60 * 1000)`

### Delay Inicial
- **Padrão**: 5 segundos
- **Modificação**: Alterar em `setTimeout(..., 5000)`

## Monitoramento

### Logs Importantes
- Inicialização do sistema
- Agendamento de execuções
- Verificações executadas
- Usuários processados
- Erros encontrados

### Métricas Sugeridas
- Número de usuários verificados por dia
- Número de aplicações limitadas
- Número de logouts automáticos
- Tempo de execução das verificações

## Tratamento de Erros

### Fallbacks Implementados
- **API indisponível**: Log de erro, continua funcionamento
- **Usuário não encontrado**: Pula para próximo usuário
- **Erro de rede**: Retry automático na próxima execução

### Graceful Degradation
- Sistema continua funcionando mesmo com erros
- Logs detalhados para debugging
- Notificações visuais para o usuário

## Próximos Passos

1. **Métricas**: Dashboard de monitoramento
2. **Notificações**: Lembretes antes do fim do trial
3. **Configuração**: Interface para ajustar horários
4. **Backup**: Múltiplas verificações por dia
5. **Relatórios**: Relatórios de conversão de trial 
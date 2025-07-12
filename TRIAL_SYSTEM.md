# Sistema de Trial - SpaceHub

## Visão Geral

O SpaceHub implementa um sistema de trial de 14 dias para usuários gratuitos. Após esse período, os usuários são limitados a apenas 3 aplicações ativas simultaneamente.

## Funcionalidades

### 1. Período de Trial (14 dias)
- **Usuários novos**: Todos os usuários começam com plano "free" e têm acesso completo por 14 dias
- **Data de criação**: Armazenada no campo `createdAt` do usuário
- **Cálculo**: O sistema verifica se passaram mais de 14 dias desde a criação da conta

### 2. Limitação de Aplicações
- **Durante o trial**: Acesso ilimitado a todas as aplicações
- **Após o trial**: Máximo de 3 aplicações ativas simultaneamente
- **Aplicações extras**: São automaticamente desativadas

### 3. Verificação Automática
- **Job diário**: Executa a cada 24 horas para verificar usuários que saíram do trial
- **Verificação em tempo real**: Ao carregar aplicações e nas configurações
- **Limitação automática**: Aplicações extras são desativadas automaticamente

## Implementação Técnica

### Main Process (`src/main.js`)

#### Trial Manager
```javascript
const trialManager = {
  // Verifica se usuário está no trial (14 dias)
  isUserInTrial: (userData) => { ... },
  
  // Verifica se usuário pode ter mais de 3 apps
  canUserHaveMoreApps: (userData) => { ... },
  
  // Limita aplicações para usuários free
  limitApplicationsForFreeUser: (applications) => { ... },
  
  // Job diário de verificação
  startDailyTrialCheck: () => { ... }
};
```

#### Handlers IPC
- `check-trial-status`: Verifica status do trial de um usuário
- `limit-applications`: Limita aplicações de um usuário

### Renderer Process

#### Página de Configurações (`src/pages/settings/settings.js`)
- Mostra avisos de trial expirado ou ativo
- Desabilita toggles de aplicações extras
- Valida tentativas de ativar mais de 3 aplicações

#### Página Principal (`src/pages/index/index.js`)
- Verifica trial status ao carregar aplicações
- Mostra notificação quando trial expira
- Limita automaticamente aplicações se necessário

### Preload (`src/preload.js`)
- Expõe APIs de trial para o renderer process
- `checkTrialStatus(userUuid)`
- `limitApplications(userUuid)`

## Fluxo de Funcionamento

### 1. Registro de Usuário
```javascript
// Usuário é criado com:
{
  plan: 'free',
  createdAt: new Date().toISOString()
}
```

### 2. Verificação de Trial
```javascript
// A cada carregamento de aplicações:
const trialStatus = await window.electronAPI.checkTrialStatus(userUuid);
if (trialStatus.plan === 'free' && !trialStatus.isInTrial) {
  // Limitar aplicações
}
```

### 3. Job Diário
```javascript
// Executa a cada 24 horas:
setInterval(async () => {
  // Buscar usuários free
  // Verificar se saíram do trial
  // Limitar aplicações automaticamente
}, 24 * 60 * 60 * 1000);
```

## Interface do Usuário

### Avisos Visuais
- **Trial ativo**: Card verde com dias restantes
- **Trial expirado**: Card vermelho com aviso e botão de upgrade
- **Notificação**: Popup no canto superior direito

### Limitações Visuais
- **Toggles desabilitados**: Para aplicações extras
- **Mensagens explicativas**: "Limite do plano gratuito"
- **Validação em tempo real**: Alerta ao tentar ativar aplicação extra

## Traduções

O sistema suporta português e inglês:

```javascript
const translations = {
  'pt-BR': {
    'trial_expired': 'Período de Trial Expirado',
    'trial_active': 'Período de Trial Ativo',
    'trial_days_left': 'Você tem %s dias restantes no período gratuito.',
    // ...
  },
  'en-US': {
    'trial_expired': 'Trial Period Expired',
    'trial_active': 'Trial Period Active',
    'trial_days_left': 'You have %s days remaining in your free period.',
    // ...
  }
};
```

## Configuração da API

### Endpoints Necessários
- `GET /users/free-users`: Lista usuários com plano free
- `GET /users/{uuid}`: Dados do usuário (incluindo createdAt e plan)
- `PUT /spaces`: Atualizar aplicações do usuário

### Campos do Usuário
- `plan`: 'free' | 'payment' | outros planos
- `createdAt`: Data de criação da conta (ISO string)

## Monitoramento

### Logs do Sistema
```javascript
console.log('Executando verificação diária de trial...');
console.log(`Usuário ${user.email} saiu do trial, limitando aplicações...`);
console.log(`Aplicações limitadas para usuário ${user.email}`);
```

### Tratamento de Erros
- Fallback para comportamento padrão em caso de erro
- Logs detalhados para debugging
- Graceful degradation da funcionalidade

## Próximos Passos

1. **Sistema de Pagamento**: Integração com gateway de pagamento
2. **Planos Premium**: Diferentes níveis de acesso
3. **Métricas**: Dashboard de conversão de trial para pago
4. **Notificações**: Lembretes antes do fim do trial
5. **Personalização**: Configuração do período de trial por plano 
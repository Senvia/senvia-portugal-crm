

# Mover "Alertas por Email" para uma sub-secao geral em Notificacoes

## Problema

Atualmente, a configuracao de "Alertas por Email" esta dentro de Notificacoes > Fidelizacao, mas deveria ser uma configuracao geral que se aplica a todas as notificacoes (Calendario, Fidelizacao, e futuras).

## Solucao

Criar uma nova sub-secao **"Email"** dentro de Notificacoes que centraliza a configuracao de alertas por email para todos os tipos de notificacao.

### Estrutura final de Notificacoes

```text
Notificacoes
  |-- Push (notificacoes no telemovel)
  |-- Calendario (lembretes de eventos)
  |-- Email (configuracao geral de alertas por email)
  |-- Fidelizacao (apenas telecom - dias, eventos calendario)
```

### O que muda

1. **Remover** o card "Alertas por Email" do `FidelizationAlertsSettings.tsx` (fica so com Dias de Antecedencia + Evento de Calendario)
2. **Criar** novo componente `NotificationEmailSettings.tsx` com:
   - Switch para ativar/desativar alertas por email
   - Campo de email destinatario
   - Nota: "Aplica-se a todos os alertas (calendario, fidelizacao, etc.)"
   - Usa os mesmos campos da BD (`fidelization_email_enabled` e `fidelization_email`) -- renomear seria breaking change, por isso mantemos os campos existentes
3. **Adicionar** sub-secao `"notif-email"` no `MobileSettingsNav.tsx` (icone Mail, visivel para todos os nichos)
4. **Registar** o case `"notif-email"` no `Settings.tsx`

## Secao tecnica

### Ficheiros criados

1. `src/components/settings/NotificationEmailSettings.tsx` -- Componente de configuracao geral de email para notificacoes

### Ficheiros alterados

1. `src/components/settings/FidelizationAlertsSettings.tsx` -- Remover o card "Alertas por Email" e os estados/logica associados (emailEnabled, alertEmail)
2. `src/components/settings/MobileSettingsNav.tsx` -- Adicionar `"notif-email"` como sub-secao e tipo
3. `src/pages/Settings.tsx` -- Importar e renderizar `NotificationEmailSettings` no case `"notif-email"`

### Campos da BD (sem alteracao)

Os campos `fidelization_email_enabled` e `fidelization_email` na tabela `organizations` continuam a ser usados, mas agora sao lidos/gravados pelo novo componente geral. Nao e necessaria migracao.


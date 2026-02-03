

## Sistema de Alertas de Fidelização (CPE/CUI)

### Resumo
Implementar um sistema completo de alertas automáticos para notificar quando contratos de fidelização estão a expirar, com configuração via Definições e envio opcional por email.

---

### Funcionalidades

1. **Nova secção "Alertas" nas Definições**
2. **Edge Function CRON para verificar expiração**
3. **Notificações Push automáticas**
4. **Envio opcional de Email**
5. **Widget no Dashboard com expiração próxima**

---

### Estrutura Visual - Configurações de Alertas

```text
┌─────────────────────────────────────────────────────────────┐
│  ⚡ Alertas de Fidelização                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Dias de Antecedência                                 │  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐      │  │
│  │  │ Primeiro alerta     │ │ Segundo alerta      │      │  │
│  │  │ [  30  ] dias       │ │ [  7   ] dias       │      │  │
│  │  └─────────────────────┘ └─────────────────────┘      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [x] Criar evento de "Visita de Renovação"            │  │
│  │      Hora sugerida: [ 10:00 ]                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [x] Receber alertas por email                        │  │
│  │      Email: [ comercial@empresa.pt             ]      │  │
│  │      (Usa as configurações Brevo da organização)      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [ Guardar Configurações ]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Widget no Dashboard

```text
┌─────────────────────────────────────┐
│ ⚡ Fidelizações a Expirar           │
├─────────────────────────────────────┤
│ 🔴 Urgente (7 dias)          2      │
├─────────────────────────────────────┤
│   Maria Silva                       │
│   Energia | EDP | 05/02/2026        │
│   [Ver Cliente]                     │
├─────────────────────────────────────┤
│   João Costa                        │
│   Gás | Galp | 08/02/2026           │
│   [Ver Cliente]                     │
├─────────────────────────────────────┤
│ 🟡 Próximos 30 dias          5      │
│   [Ver todos →]                     │
└─────────────────────────────────────┘
```

---

### Alterações na Base de Dados

**1. Tabela `organizations` - Novos campos de configuração:**

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `fidelization_alert_days` | jsonb | `[30, 7]` | Dias de antecedência para alertas |
| `fidelization_create_event` | boolean | `true` | Criar evento de calendário |
| `fidelization_event_time` | time | `10:00` | Hora do evento sugerido |
| `fidelization_email_enabled` | boolean | `false` | Enviar alertas por email |
| `fidelization_email` | text | `null` | Email para receber alertas |

**2. Tabela `cpes` - Campos de controlo:**

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `alert_30d_sent` | boolean | `false` | Alerta de 30 dias enviado |
| `alert_7d_sent` | boolean | `false` | Alerta de 7 dias enviado |

---

### Nova Edge Function: `check-fidelization-alerts`

Executada diariamente via CRON (09:00):

```text
1. Buscar todas as organizações com alertas configurados

2. Para cada organização:
   a. Buscar CPEs com fidelizacao_end dentro dos dias configurados
   b. Filtrar CPEs que ainda não tiveram alerta enviado
   
3. Para cada CPE a alertar:
   a. Enviar Push Notification
   b. Se email configurado, enviar email via Brevo
   c. Se criar evento ativo, criar evento no calendário
   d. Marcar alerta como enviado
```

---

### Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/functions/check-fidelization-alerts/index.ts` | Edge function CRON |
| `src/components/settings/FidelizationAlertsSettings.tsx` | Interface de configuração |
| `src/components/dashboard/FidelizationAlertsWidget.tsx` | Widget do dashboard |
| `src/hooks/useFidelizationAlerts.ts` | Hook para buscar CPEs a expirar |

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/migrations/` | Adicionar campos à tabela organizations e cpes |
| `src/pages/Settings.tsx` | Adicionar tab "Alertas" |
| `src/components/settings/MobileSettingsNav.tsx` | Adicionar item "Alertas" |
| `src/pages/Dashboard.tsx` | Adicionar widget de fidelizações |
| `src/hooks/useOrganization.ts` | Adicionar campos de fidelização ao update |
| `src/integrations/supabase/types.ts` | Auto-gerado após migração |

---

### Fluxo de Email de Alerta

Quando email está configurado, o sistema envia:

```text
Assunto: ⚠️ Fidelização a expirar - Maria Silva

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🏢 [Logo da Organização]
  
  Olá,
  
  A fidelização do cliente abaixo expira em 7 dias:
  
  ┌────────────────────────────────────┐
  │  Cliente: Maria Silva              │
  │  Empresa: Clínica Dental Sorriso   │
  │  Tipo: Energia                     │
  │  Comercializador: EDP Comercial    │
  │  CPE/CUI: PT0002000012345678XX     │
  │  Data de Expiração: 10/02/2026     │
  └────────────────────────────────────┘
  
  Recomendamos que contacte o cliente para
  renovar ou renegociar o contrato.
  
  [Ver Cliente no CRM →]
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Ordem de Implementação

1. **Migração BD**: Adicionar campos de configuração e controlo
2. **Hook**: Criar `useFidelizationAlerts` para buscar CPEs a expirar
3. **Componente Settings**: Interface de configuração dos alertas
4. **Integrar Settings**: Adicionar nova tab/secção nas Definições
5. **Widget Dashboard**: Mostrar CPEs com expiração próxima
6. **Edge Function**: Criar `check-fidelization-alerts` com lógica de envio
7. **CRON**: Configurar execução diária via pg_cron ou invoke

---

### Detalhes Técnicos

**Query para CPEs a expirar:**
```sql
SELECT 
  c.*,
  cl.name as client_name,
  cl.company as client_company,
  cl.email as client_email,
  cl.phone as client_phone
FROM cpes c
JOIN crm_clients cl ON c.client_id = cl.id
WHERE c.organization_id = $org_id
  AND c.fidelizacao_end IS NOT NULL
  AND c.status = 'active'
  AND (
    (c.fidelizacao_end BETWEEN CURRENT_DATE AND CURRENT_DATE + $days_interval
     AND c.alert_30d_sent = false)
    OR
    (c.fidelizacao_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
     AND c.alert_7d_sent = false)
  )
ORDER BY c.fidelizacao_end ASC;
```

**Estrutura de notificação:**
```typescript
// Push notification
{
  organization_id: "uuid",
  title: "⚠️ Fidelização a expirar em 7 dias",
  body: "Maria Silva | Energia | EDP | 10/02/2026",
  url: "/clients?highlight=client-id"
}

// Email via Brevo (usa configuração da organização)
{
  to: org.fidelization_email,
  subject: "⚠️ Fidelização a expirar - Maria Silva",
  html: "... template com dados do cliente ..."
}
```

---

### Resultado Esperado

- Área de configuração nas Definições para personalizar alertas
- Campo para definir email de notificação
- Push notifications automáticas quando CPE/CUI está a expirar
- Email opcional com detalhes do cliente e contrato
- Widget no Dashboard para visualização rápida
- Eventos de calendário criados automaticamente (opcional)
- Controlo de alertas já enviados para evitar duplicados


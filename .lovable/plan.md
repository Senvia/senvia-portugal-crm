

# Automacoes de Marketing -- Emails com Gatilhos

## Resumo
Criar um sistema de automacoes dentro do modulo de Marketing que permite configurar regras do tipo "quando X acontece, envia Y". Cada automacao liga um gatilho (trigger) a um template de email, com condicoes opcionais e atraso configuravel.

## Exemplos de uso
- "Quando um novo lead entra, enviar email de boas-vindas apos 5 minutos"
- "Quando um lead muda para 'Proposta Enviada', enviar template de follow-up apos 2 dias"
- "Quando um cliente fica inativo, enviar email de reativacao"
- "Quando uma venda e criada, enviar email de parabens ao cliente"

## Arquitetura

O sistema sera composto por 3 camadas:

```text
+-------------------+       +---------------------+       +------------------+
| Tabela            |       | Edge Function        |       | Brevo (email)    |
| email_automations | ----> | process-automation   | ----> | via send-template|
+-------------------+       +---------------------+       +------------------+
        ^                          ^
        |                          |
  UI Settings               DB Triggers / Cron
  (criar regras)             (disparar evento)
```

## Gatilhos Suportados (MVP)

| Gatilho | Evento na BD | Descricao |
|---|---|---|
| `lead_created` | INSERT em `leads` | Novo lead criado |
| `lead_status_changed` | UPDATE em `leads` (status muda) | Lead muda de etapa no pipeline |
| `client_created` | INSERT em `crm_clients` | Novo cliente criado |
| `client_status_changed` | UPDATE em `crm_clients` (status muda) | Cliente muda de estado |
| `sale_created` | INSERT em `sales` | Nova venda registada |
| `proposal_created` | INSERT em `proposals` | Nova proposta criada |

## O que sera criado

### 1. Nova tabela: `email_automations`

Campos principais:
- `id` (uuid, PK)
- `organization_id` (uuid, FK)
- `name` (text) -- nome da automacao
- `trigger_type` (text) -- ex: `lead_created`, `lead_status_changed`
- `trigger_config` (jsonb) -- condicoes especificas, ex: `{"from_status": "novo", "to_status": "contactado"}`
- `template_id` (uuid, FK para `email_templates`)
- `delay_minutes` (integer, default 0) -- atraso antes de enviar (0 = imediato)
- `is_active` (boolean, default true)
- `recipient_type` (text) -- `lead`, `client`, `assigned_user`, `custom`
- `created_by` (uuid)
- `created_at`, `updated_at`
- `last_triggered_at` (timestamptz) -- quando disparou pela ultima vez
- `total_triggered` (integer, default 0) -- contador

### 2. Nova tabela: `automation_queue`

Para emails com atraso (delay > 0):
- `id` (uuid, PK)
- `automation_id` (uuid, FK)
- `organization_id` (uuid)
- `recipient_email` (text)
- `recipient_name` (text)
- `variables` (jsonb)
- `scheduled_for` (timestamptz)
- `status` (text) -- `pending`, `sent`, `failed`, `cancelled`
- `created_at`

### 3. Edge Function: `process-automation`

Recebe o evento (trigger_type + dados), procura automacoes ativas para a organizacao, e:
- Se `delay_minutes = 0`: envia imediatamente via `send-template-email`
- Se `delay_minutes > 0`: insere na `automation_queue` com `scheduled_for = now() + delay`

### 4. Edge Function: `process-automation-queue`

Executada via cron (a cada minuto), processa items pendentes na `automation_queue` cuja `scheduled_for <= now()`.

### 5. Trigger na BD (via pg_net)

Triggers SQL em `leads`, `crm_clients`, `sales` e `proposals` que chamam `process-automation` via HTTP quando ha INSERT ou UPDATE relevante.

### 6. UI -- Pagina de Automacoes

Nova pagina em `/marketing/automations` acessivel a partir do hub de Marketing:
- Lista de automacoes com toggle ativo/inativo
- Modal de criacao com:
  - Nome da automacao
  - Selecionar gatilho (dropdown)
  - Condicoes (dependendo do gatilho, ex: "De qual etapa?" / "Para qual etapa?")
  - Selecionar template de email
  - Configurar atraso (imediato, 5min, 1h, 1 dia, 2 dias, etc.)
  - Tipo de destinatario
- Historico de execucoes (ultimas 20)

## Secao Tecnica

### Migration SQL

```sql
-- Tabela de automacoes
CREATE TABLE public.email_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  delay_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  recipient_type text NOT NULL DEFAULT 'lead',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_triggered_at timestamptz,
  total_triggered integer NOT NULL DEFAULT 0
);

-- Fila de emails agendados
CREATE TABLE public.automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  variables jsonb DEFAULT '{}',
  template_id uuid NOT NULL REFERENCES email_templates(id),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage automations"
  ON public.email_automations FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members can view queue"
  ON public.automation_queue FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Indices
CREATE INDEX idx_automations_org ON email_automations(organization_id);
CREATE INDEX idx_automations_trigger ON email_automations(trigger_type, is_active);
CREATE INDEX idx_queue_scheduled ON automation_queue(status, scheduled_for);
```

### Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| Migration SQL | Tabelas `email_automations` e `automation_queue` |
| `supabase/functions/process-automation/index.ts` | Recebe eventos e dispara/agenda emails |
| `supabase/functions/process-automation-queue/index.ts` | Cron que processa fila de emails agendados |
| `src/hooks/useAutomations.ts` | CRUD de automacoes |
| `src/pages/marketing/Automations.tsx` | Pagina de listagem |
| `src/components/marketing/CreateAutomationModal.tsx` | Modal de criacao/edicao |
| `src/components/marketing/AutomationsTable.tsx` | Tabela de automacoes |
| `src/pages/Marketing.tsx` | Adicionar card "Automacoes" ao hub |

### Ficheiros a editar

| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | Adicionar rota `/marketing/automations` |
| `src/pages/Marketing.tsx` | Adicionar card de Automacoes |

### Triggers SQL (via pg_net para chamar edge function)

Os triggers na BD serao criados para chamar a edge function `process-automation` automaticamente quando:
- Um lead e criado ou muda de status
- Um cliente e criado ou muda de status
- Uma venda e criada
- Uma proposta e criada

Isto garante que as automacoes sao disparadas sem necessidade de codigo no frontend.




## Reestruturar a secao de Webhooks nas Integracoes

### Contexto

Atualmente, na pagina de Integracoes existe um card chamado "n8n / Automacoes" que permite configurar um unico webhook_url na tabela `organizations`. Esse webhook e usado internamente pela edge function `submit-lead` para enviar dados dos formularios ao n8n.

O pedido tem 3 partes:

1. **Renomear** "n8n / Automacoes" para "Webhooks"
2. **Permitir multiplos webhooks** com nome, URL e switch ativar/desativar
3. **Tornar o webhook do Senvia OS fixo e invisivel** -- o URL `https://n8n-n8n.tx2a4o.easypanel.host/webhook/senvia-os` e usado internamente pelo sistema para os formularios e nao deve ser editavel pelo cliente

### Alteracoes

#### 1. Nova tabela `organization_webhooks`

Criar tabela para armazenar multiplos webhooks por organizacao:

```text
organization_webhooks
- id (uuid, PK)
- organization_id (uuid, FK -> organizations)
- name (text, NOT NULL) -- ex: "Notificacao CRM", "Zapier"
- url (text, NOT NULL)
- is_active (boolean, default true)
- is_system (boolean, default false) -- webhooks internos nao editaveis
- created_at (timestamptz)
- updated_at (timestamptz)
```

RLS: membros da org podem SELECT; admins podem INSERT/UPDATE/DELETE (exceto is_system=true); super_admin acesso total.

#### 2. Migracao de dados

- Migrar o `webhook_url` existente de cada organizacao para a nova tabela como um webhook normal (is_system=false)
- O webhook fixo do Senvia OS sera adicionado via codigo na edge function `submit-lead`, nao precisa estar na tabela -- mantendo-o completamente invisivel

#### 3. Novo hook `useOrganizationWebhooks`

- CRUD completo para a tabela `organization_webhooks`
- Filtro para nao mostrar webhooks com `is_system = true`

#### 4. Atualizar `IntegrationsContent.tsx`

- Renomear o card de "n8n / Automacoes" para "Webhooks"
- Substituir o formulario de URL unico por uma lista de webhooks:
  - Cada webhook mostra: nome, URL (truncado), switch ativar/desativar, botao eliminar
  - Botao "Adicionar Webhook" que abre campos inline (nome + URL)
  - Botao "Testar" em cada webhook individual
- O grupo "Automacoes" passa a chamar-se "Webhooks e Automacoes" ou simplesmente manter "Automacoes"

#### 5. Atualizar `submit-lead/index.ts`

- Alem de enviar para os webhooks da tabela `organization_webhooks` (onde `is_active = true`), tambem enviar sempre para o webhook fixo do Senvia OS
- O webhook fixo sera guardado como constante no codigo da edge function, nunca exposto ao frontend
- Remover a dependencia do campo `webhook_url` da tabela `organizations` (manter o campo por retrocompatibilidade mas deixar de o usar)

#### 6. Atualizar `useTestWebhook` em `useOrganization.ts`

- Adaptar para receber o URL do webhook individual em vez de ler de `webhookUrl` state global

#### 7. Atualizar `Settings.tsx`

- Remover o state `webhookUrl` e as props relacionadas, ja que os webhooks passam a ser geridos pelo novo hook
- Simplificar as props passadas a `IntegrationsContent`

### Ficheiros a criar
- `src/hooks/useOrganizationWebhooks.ts`
- Migracao SQL (nova tabela + RLS + migracao de dados)

### Ficheiros a alterar
- `src/components/settings/IntegrationsContent.tsx` -- novo UI de lista de webhooks
- `src/pages/Settings.tsx` -- remover state do webhook antigo
- `supabase/functions/submit-lead/index.ts` -- ler da nova tabela + webhook fixo
- `src/hooks/useOrganization.ts` -- adaptar useTestWebhook


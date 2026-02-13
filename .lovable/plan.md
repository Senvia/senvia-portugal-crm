
# Modulo de Campanhas + Estatisticas de Marketing

## Resumo
Desenvolver o modulo de Campanhas completo e uma pagina de Estatisticas/Relatorios que agrega dados da tabela `email_sends` existente. Adicionalmente, criar uma nova tabela `email_campaigns` para agrupar envios em campanhas nomeadas, e adicionar campos de tracking (opened, clicked) na tabela `email_sends` para receber webhooks da Brevo.

---

## 1. Alteracoes na Base de Dados

### Nova tabela: `email_campaigns`
- `id` (uuid, PK)
- `organization_id` (uuid, FK organizations)
- `name` (text) - Nome da campanha
- `template_id` (uuid, FK email_templates)
- `status` (text: draft, sending, sent, failed)
- `total_recipients` (integer)
- `sent_count` (integer, default 0)
- `failed_count` (integer, default 0)
- `scheduled_at` (timestamptz, nullable) - para envio agendado futuro
- `sent_at` (timestamptz, nullable)
- `created_by` (uuid)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- RLS: organizacao so ve as suas campanhas

### Alterar tabela `email_sends`
- Adicionar `campaign_id` (uuid, FK email_campaigns, nullable) - liga o envio a uma campanha
- Adicionar `opened_at` (timestamptz, nullable) - quando o email foi aberto
- Adicionar `clicked_at` (timestamptz, nullable) - quando o link foi clicado
- Adicionar `brevo_message_id` (text, nullable) - para correlacionar webhooks da Brevo

---

## 2. Edge Function: `brevo-webhook`

Endpoint que recebe webhooks da Brevo para atualizar o estado dos emails (opened, clicked, hard_bounce, soft_bounce, etc.)

- Recebe o payload do webhook da Brevo
- Identifica o email pelo `brevo_message_id` 
- Atualiza `opened_at`, `clicked_at` ou `status` conforme o evento
- `verify_jwt = false` no config.toml (webhook publico)
- Eventos suportados: `delivered`, `opened`, `click`, `hard_bounce`, `soft_bounce`, `blocked`, `spam`, `unsubscribed`

### Alterar Edge Function: `send-template-email`
- Guardar o `messageId` retornado pela API da Brevo no campo `brevo_message_id`
- Receber `campaign_id` opcional e guardar na tabela `email_sends`
- Atualizar contadores na tabela `email_campaigns` (sent_count, failed_count)

---

## 3. Novos Ficheiros Frontend

### Pagina: `src/pages/marketing/Campaigns.tsx`
- Header com botao "Nova Campanha" e seta para voltar a /marketing
- Lista de campanhas em tabela com colunas: Nome, Template, Destinatarios, Enviados, Abertos, Estado, Data
- Badge de status (Rascunho, A enviar, Enviada, Falhada)
- Clique numa campanha abre o detalhe

### Componente: `src/components/marketing/CampaignsTable.tsx`
- Tabela responsiva com dados das campanhas
- Em mobile, layout simplificado tipo card

### Componente: `src/components/marketing/CreateCampaignModal.tsx`
- Step 1: Nome da campanha + Selecionar template (dropdown dos templates ativos)
- Step 2: Selecionar destinatarios (reutilizar a logica do SendTemplateModal - individual ou por filtro)
- Step 3: Confirmar e enviar (ou guardar como rascunho)
- Usa o edge function `send-template-email` com o `campaign_id`

### Componente: `src/components/marketing/CampaignDetailsModal.tsx`
- Metricas da campanha: Total, Enviados, Abertos, Clicados, Erros (cards com numeros)
- Barra de progresso visual
- Lista dos destinatarios com estado individual (enviado, aberto, clicado, erro)
- Mensagem de erro quando aplicavel

### Pagina: `src/pages/marketing/Reports.tsx`
- Cards de metricas globais: Total Enviados, Abertos, Clicados, Erros (com percentagem)
- Grafico de area/barras com envios ao longo do tempo (ultimos 30 dias)
- Tabela com as ultimas campanhas e respetivas metricas
- Filtro por periodo (7d, 30d, 90d)

### Hook: `src/hooks/useCampaigns.ts`
- CRUD de campanhas (create, list, update status)
- Query com join ao template para mostrar o nome

### Hook: `src/hooks/useEmailStats.ts`
- Agrega dados de `email_sends` para estatisticas globais
- Contagem por status (sent, failed, opened, clicked)
- Dados agrupados por dia para graficos
- Filtravel por periodo e campanha

---

## 4. Alteracoes em Ficheiros Existentes

### `src/pages/Marketing.tsx`
- Marcar "Campanhas" e "Relatorios" como `available: true`
- Atualizar os links para as rotas corretas

### `src/App.tsx`
- Adicionar rotas `/marketing/campaigns` e `/marketing/reports`

### `src/types/marketing.ts`
- Adicionar tipos `EmailCampaign`, `CampaignStatus`, `EmailSendWithTracking`

### `supabase/config.toml`
- Adicionar `[functions.brevo-webhook]` com `verify_jwt = false`

---

## 5. Fluxo do Utilizador

```text
Marketing Hub
  |
  +-- Templates (ja existe)
  |
  +-- Campanhas (NOVO)
  |     |-- Lista de campanhas
  |     |-- Criar campanha (nome + template + destinatarios)
  |     |-- Ver detalhe (metricas + lista destinatarios)
  |
  +-- Relatorios (NOVO)
        |-- Cards de metricas globais
        |-- Grafico temporal de envios
        |-- Tabela resumo das campanhas
```

---

## 6. Tracking via Brevo Webhooks

O utilizador precisa configurar o webhook na sua conta Brevo apontando para:
`https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/brevo-webhook`

Eventos a ativar: delivered, opened, click, hard_bounce, soft_bounce, spam

A edge function atualiza os campos `opened_at`, `clicked_at` e `status` na tabela `email_sends`, que sao depois lidos pelas queries de estatisticas.

---

## 7. Design e Responsividade

- Mobile-first em todos os componentes
- Cards de metricas em grid 2x2 em mobile, 4 colunas em desktop
- Tabelas com scroll horizontal ou layout card em mobile
- Modais com `max-h-[90vh]` e scroll interno
- Estilo consistente com o resto do sistema (dark mode compativel)

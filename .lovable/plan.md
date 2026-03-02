

## Diagnóstico

A base de dados confirma o problema: **33 emails ficaram com status "sent"** desde 13 de fevereiro, sem nunca atualizar para "delivered"/"opened". Isto acontece porque o webhook da Brevo não está a chegar ao sistema (sem logs recentes na edge function `brevo-webhook`).

Já tens o `sync-campaign-sends` que sincroniza campanhas, mas emails individuais/manuais não têm mecanismo de sync. O webhook é o único caminho e não está a funcionar.

## Plano: Criar botão "Sincronizar" + edge function de sync global

### 1. Nova edge function `sync-email-statuses`
- Recebe `organizationId`
- Busca todos os `email_sends` com status "sent" dessa org
- Para cada `brevo_message_id`, consulta a API Brevo (`GET /v3/smtp/statistics/events?messageId=...`) para obter o estado real
- Atualiza status, `opened_at`, `clicked_at` na tabela `email_sends`
- Retorna resumo (atualizados, erros)

### 2. Atualizar `src/pages/marketing/Reports.tsx`
- Adicionar botão "Sincronizar" ao lado do botão de refresh
- Ao clicar, chama a edge function `sync-email-statuses`
- Mostra toast com resultado e invalida a query

### 3. Config: `supabase/config.toml`
- Adicionar `[functions.sync-email-statuses]` com `verify_jwt = false`

### Ficheiros
- `supabase/functions/sync-email-statuses/index.ts` (novo)
- `src/pages/marketing/Reports.tsx` (botão sync)
- `supabase/config.toml` (config)


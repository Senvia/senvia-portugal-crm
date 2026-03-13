
Objetivo: fazer os dados reais aparecerem nas campanhas (destinatários/enviados/falhados) e impedir que voltem a zerar.

Diagnóstico confirmado no backend:
- Campanha **“Leads B2B”** está `sent` com `total_recipients=0`, `sent_count=0`, `failed_count=0`.
- Mas na tabela de envios dessa campanha existem **362 registos** (333 enviados/entregues + 29 falhas/bloqueios).
- Causa principal: a sync de campanha pode sobrescrever métricas para zero quando não encontra eventos “relevantes”.
- Causa secundária crítica: o sistema agenda com status `queued`, mas o constraint atual de `email_sends.status` não permite `queued` (nem `unsubscribed`), criando risco de agendamentos sem fila.

Plano de implementação:

1) Corrigir e blindar métricas no backend
- Editar `supabase/functions/sync-campaign-sends/index.ts` para:
  - **Nunca** sobrescrever contadores com zero quando não houver eventos relevantes.
  - Recalcular métricas finais a partir de `email_sends` da própria campanha (fonte de verdade) antes de atualizar `email_campaigns`.
  - Atualizar `total_recipients`, `sent_count`, `failed_count` apenas com base no estado consolidado real.

2) Reparar dados históricos já corrompidos
- Criar migration SQL para backfill de `email_campaigns` com agregação de `email_sends` por `campaign_id`.
- Atualizar apenas campanhas que têm envios associados, para não destruir valores válidos de campanhas ainda não processadas.

3) Corrigir o modelo de estados de envio
- Na mesma migration, atualizar check constraint `email_sends_status_check` para aceitar:
  - `queued` (necessário para agendamento)
  - `unsubscribed` (já usado em webhook/sync)
- Isso evita falhas silenciosas ao agendar campanhas.

4) Evitar sync destrutiva desnecessária no modal
- Ajustar `src/components/marketing/CampaignDetailsModal.tsx`:
  - Auto-sync só para campanhas já enviadas/em envio.
  - Não disparar sync automática para `draft/scheduled` (evita chamadas inúteis e risco de inconsistência).

5) Fortalecer criação de campanha agendada
- Ajustar `src/components/marketing/CreateCampaignModal.tsx`:
  - Validar erro em cada insert batch de `email_sends`.
  - Se falhar, mostrar erro claro e não “confirmar” agendamento como se estivesse tudo certo.

Detalhes técnicos (resumo):
- Arquivos alvo:
  - `supabase/functions/sync-campaign-sends/index.ts`
  - `supabase/migrations/<new>.sql`
  - `src/components/marketing/CampaignDetailsModal.tsx`
  - `src/components/marketing/CreateCampaignModal.tsx`
- Regra de contagem proposta:
  - `total_recipients`: total único por email na campanha
  - `sent_count`: status `sent` + `delivered`
  - `failed_count`: status `failed` + `bounced` + `blocked` + `spam`
- Não requer alteração de permissões/RLS para este fix.

Critérios de aceite:
- “Leads B2B” passa a mostrar valores reais na lista de campanhas (não 0/0/0).
- Abrir detalhes da campanha não volta a apagar métricas.
- Nova campanha agendada cria fila `queued` sem erro.
- Valores da tabela de campanhas ficam alinhados com os registos de `email_sends`.

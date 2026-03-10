

## Diagnóstico: Campanha agendada não foi enviada

### Causa raiz

A campanha **"IA de 2023?"** foi agendada para 06/03/2026 às 17:00, mas **não existe nenhum mecanismo (cron job ou edge function) que processe campanhas agendadas**. 

O sistema apenas:
- Guarda `status: 'scheduled'` e `scheduled_at` na tabela `email_campaigns`
- Mas nunca verifica se alguma campanha chegou à hora de envio

O cron `process-automation-queue` só processa a tabela `automation_queue` (automações de templates), não campanhas de email em massa.

### Solução

**1. Criar edge function `process-scheduled-campaigns`**
- Buscar campanhas com `status = 'scheduled'` e `scheduled_at <= now()`
- Para cada campanha encontrada, obter os destinatários da lista associada
- Enviar via `send-template-email` (ou diretamente via Brevo API)
- Atualizar o status da campanha para `sending` → `sent`
- Registar cada envio na tabela `email_sends`

**2. Criar cron job** (a cada minuto)
- `process-scheduled-campaigns` invocado via `pg_cron` + `pg_net`

**3. Guardar destinatários no agendamento**
- Atualmente quando se agenda, os destinatários selecionados não são persistidos. Precisamos guardar os `selectedClients` (emails/dados) na campanha ou numa tabela auxiliar para que o cron saiba para quem enviar.
- Opção: guardar os recipients no campo `settings_data` da campanha, ou criar registos `email_sends` com status `queued` no momento do agendamento.

### Alterações

| Local | Descrição |
|---|---|
| `supabase/functions/process-scheduled-campaigns/index.ts` | Nova edge function |
| `src/components/marketing/CreateCampaignModal.tsx` | Persistir recipients ao agendar |
| SQL (cron job) | Registar cron para invocar a cada minuto |

### Resultado
- Campanhas agendadas serão processadas automaticamente na hora marcada
- 1 nova edge function + 1 cron job + 1 ficheiro editado




## Plano: Sincronização automática via cron job

O webhook da Brevo já existe mas não está a receber eventos. Em vez de depender do webhook (que requer configuração externa), vamos criar um **cron job** que chama a edge function `sync-email-statuses` automaticamente a cada 5 minutos.

### Alterações

**1. Cron job via `pg_cron` + `pg_net`**
- Criar um SQL que agenda a chamada à `sync-email-statuses` a cada 5 minutos
- A function já existe e funciona — só precisa de ser chamada automaticamente
- Como a sync precisa de `organizationId`, vamos alterar a edge function para suportar um modo `sync_all` que percorre todas as organizações com `brevo_api_key` configurada

**2. Atualizar `supabase/functions/sync-email-statuses/index.ts`**
- Adicionar modo `sync_all`: se não receber `organizationId`, busca todas as orgs com `brevo_api_key` e sincroniza cada uma
- O cron chama sem body, a function trata todas as orgs automaticamente

**3. Remover botão "Sincronizar" de `src/pages/marketing/Reports.tsx`**
- Remover o botão, o state `isSyncing`, a função `handleSync`, e os imports desnecessários (`CloudDownload`, `useAuth`)

### Ficheiros afetados
- `supabase/functions/sync-email-statuses/index.ts` (modo sync_all)
- `src/pages/marketing/Reports.tsx` (remover botão)
- SQL insert para criar o cron job


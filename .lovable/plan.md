

## Plano: Permitir edição/reenvio de campanhas falhadas e agendadas

### Problema
Campanhas com status `failed` ou `scheduled` não podem ser editadas. O utilizador fica sem forma de corrigir e reenviar.

### Solução
Adicionar ação "Reabrir como rascunho" para campanhas `failed` e `scheduled`, que altera o status para `draft` e permite edição normal.

### Alterações

**1. `src/components/marketing/CampaignsTable.tsx`**
- No `DropdownMenu`, adicionar opção "Reabrir como rascunho" para campanhas com status `failed` ou `scheduled`
- Chamar callback `onReopen(campaign.id)`

**2. `src/pages/marketing/Campaigns.tsx`**
- Adicionar handler `handleReopen` que faz update do status para `draft` via Supabase
- Passar `onReopen` ao `CampaignsTable`

**3. `src/hooks/useCampaigns.ts`**
- Adicionar mutation `useReopenCampaign` que atualiza `status = 'draft'` e limpa `sent_at`, `sent_count`, `failed_count`
- Limpar registos `email_sends` associados (para permitir reenvio limpo)

### Resultado
- Campanhas falhadas ou agendadas podem ser reabertas, editadas e reenviadas
- 3 ficheiros editados


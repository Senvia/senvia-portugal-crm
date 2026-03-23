

## Corrigir erro na Edge Function "generate-prospects"

### Problema
A edge function `generate-prospects` faz polling síncrono do Apify por até 5 minutos (`MAX_POLL_MS = 5 * 60 * 1000`), mas as edge functions do Supabase têm um timeout máximo de ~150 segundos. O run do Apify demora mais que isso, causando timeout e o erro "non-2xx status code".

Possível problema adicional: o `getUser()` pode estar a falhar por questões de token — mas o timeout é a causa mais provável.

### Solução

Reestruturar para um modelo **assíncrono em 2 passos**:

1. **Passo 1 — Iniciar run** (`generate-prospects`): Envia o pedido ao Apify, guarda o `runId` numa tabela `prospect_generation_jobs` e retorna imediatamente ao cliente.

2. **Passo 2 — Verificar resultado** (`check-prospect-job`): Nova edge function que o frontend chama via polling (a cada 10s) para verificar se o run do Apify terminou. Quando terminar, processa os resultados e insere na tabela `prospects`.

### Alterações

**1) Migration — criar tabela `prospect_generation_jobs`**
- `id`, `organization_id`, `user_id`, `apify_run_id`, `status` (pending/running/completed/failed), `search_params` (jsonb), `result` (jsonb), `error`, `created_at`, `completed_at`
- RLS: membros da org podem ler os seus jobs

**2) `supabase/functions/generate-prospects/index.ts`** — simplificar
- Remover todo o polling e processamento de dataset
- Apenas: validar auth → chamar Apify para iniciar run → guardar job na tabela → retornar `{ jobId }`
- Execução em <5 segundos, sem timeout

**3) `supabase/functions/check-prospect-job/index.ts`** — nova edge function
- Recebe `jobId`
- Verifica status do run no Apify
- Se ainda está a correr: retorna `{ status: 'running' }`
- Se terminou: busca dataset, processa items, insere/atualiza prospects, marca job como completed, retorna resultado final

**4) `src/hooks/useProspects.ts`** — alterar `useGenerateProspects`
- Passo 1: `supabase.functions.invoke('generate-prospects')` → recebe `jobId`
- Passo 2: polling com `setInterval` (10s) chamando `check-prospect-job` até ter resultado
- Mostrar estado de progresso no toast/UI

**5) `src/components/prospects/GenerateProspectsDialog.tsx`** — UX de progresso
- Após submeter, mostrar estado "A pesquisar no Google Maps..." com spinner
- Atualizar quando job concluir ou falhar

### Ficheiros alterados/criados
| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Criar tabela `prospect_generation_jobs` |
| `supabase/functions/generate-prospects/index.ts` | Simplificar (só iniciar run) |
| `supabase/functions/check-prospect-job/index.ts` | Nova (verificar + processar) |
| `src/hooks/useProspects.ts` | Polling assíncrono |
| `src/components/prospects/GenerateProspectsDialog.tsx` | UX de progresso |


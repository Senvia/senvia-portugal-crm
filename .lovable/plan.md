

## Sincronizacao Automatica de Notas de Credito

### Objetivo

As notas de credito devem ser importadas automaticamente do InvoiceXpress sem necessidade de clicar no botao "Sincronizar". O botao permanece disponivel para sincronizacao manual quando necessario.

### Implementacao

#### 1. Cron Job no Postgres (pg_cron + pg_net)

Configurar um cron job que chama a edge function `sync-credit-notes` automaticamente a cada hora (ou outra frequencia desejada). O job faz um HTTP POST para a edge function com o `organization_id` de cada organizacao que tenha credenciais InvoiceXpress configuradas.

#### 2. Adaptar a Edge Function

A edge function `sync-credit-notes` precisa de suportar chamadas sem token de utilizador (chamadas internas via cron). Quando chamada pelo cron, usa a service role key para autenticacao e itera por todas as organizacoes com credenciais InvoiceXpress configuradas (ou recebe o `organization_id` no body).

#### 3. Sync ao Abrir a Tab (UX imediata)

Adicionalmente, no frontend, ao abrir a tab "Notas de Credito" pela primeira vez na sessao, disparar automaticamente a sincronizacao em background (sem bloquear a UI). O utilizador ve os dados existentes imediatamente e, se houver novos, aparecem quando a sync termina.

---

### Seccao Tecnica

**Cron Job SQL (executado via Run SQL, nao migracao):**

```text
SELECT cron.schedule(
  'sync-credit-notes-hourly',
  '0 * * * *',   -- a cada hora
  $$ SELECT net.http_post(
    url := 'https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/sync-credit-notes',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body := '{"sync_all": true}'::jsonb
  ) AS request_id; $$
);
```

**Edge Function - Alteracoes em `sync-credit-notes/index.ts`:**

| Alteracao | Detalhe |
|---|---|
| Novo modo `sync_all` | Quando `body.sync_all = true`, a funcao busca todas as organizacoes com `invoicexpress_account_name` e `invoicexpress_api_key` preenchidos e sincroniza cada uma |
| Auth flexivel | Se nao ha header Authorization, aceitar apenas se o body contem `sync_all: true` (chamada interna do cron). Usar service role para todas as operacoes |
| Resposta agregada | Retornar totais agregados de todas as organizacoes processadas |

**Frontend - Alteracoes em `CreditNotesContent.tsx`:**

| Alteracao | Detalhe |
|---|---|
| Auto-sync ao montar | Usar `useEffect` para chamar `syncCreditNotes.mutate()` automaticamente na primeira renderizacao do componente |
| Evitar duplicacao | Usar uma ref (`hasSynced`) para garantir que so sincroniza uma vez por sessao |
| Loading discreto | Mostrar um indicador subtil (spinner pequeno no header) durante a sync automatica, sem bloquear a tabela |

**Ficheiros a modificar:**

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/sync-credit-notes/index.ts` | Adicionar modo `sync_all` que itera por todas as orgs com credenciais IX |
| `src/components/finance/CreditNotesContent.tsx` | Adicionar auto-sync via `useEffect` ao montar o componente |

**SQL a executar manualmente (cron job):** Inserir via ferramenta de SQL para agendar a chamada horaria a edge function.


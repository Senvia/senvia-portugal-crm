
## Trial Gratuito de 14 Dias (Sem Cartao) + Bloqueio Pos-Trial

### Resumo
Quando uma organizacao e criada, ela tem 14 dias gratuitos para usar o sistema sem precisar de cartao. Apos os 14 dias, se nao tiver subscricao ativa, o sistema bloqueia completamente com um popup que so permite ir para a pagina de planos. Se passarem 60 dias sem pagamento, os dados da organizacao sao apagados.

---

### 1. Coluna `trial_ends_at` na tabela `organizations` (Migracao SQL)

Adicionar coluna `trial_ends_at TIMESTAMPTZ` com valor default de `now() + 14 days`. Para organizacoes existentes com billing_exempt, nao se aplica. Para as restantes, definir `trial_ends_at = created_at + 14 days`.

```text
ALTER TABLE organizations 
ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');

-- Backfill para organizacoes existentes
UPDATE organizations 
SET trial_ends_at = created_at + interval '14 days'
WHERE billing_exempt = false;

-- Organizacoes isentas nao precisam de trial
UPDATE organizations 
SET trial_ends_at = NULL
WHERE billing_exempt = true;
```

### 2. Atualizar Edge Function `check-subscription`

Adicionar logica de trial a resposta:
- Se a organizacao e `billing_exempt`, comportamento atual (retorna elite)
- Se tem subscricao ativa no Stripe, comportamento atual
- Se **NAO** tem subscricao e `trial_ends_at` ainda nao passou: retornar `{ subscribed: false, on_trial: true, trial_ends_at: "...", days_remaining: X }`
- Se **NAO** tem subscricao e `trial_ends_at` ja passou: retornar `{ subscribed: false, on_trial: false, trial_expired: true, trial_ends_at: "..." }`

Durante o trial, o plano da organizacao deve ser `starter` (acesso basico).

### 3. Atualizar Hook `useStripeSubscription.ts`

Adicionar campos a interface `SubscriptionStatus`:
- `on_trial?: boolean`
- `trial_ends_at?: string`
- `trial_expired?: boolean`
- `days_remaining?: number`

### 4. Criar Componente `TrialExpiredBlocker`

Um componente full-screen (nao um dialog que pode ser fechado) que:
- Mostra mensagem clara: "O seu periodo de teste de 14 dias terminou"
- Explica que tem 60 dias para escolher um plano antes dos dados serem apagados
- Mostra os dias restantes ate a eliminacao dos dados
- Tem um unico botao: "Escolher Plano" que redireciona para `/settings` (tab de faturacao)
- NAO pode ser fechado nem ignorado (sem botao X, sem clicar fora)

### 5. Integrar Bloqueio no `ProtectedRoute`

Adicionar verificacao no `ProtectedRoute`:
- Apos autenticacao e selecao de organizacao, verificar o estado do trial/subscricao
- Se `trial_expired === true` e `subscribed === false` e nao e `billing_exempt`:
  - Se a rota atual e `/settings` (pagina de planos), permitir acesso
  - Caso contrario, mostrar o `TrialExpiredBlocker`
- Se esta em trial ativo, permitir acesso normal

### 6. Banner de Trial Ativo (Opcional mas recomendado)

Na `AppLayout` ou `MobileHeader`, mostrar um banner discreto durante o trial:
- "Periodo de teste: X dias restantes"
- Link para escolher plano

### 7. Limpeza Automatica aos 60 Dias (Cron Job)

Criar uma edge function `cleanup-expired-trials` que:
- Procura organizacoes onde `trial_ends_at + 60 days < now()` e sem subscricao ativa
- Apaga todos os dados dessas organizacoes (leads, clientes, vendas, etc.)
- Marca a organizacao como eliminada ou apaga-a

Agendar via `pg_cron` para correr diariamente.

---

### Detalhes Tecnicos

| Ficheiro | Alteracao |
|----------|-----------|
| Migracao SQL | Adicionar `trial_ends_at` a `organizations` |
| `supabase/functions/check-subscription/index.ts` | Retornar estado do trial |
| `src/hooks/useStripeSubscription.ts` | Novos campos de trial na interface |
| `src/components/auth/TrialExpiredBlocker.tsx` | Novo componente full-screen bloqueante |
| `src/components/auth/ProtectedRoute.tsx` | Verificar trial expirado e bloquear |
| `src/components/layout/AppLayout.tsx` | Banner de trial ativo |
| `supabase/functions/cleanup-expired-trials/index.ts` | Nova edge function para limpeza |
| `pg_cron` | Agendar limpeza diaria |

### Fluxo do Utilizador

```text
Registo -> 14 dias gratis (sem cartao)
  |
  v
Dia 1-14: Usa o sistema normalmente (plano Starter)
           Banner discreto mostra dias restantes
  |
  v
Dia 15: Trial expirou
         Popup bloqueante em todas as paginas
         So pode ir a pagina de planos
  |
  v
Dia 15-74: Escolhe plano -> Sistema desbloqueado
           OU nao escolhe -> Continua bloqueado
  |
  v
Dia 75 (60 dias apos trial): Dados apagados automaticamente
```

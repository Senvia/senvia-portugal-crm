

# Trial com Acesso Total + Pagina de Selecao de Plano

## Resumo

Durante os 14 dias de trial, o cliente tem acesso a **todos os modulos** (como se fosse Elite). A pagina de Plano e Faturacao mostra os 3 planos com botoes "Selecionar" (em vez de "Fazer Upgrade/Downgrade"). Apos os 14 dias sem plano escolhido, o sistema bloqueia (ja funciona assim com o `TrialExpiredBlocker`).

## Alteracoes

### 1. Edge Function `check-subscription` -- trial retorna plan_id = 'elite'

Atualmente, quando o utilizador esta em trial, a funcao `buildTrialResponse` retorna `plan_id: 'starter'`. Alterar para retornar `plan_id: 'elite'` durante o trial, para que todos os modulos fiquem desbloqueados.

Tambem sincronizar `organizations.plan = 'elite'` enquanto o trial esta ativo, para que o `useSubscription` carregue as features do plano Elite.

### 2. `useSubscription` -- nao bloquear modulos durante trial

O hook `useSubscription` usa `organization.plan` para determinar quais modulos estao bloqueados. Como a edge function agora sincroniza `plan = 'elite'` durante o trial, os modulos ficam todos desbloqueados automaticamente. Nao e preciso alterar este hook.

### 3. `BillingTab` -- botoes "Selecionar" quando nao tem subscricao

Alterar a logica dos botoes na pagina de faturacao:
- Se `subscriptionStatus.subscribed === false` (trial ou trial expirado): todos os planos mostram botao **"Selecionar"** que abre o checkout
- Se `subscriptionStatus.subscribed === true`: manter logica atual (Plano Atual / Fazer Upgrade / Fazer Downgrade)
- Remover o badge "Atual" quando o utilizador esta em trial (nao tem plano real)

### 4. Nao mostrar status "Plano Atual: Starter" durante trial

Na secao de status do billing, se o utilizador esta em trial (nao subscrito), nao mostrar o bloco de "Subscricao Ativa". Adicionar um bloco especifico de trial com a informacao dos dias restantes.

## Secao Tecnica

### Ficheiro: `supabase/functions/check-subscription/index.ts`
- Na funcao `buildTrialResponse`, alterar `plan_id: 'starter'` para `plan_id: 'elite'` quando o trial ainda esta ativo
- Adicionar sync do plan para 'elite' na org durante o trial (precisa receber orgId como parametro)

### Ficheiro: `src/components/settings/BillingTab.tsx`
- Adicionar variavel `isOnTrial` baseada em `subscriptionStatus?.on_trial === true`
- Adicionar variavel `hasNoSubscription` baseada em `!subscriptionStatus?.subscribed`
- Quando `hasNoSubscription`: botao mostra "Selecionar" para todos os planos e dispara `createCheckout`
- Quando `hasNoSubscription`: nao mostrar badge "Atual" em nenhum plano
- Adicionar bloco de trial ativo com dias restantes quando `isOnTrial === true`

### Ficheiro: `supabase/functions/check-subscription/index.ts` (detalhe)
- Alterar a funcao `buildTrialResponse` e o fluxo principal para passar `orgId` e fazer o update do plan


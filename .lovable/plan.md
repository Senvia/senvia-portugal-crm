

## Isentar Senvia Agency e Perfect2Gether do Pagamento

### Problema
Atualmente, a edge function `check-subscription` verifica o Stripe e pode devolver `subscribed: false` para estas organizacoes, o que potencialmente remove o plano Elite se nao houver subscricao ativa no Stripe.

### Solucao

#### 1. Adicionar coluna `billing_exempt` na tabela `organizations` (Migracao SQL)
- Nova coluna `billing_exempt BOOLEAN DEFAULT false`
- Marcar as duas organizacoes com `billing_exempt = true`

#### 2. Atualizar a edge function `check-subscription`
- Antes de verificar o Stripe, consultar a organizacao do utilizador
- Se `billing_exempt = true`, retornar imediatamente `subscribed: true` com `plan_id: 'elite'` e sem data de fim, sem tocar no Stripe
- Isto garante que nunca sao desgraduadas

#### 3. Atualizar o componente `BillingTab`
- Detetar se a organizacao e isenta (novo campo ou verificar o slug/id)
- Mostrar uma badge especial (ex: "Plano Vitalicio" ou "Isento") em vez do botao "Fazer Upgrade"
- Esconder os botoes de checkout e portal do Stripe para estas organizacoes

### Detalhes Tecnicos

**Migracao SQL:**
```sql
ALTER TABLE organizations ADD COLUMN billing_exempt BOOLEAN DEFAULT false;
UPDATE organizations SET billing_exempt = true
WHERE id IN ('06fe9e1d-9670-45b0-8717-c5a6e90be380', '96a3950e-31be-4c6d-abed-b82968c0d7e9');
```

**Edge function `check-subscription`:**
- Apos autenticar o utilizador, buscar a organizacao via `organization_members`
- Consultar `billing_exempt` da organizacao
- Se `true`: retornar `{ subscribed: true, plan_id: 'elite', billing_exempt: true, subscription_end: null }` e nao contactar o Stripe

**Componente `BillingTab`:**
- O `subscriptionStatus` passa a incluir `billing_exempt`
- Se `billing_exempt === true`: mostrar badge "Plano Vitalicio" e desativar todos os botoes de checkout/upgrade
- Manter a visualizacao dos planos para referencia mas sem acoes de compra

| Ficheiro | Alteracao |
|----------|-----------|
| Migracao SQL | Adicionar coluna `billing_exempt`, marcar 2 orgs |
| `supabase/functions/check-subscription/index.ts` | Verificar `billing_exempt` antes do Stripe |
| `src/components/settings/BillingTab.tsx` | Badge especial e esconder botoes para orgs isentas |

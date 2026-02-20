
## Problema

O campo "Plano" aparece vazio porque o tipo `OrganizationPlan` e o mapa `PLAN_LABELS` em `src/types/index.ts` estao desatualizados. Apenas definem `basic` e `pro`, mas a base de dados tem valores como `starter`, `pro` e `elite` (Perfect2Gether tem `plan: 'elite'`). Como `'elite'` nao existe no mapa, o Badge fica sem texto.

## Solucao

1. **Atualizar `OrganizationPlan` em `src/types/index.ts`**
   - Mudar de `'basic' | 'pro'` para `'starter' | 'pro' | 'elite'`
   - Atualizar `PLAN_LABELS` para incluir os tres planos:
     - `starter: 'Starter'`
     - `pro: 'Pro'`
     - `elite: 'Elite'`

2. **Atualizar o Badge em `src/components/settings/GeneralContent.tsx`**
   - Ajustar a logica de `variant` do Badge para suportar os tres planos (ex: `elite` e `pro` com destaque, `starter` como secundario)
   - O fallback `'Basico'` muda para `'Starter'` quando nao ha plano definido

## Detalhes Tecnicos

**Ficheiro: `src/types/index.ts`** (linha 7 e linhas 112-115)
- `OrganizationPlan` passa a: `'starter' | 'pro' | 'elite'`
- `PLAN_LABELS` passa a: `{ starter: 'Starter', pro: 'Pro', elite: 'Elite' }`

**Ficheiro: `src/components/settings/GeneralContent.tsx`** (linhas 95-96)
- Badge variant: `organization?.plan === 'elite' || organization?.plan === 'pro' ? 'default' : 'secondary'`
- Fallback text: `'Starter'` em vez de `'Basico'`

**Ficheiro: `src/types/index.ts` (tipo Organization, linha 22)**
- O campo `plan` ja e do tipo `OrganizationPlan`, portanto atualizar o type propaga automaticamente.

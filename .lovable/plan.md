

## Comissões Recorrentes sobre Pagamentos Stripe

### Conceito

Os comerciais da Senvia criam vendas associando um plano (Starter/Pro/Elite) a uma organização cliente. Quando o Stripe processa um pagamento mensal com sucesso para esse cliente, o sistema regista automaticamente uma comissão para o comercial que fez a venda original.

### Alterações

**1. Nova tabela: `stripe_commission_records`**
- `id`, `organization_id` (Senvia), `sale_id`, `user_id` (comercial), `client_org_id`, `amount`, `commission_rate`, `commission_amount`, `stripe_invoice_id`, `period_start`, `period_end`, `plan`, `status` (pending/paid), `created_at`
- RLS: membros da org podem ver

**2. Nova coluna em `sales`: `client_org_id` (uuid, nullable)**
- Liga a venda à organização cliente que vai subscrever no Stripe
- Permite rastrear qual comercial vendeu qual plano a qual empresa

**3. Atualizar `CreateSaleModal.tsx`**
- Novo modo "Venda de Plano Senvia": quando o utilizador está na org Senvia, mostrar opção de selecionar plano (Starter/Pro/Elite) como produto
- Campo para selecionar/pesquisar organização cliente (por nome/slug)
- O `total_value` é preenchido automaticamente com o valor mensal do plano
- `has_recurring = true`, `recurring_value` = preço do plano

**4. Atualizar `stripe-webhook/index.ts`**
- Adicionar handler para evento `invoice.paid`
- Quando um invoice é pago:
  1. Encontrar a organização cliente pelo email
  2. Buscar venda na Senvia org com `client_org_id` = org do cliente e status ativo
  3. Se existe venda com comercial atribuído:
     - Calcular comissão (rate global ou individual)
     - Inserir registo em `stripe_commission_records`

**5. Novo hook: `src/hooks/useStripeCommissions.ts`**
- Busca `stripe_commission_records` filtrado por mês
- Agrupa por comercial com totais

**6. Atualizar `CommissionsPayableModal.tsx` ou criar tab separada**
- Nova secção/tab "Comissões Recorrentes" que mostra:
  - Tabela com: Comercial, Cliente, Plano, Valor Pago, % Comissão, Valor Comissão, Data
  - Totais por comercial
  - Filtro por mês

**7. Widget no Dashboard**
- Card "Comissões Recorrentes" com total do mês (para admin e comercial individual)

### Fluxo

```text
Comercial cria Venda
  → Seleciona Plano (Pro €99/mês)
  → Associa Organização Cliente
  → Sale criada com client_org_id + has_recurring

Cliente subscreve no Stripe e paga
  → Webhook "invoice.paid" dispara
  → Sistema encontra org do cliente
  → Busca sale na Senvia com client_org_id
  → Calcula comissão (ex: 10% de €99 = €9.90)
  → Insere stripe_commission_records

Mês seguinte, cliente paga novamente
  → Mesmo fluxo → nova comissão registada
```

### Ficheiros
- Migration: nova tabela `stripe_commission_records` + coluna `client_org_id` em `sales`
- `supabase/functions/stripe-webhook/index.ts` — handler `invoice.paid` com lógica de comissão
- `src/components/sales/CreateSaleModal.tsx` — modo de venda de plano com seleção de org cliente
- `src/hooks/useStripeCommissions.ts` — novo hook para dados de comissões recorrentes
- `src/components/finance/CommissionsPayableModal.tsx` — tab/secção de comissões recorrentes
- `src/components/dashboard/CommissionsWidget.tsx` — card de comissões recorrentes


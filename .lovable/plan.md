

## Preencher valor do plano ao criar venda Senvia

### Problema
Ao criar uma venda de plano, o valor fica 0€ porque o sistema não consulta qual plano o cliente tem. O comercial fica confuso.

### Solução

Quando o comercial seleciona a organização cliente, buscar o campo `plan` dessa organização e preencher automaticamente o `total_value` e `recurring_value` com o preço do plano (`STRIPE_PLANS`).

### Alterações — `src/components/sales/CreateSaleModal.tsx`

1. **Importar `STRIPE_PLANS` e `getPlanById`** de `@/lib/stripe-plans.ts` (o import foi removido antes, restaurar)

2. **Ao selecionar a organização cliente** (`clientOrgId`), buscar o `plan` da org na BD:
```typescript
// Quando clientOrgId muda, buscar o plano da org e preencher o preço
useEffect(() => {
  if (!isPlanSale || !clientOrgId) return;
  supabase
    .from("organizations")
    .select("plan")
    .eq("id", clientOrgId)
    .single()
    .then(({ data }) => {
      const plan = data?.plan ? getPlanById(data.plan) : null;
      if (plan) {
        // Preencher com o preço mensal do plano
        setItems([{ id: crypto.randomUUID(), product_id: null, name: `Plano ${plan.name}`, quantity: 1, unit_price: plan.priceMonthly }]);
      }
    });
}, [clientOrgId, isPlanSale]);
```

3. **No submit**, o `total` já será calculado automaticamente pelo `useMemo` existente (subtotal dos items), então `total_value` e `recurring_value` terão o valor correto do plano.

4. O webhook Stripe continua a sobrescrever com o valor real cobrado (caso haja desconto/cupão), mantendo a precisão.

### Resultado
- Venda criada já mostra 49€/99€/147€ conforme o plano do cliente
- Se o Stripe cobrar valor diferente (desconto), o webhook atualiza
- 1 ficheiro editado


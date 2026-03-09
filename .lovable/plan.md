

## Corrigir: Venda de plano Senvia bloqueada por validação

### Problema
Na linha 697 do `CreateSaleModal.tsx`:
```typescript
const isValid = (items.length > 0 || total > 0);
```
Para vendas de plano Senvia, o total é 0€ e não há itens adicionados (o valor vem do Stripe). Logo `isValid = false` e o botão "Criar Venda" fica desativado.

### Solução — 1 linha

Alterar a validação para incluir vendas de plano:

```typescript
const isValid = (items.length > 0 || total > 0 || isPlanSale);
```

Quando `isPlanSale` é `true`, a venda é válida mesmo sem itens/valor — basta ter a organização cliente selecionada (validação já existe no `handleSubmit`).

### Ficheiro
`src/components/sales/CreateSaleModal.tsx` — linha 697


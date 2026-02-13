

# Corrigir cores do grafico + Adicionar "Atrasados"

## O que muda

### 1. Corrigir cores do grafico (Finance.tsx)
Substituir as variaveis CSS inexistentes por cores directas:
- **Recebido**: Verde (`#10b981`)
- **Agendado**: Azul (`#3b82f6`)
- **Despesas**: Vermelho (`#ef4444`)
- **Atrasados** (novo): Laranja (`#f97316`)

### 2. Novo card "Atrasados" (Finance.tsx)
Card que mostra o total de pagamentos pendentes cuja data ja passou (vencidos). Usa icone `AlertTriangle` em laranja. Clicavel, navega para `/financeiro/pagamentos?status=overdue`.

### 3. Nova metrica no hook (useFinanceStats.ts)
Calcular `totalOverdue` e `overdueCount`: pagamentos com status `pending` e `payment_date < hoje`.

### 4. Nova serie no grafico (Finance.tsx)
Adicionar area "Atrasados" em laranja no grafico de Fluxo de Caixa, mostrando pagamentos vencidos por dia.

### 5. Tipos actualizados (types/finance.ts)
- Adicionar `overdue` ao `CashflowPoint`
- Adicionar `totalOverdue`, `overdueCount` ao `FinanceStats`

## Detalhe tecnico

### `src/types/finance.ts`
```typescript
// CashflowPoint - adicionar campo
overdue: number;

// FinanceStats - adicionar campos
totalOverdue: number;
overdueCount: number;
```

### `src/hooks/useFinanceStats.ts`
Calcular pagamentos atrasados (pendentes com data anterior a hoje):
```typescript
const overduePayments = filteredPayments.filter(p => {
  if (p.status !== 'pending') return false;
  const date = parseISO(p.payment_date);
  return date < startOfDay(now);
});
const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);
```
No loop do cashflow trend, adicionar calculo de `overdue` por dia.

### `src/pages/Finance.tsx`
- Corrigir todas as cores do grafico (gradientes + areas)
- Adicionar gradiente laranja `colorOverdue`
- Adicionar `<Area>` para "Atrasados" em laranja
- Adicionar card "Atrasados" na grid (alterar grid para 7 colunas ou manter 6 reorganizando)
- Adicionar `<Legend>` ao grafico para identificar series

### Ficheiros alterados
- `src/types/finance.ts`
- `src/hooks/useFinanceStats.ts`
- `src/pages/Finance.tsx`


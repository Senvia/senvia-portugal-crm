

## Adicionar accordion com vendas por comercial na Análise de Comissões

### Problema
Atualmente a tabela mostra apenas totais por comercial, sem forma de ver quais vendas/CPEs compõem esses valores.

### Solução
Transformar cada linha da tabela num accordion que, ao expandir, mostra a lista de CPEs (vendas) desse comercial com os detalhes individuais.

### Alterações

**1. `src/hooks/useCommissionAnalysis.ts`**
- Adicionar campo `cpes: CpeDetail[]` à interface `CommissionAnalysisCommercial`
- No mapeamento dos dados, passar `commercial.cpes` do `useLiveCommissions` para cada entrada

**2. `src/components/finance/CommissionAnalysisTab.tsx`**
- Substituir a `Table` estática por um `Accordion` (tipo "multiple") onde cada `AccordionItem` é um comercial
- O `AccordionTrigger` mostra a linha resumo (nome, valor a receber, base, chargeback, diferencial) numa grid
- O `AccordionContent` mostra uma sub-tabela com os CPEs individuais: código da venda, serial number do CPE, consumo anual, margem, e comissão indicativa (valor a receber)
- Manter o mesmo estilo visual (tabular-nums, formatCurrency)

### Estrutura visual

```text
▶ COMERCIAL A    │ 549.76€ │ 4 │ 0.00€ │ 0 │ 549.76€ │ 4
  ┌─────────────────────────────────────────────────┐
  │ Venda   │ CPE              │ Consumo │ Comissão │
  │ 0022    │ ...6209NJ        │ 13 649  │ 414.52€  │
  │ 0022    │ ...3735BE        │    869  │  25.89€  │
  │ 0022    │ ...2618WL        │    489  │  14.04€  │
  │ 0022    │ ...4369TZ        │  3 095  │  95.31€  │
  └─────────────────────────────────────────────────┘
▶ COMERCIAL B    │ 368.91€ │ 1 │ 0.00€ │ 0 │ 368.91€ │ 1
```

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — adicionar CPEs à interface e mapeamento
- `src/components/finance/CommissionAnalysisTab.tsx` — accordion com sub-tabela


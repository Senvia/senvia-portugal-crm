

## Adicionar nota "Valor a Receber" no card Chargebacks (CB)

### O que fazer

**Ficheiro: `src/components/finance/CommissionAnalysisTab.tsx`** — Linha 315, após o valor em €, adicionar:

```html
<p className="text-xs text-muted-foreground">Ref. coluna "Valor a Receber"</p>
```

### Resultado
O card Chargebacks (CB) passa a ter uma nota descritiva abaixo do valor indicando a origem dos dados.


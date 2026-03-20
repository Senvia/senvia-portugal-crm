

## Corrigir alinhamento de colunas na Análise de Comissões

### Problema
O `AccordionTrigger` (componente base) é um `flex` container que adiciona automaticamente um `<ChevronDown>` SVG após o conteúdo. Mesmo com `[&>svg]:hidden`, o layout flex do trigger não corresponde ao layout da header row estática, causando desalinhamento entre cabeçalhos e valores.

### Solução

**Ficheiro: `src/components/finance/CommissionAnalysisTab.tsx`**

1. **Usar larguras fixas nas colunas** em vez de `minmax(0,auto)` — tanto no header como no trigger, para garantir alinhamento pixel-perfect:

```
grid-cols-[1fr_110px_60px_110px_90px_110px_90px]
```

2. **Garantir que o grid do trigger ocupa `w-full`** e que o SVG escondido do AccordionTrigger não afeta o layout — adicionar `[&>svg]:absolute [&>svg]:hidden` ou simplesmente manter o `[&>svg]:hidden` existente (já está) e garantir que o trigger tem `justify-start` em vez de `justify-between`.

3. **Alternativa mais limpa**: sobrescrever o `className` do AccordionTrigger para remover o `justify-between` padrão e usar apenas o grid interno para posicionamento.

### Ficheiros alterados
- `src/components/finance/CommissionAnalysisTab.tsx` — colunas com largura fixa no header e no trigger grid


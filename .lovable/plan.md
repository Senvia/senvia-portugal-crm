

## Corrigir: campos Consumo/DBL resetam ao editar

### Problema
O `useEffect` na linha 185 do `EditSaleModal.tsx` tem `calculateEnergyCommission` como dependência. Esta função muda de referência a cada render, o que faz o `useEffect` disparar novamente sempre que o utilizador altera qualquer campo. Isto **reseta o `editableCpes` de volta aos dados originais** do `proposalCpes`, apagando o que o utilizador acabou de digitar.

### Solução

**Ficheiro: `src/components/sales/EditSaleModal.tsx`**

1. Remover `calculateEnergyCommission` e `hasEnergyConfig` das dependências do `useEffect` (linha 218).
2. Usar um `useRef` para guardar a referência estável de `calculateEnergyCommission` e usá-la dentro do effect sem a declarar como dependência.
3. Alternativa mais simples: mover o recálculo da comissão para fora do `useEffect` de inicialização — fazer o cálculo inline na inicialização usando um `useCallback` com referência estável, ou simplesmente remover a dependência e usar um ref.

A abordagem concreta:
- Criar `const calcRef = useRef(calculateEnergyCommission)` e manter atualizado com `calcRef.current = calculateEnergyCommission` a cada render.
- No `useEffect`, usar `calcRef.current` em vez de `calculateEnergyCommission` directamente.
- Dependências passam a ser apenas `[open, proposalCpes]` — estáveis.

### Ficheiros alterados
- `src/components/sales/EditSaleModal.tsx`


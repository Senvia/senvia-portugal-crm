

## Plano: Tornar operação e valor opcionais

### Problema
Actualmente a operação (× / ÷) e o valor são sempre obrigatórios. O utilizador quer poder **não ter** operação nenhuma — apenas a coluna de referência, sem transformação.

### Alteração

**Ficheiro:** `src/hooks/useCommissionMatrix.ts`
- Adicionar `'none'` ao tipo `operation`: `'multiply' | 'divide' | 'none'`
- Quando `operation === 'none'`, a derivação copia o valor directamente da coluna fonte sem cálculo

**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx`
- Adicionar opção "—" (nenhuma) ao Select de operação com value `none`
- Quando `operation === 'none'`, esconder o Input do valor numérico (não faz sentido)
- Ajustar `applyDerivation` para retornar o valor fonte directamente quando operation é `none`

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Adicionar `'none'` ao tipo operation |
| `src/components/settings/CommissionMatrixTab.tsx` | Opção "—", esconder valor quando none, ajustar derivação |


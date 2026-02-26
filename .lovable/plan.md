

## Plano: Mostrar operação e valor em todos os tiers

### Problema
Quando um tier seleciona a própria coluna, os campos de operação (× / ÷) e valor ficam escondidos. O utilizador quer que seja **sempre possível** adicionar ou não uma operação e valor, independentemente da coluna selecionada.

### Alteração

**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx` (linhas 756-781)

- Remover a condição `{!isSelf && (...)}` — mostrar **sempre** os campos de operação e valor para todos os 3 tiers
- Quando o tier seleciona a si próprio com operação `multiply` e valor `1`, o efeito é neutro (equivale a edição directa)
- Actualizar o texto explicativo para reflectir que a operação é opcional

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/components/settings/CommissionMatrixTab.tsx` | Remover condição `isSelf`, mostrar sempre operação/valor |


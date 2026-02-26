

## Plano: Corrigir UI das Regras de Derivação

### Problema
O select mostra "Manual" como opção, o que não faz sentido. O utilizador quer que cada tier selecione **qual coluna usar como referência** (300 MWh, 301-600 MWh, ou 601+ MWh), incluindo a própria (que significa edição directa). Não deve existir a palavra "Manual".

### Alteração

**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx` (linhas 737-754)

Substituir as opções do Select por referências às 3 colunas:
- Para cada tier, mostrar as 3 opções de coluna: `0-300 MWh`, `301-600 MWh`, `601+ MWh`
- Se o tier selecionar **a si próprio** como referência → equivale ao antigo "Manual" (edição directa, sem derivação)
- Se selecionar **outra coluna** → mostra os campos de operação (× ou ÷) e valor

Mapeamento:
- `from_low` = "0-300 MWh"
- `from_mid` = "301-600 MWh"  
- `from_high` = "601+ MWh"

Quando o tier `low` seleciona `from_low` → é "manual" (referência a si próprio, esconde operação/valor).

Actualizar a descrição do texto explicativo para reflectir esta lógica.

**Ficheiro:** `src/hooks/useCommissionMatrix.ts`

Actualizar `DEFAULT_TIER_RULES`:
- `low`: source=`from_mid` (÷1.33) — como está
- `mid`: source=`from_mid` (referência a si próprio = manual)
- `high`: source=`from_mid` (×1.5) — como está

Remover o valor `'manual'` do tipo `source`, usar apenas `from_low | from_mid | from_high`.

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Remover `'manual'` do tipo, ajustar defaults |
| `src/components/settings/CommissionMatrixTab.tsx` | Reformular Select com nomes de colunas, lógica "self = manual" |


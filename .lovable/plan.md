

## Corrigir importação: tipo errado detectado + filtro CB a bloquear

### Diagnóstico

O ficheiro tem estas colunas relevantes:
- **"Tipo de comissão"** — contém "CB" e "Comissão" (é esta que deveria ser usada para filtro)
- **"Tipo"** — contém valores como "B2B" (NÃO é a coluna certa)

O `detectTypeColumn()` encontra a coluna **"Tipo"** (match exato `normalized === "tipo"`) antes de considerar "Tipo de comissão". Resultado: filtra pela coluna errada, nenhuma linha tem "CB" no campo "Tipo" (que tem "B2B"), logo 0 linhas filtradas → 0 válidas → botão desativado.

### Alterações

**Ficheiro: `src/components/finance/ImportChargebacksDialog.tsx`**

1. **Corrigir `detectTypeColumn`** — priorizar colunas que contenham "comissao" ou "comissão" no nome (ex: "Tipo de comissão") antes do match genérico "tipo"

2. **Remover o filtro CB por defeito** — o novo fluxo importa TODAS as linhas do ficheiro (não só chargebacks). O `typeFilterValue` deve ser vazio por defeito, e a lógica de filtro só aplicada se o utilizador a ativar explicitamente. Isto significa:
   - `typeFilterValue` default passa de `"CB"` para `""`
   - Sem filtro ativo, `filteredRows = rows` (todas as linhas passam)
   - Remover a secção de "Linhas filtradas" do resumo quando não há filtro

3. **Botão passa a funcionar** — com todas as linhas a passar, `preparedRows.length > 0` e o botão fica ativo

### Ficheiros alterados
- `src/components/finance/ImportChargebacksDialog.tsx`


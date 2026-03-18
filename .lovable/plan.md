

## Filtrar apenas linhas CB no ficheiro de pagamentos da EDP

### Problema
O ficheiro importado não é exclusivamente de chargebacks — é um relatório de pagamentos da EDP que contém vários tipos de movimentos. Apenas as linhas com tipo "CB" (ou similar) são chargebacks. O sistema atual trata **todas** as linhas como chargebacks, inflacionando os valores.

### Solução
Adicionar um **3º campo de mapeamento** no diálogo de importação: "Coluna Tipo" + "Valor que identifica chargeback". O sistema filtra apenas as linhas onde essa coluna tem o valor indicado (ex: `Tipo = "CB"`).

### Alterações

**1. `ImportChargebacksDialog.tsx`**
- Adicionar dois novos campos no passo de mapeamento:
  - `Select` para escolher a **coluna de tipo/código** (ex: "Tipo", "Movimento")
  - `Input` para o utilizador escrever o **valor que identifica chargebacks** (ex: "CB"), com default "CB"
- Auto-detetar a coluna de tipo (procurar headers com "tipo", "type", "movimento", "cod", "code")
- Atualizar o `preparedRows` para filtrar apenas linhas onde `row[selectedTypeColumn] === filterValue`
- Atualizar o resumo "antes de importar" para mostrar: "Linhas lidas: X | Linhas CB filtradas: Y | Com CPE válido: Z"

**2. Auto-deteção da coluna tipo**
- Adicionar função `detectTypeColumn(headers)` que procura por headers com "tipo", "type", "movimento", "natureza", "cod"

**3. Fluxo atualizado**
```text
Ficheiro CSV/Excel (ex: 200 linhas)
  ↓ Coluna Tipo = "CB" filtrada
Apenas linhas CB (ex: 8 linhas)
  ↓ CPE + Valor extraídos
Enviado ao RPC (8 rows)
```

### Ficheiros a alterar
- `src/components/finance/ImportChargebacksDialog.tsx` — adicionar campo tipo + filtro


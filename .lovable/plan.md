

## Corrigir: enviar linha completa do ficheiro na importação

### Problema raiz
O `preparedRows` no `ImportChargebacksDialog.tsx` (linha 134-138) só envia `{ cpe, chargeback_amount }`. O SQL guarda isto como `raw_row`. Mas o `parseRawRow()` procura "Tipo de Comissão", "Nome da Empresa", "Linha de Contrato: Local de Consumo", etc. — que nunca existem no `raw_row` porque nunca foram enviados. Por isso a tabela na Análise de Comissões aparece com "—" em todas as colunas do ficheiro.

### Alterações

**Ficheiro: `src/components/finance/ImportChargebacksDialog.tsx`**

Alterar o `preparedRows` (linhas 131-140) para incluir **todos os campos da linha original** do ficheiro, com `cpe` e `chargeback_amount` como campos obrigatórios:

```ts
const preparedRows = filteredRows
  .map((row) => ({
    ...row,
    cpe: String(row[selectedCpeColumn] ?? "").trim(),
    chargeback_amount: String(row[selectedAmountColumn] ?? "0").trim(),
  }))
  .filter((row) => row.cpe.length > 0);
```

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`**

Alterar o tipo `ImportChargebackRow` (linhas 97-100) para aceitar campos extra:

```ts
export interface ImportChargebackRow {
  cpe: string;
  chargeback_amount: string;
  [key: string]: string;
}
```

### Resultado
Com a row completa enviada, o SQL guarda-a em `raw_row` com todas as colunas EDP. O `parseRawRow()` já existente encontra "Tipo de Comissão", "Nome da Empresa", "Tipo", "CPE", "Consumo anual", "Duração contrato", "Data de início", "Data Fim", "DBL" — e a tabela na **Análise de Comissões** mostra os dados correctamente.

### Ficheiros alterados
- `src/components/finance/ImportChargebacksDialog.tsx` — spread da row completa no preparedRows
- `src/hooks/useCommissionAnalysis.ts` — index signature no tipo ImportChargebackRow


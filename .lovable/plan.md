

## Mover "Angariação" da coluna "Tipo Comissão" para a coluna "Tipo"

### Problema
Na linha 109, o `systemNegotiationType` está a ser exibido na coluna "Tipo Comissão". Na linha 111, a coluna "Tipo" mostra "—". O utilizador quer o inverso: o negotiation_type deve aparecer na coluna **"Tipo"**, não em "Tipo Comissão".

### Solução

**Ficheiro: `src/components/finance/CommissionAnalysisTab.tsx`**

- Linha 109 (coluna "Tipo Comissão"): mudar para `"—"` 
- Linha 111 (coluna "Tipo"): mudar para exibir `NEGOTIATION_TYPE_LABELS[row.systemNegotiationType]`

Basicamente trocar o conteúdo dessas duas células.

### Ficheiro alterado
- `src/components/finance/CommissionAnalysisTab.tsx` — 2 linhas (109 e 111)


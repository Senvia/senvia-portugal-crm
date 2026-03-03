

## Corrigir "Total da Proposta" no Resumo — Mostrar Consumo Anual em vez de Margem

### Problema
No card de resumo (coluna direita), o destaque principal mostra "Valor Total" com `proposal.total_value` que no nicho telecom corresponde à Margem. Deveria mostrar o **Consumo Anual total** como valor principal.

### Alteração

**`src/components/proposals/ProposalDetailsModal.tsx`** (linhas 691-699):

No card "Valor Total" da coluna direita, quando `orgData?.niche === 'telecom'`:
- Mudar o label de "Valor Total" para "Consumo Total"
- Mostrar o consumo anual total dos CPEs (em MWh) como valor principal em destaque
- Manter "Valor Total" original apenas para nichos não-telecom

Também no bloco de impressão (linha 264), o `total-box` já usa Consumo Total MWh para telecom — está correto. A alteração é apenas no card do resumo interativo.

### Resultado
O card principal do resumo mostrará "Consumo Total: X.X MWh" para propostas telecom, e os sub-itens (Margem Total, Comissão Total) continuam abaixo como estão.


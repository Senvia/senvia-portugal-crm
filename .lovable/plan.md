

## Plano: Remover conceito de "Mês Fechado" — Comissões sempre visíveis

### Problema atual
As comissões só aparecem depois de "Fechar Mês", que grava dados nas tabelas `commission_closings` / `commission_closing_items`. Antes disso, mostra ecrã vazio com cadeado.

### Solução
Calcular comissões **em tempo real** ao selecionar o mês, usando a mesma lógica que já existe no `CloseMonthModal.loadPreview()`.

### Ficheiros a alterar

#### 1. `src/components/finance/CommissionsTab.tsx` — Reescrever
- Remover dependência de `useCommissionClosings`, `CloseMonthModal`, botão "Fechar Mês", dialog de eliminar fechamento
- Adicionar query direta (igual à lógica do `CloseMonthModal.loadPreview`):
  - Vendas `delivered` filtradas por `activation_date` no mês
  - Propostas com `negotiation_type` IN (`angariacao`, `angariacao_indexado`)
  - CPEs dessas propostas → agrupar por comercial → calcular patamar e comissão
- Mostrar sempre: totalizador global + tabela por comercial expandível com CPEs
- Usar `useQuery` com chave `['commissions-live', orgId, selectedMonth]` para cache e loading state

#### 2. Ficheiros a eliminar (ou deixar sem uso)
- `src/components/finance/CloseMonthModal.tsx` — remover import/uso
- `src/hooks/useCommissionClosings.ts` — já não é necessário (as tabelas DB ficam, mas não são usadas)

### Resultado
Ao selecionar qualquer mês, os dados aparecem imediatamente (calculados a partir das vendas). Sem botão "Fechar Mês", sem estado vazio.


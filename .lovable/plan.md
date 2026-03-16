
Estado atual: ainda não foi aplicado no código.

O que confirmei na codebase:
- `src/hooks/useFinanceStats.ts` continua com a lógica antiga:
  - `totalPending` é calculado com `filteredPayments`, logo ainda depende do filtro de datas
  - pagamentos `pending` entram todos nas métricas, sem excluir vendas Stripe/planos não confirmadas
  - `dueSoon`, `overdue` e `cashflowTrend.scheduled/overdue` também ainda usam todos os pendentes
  - a query de `sale_payments` ainda não traz `client_org_id`, `recurring_status` nem `next_renewal_date`
- `src/pages/Finance.tsx` ainda não foi atualizado:
  - o `RenewalAlertsWidget` não está importado nem renderizado no separador `Resumo`
  - o card `Pendente` ainda mostra apenas “A receber”, sem indicar que deve ser saldo global
- A memória do projeto confirma a regra pretendida:
  - vendas de plano/Stripe começam como `recurring_status = pending`
  - só após `invoice.paid` passam a `active` e ganham próxima renovação
  - o dashboard financeiro deve excluir Stripe não confirmada e mostrar renovações manuais no Resumo

Plano de implementação:
1. Atualizar `useFinanceStats`
- Enriquecer a query de `sale_payments` com dados da venda:
  - `client_org_id`
  - `recurring_status`
  - `next_renewal_date`
- Classificar pagamentos:
  - normal
  - venda Stripe/plano confirmada
  - venda Stripe/plano não confirmada
- Aplicar regra:
  - Stripe/plano só entra no financeiro quando `status = paid`
  - Stripe/plano não confirmada fica fora de:
    - `totalPending`
    - `dueSoon`
    - `totalOverdue`
    - `cashflowTrend.scheduled`
    - `cashflowTrend.overdue`
- Calcular `totalPending` com todos os pagamentos elegíveis da organização, ignorando `dateRange`

2. Ajustar tipos
- Expandir `PaymentWithSale` em `src/types/finance.ts` para suportar os novos campos da venda usados na filtragem

3. Atualizar a UI do Financeiro
- Em `src/pages/Finance.tsx`, importar e renderizar `RenewalAlertsWidget` no separador `Resumo`
- Ajustar o texto do card `Pendente` para deixar claro que mostra saldo global, não apenas o período filtrado

Resultado esperado depois da implementação:
- Daniel (Stripe/plano): não aparece como pendente/atrasado/a vencer antes da confirmação
- João (renovação manual): aparece no Resumo como lembrete operacional
- Card `Pendente`: mostra sempre o total real pendente da organização, mesmo com filtro ativo

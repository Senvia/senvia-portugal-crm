
Objetivo: alinhar o módulo Financeiro com a regra de negócio que definiste.

1. Ajustar a lógica dos cards financeiros
- Em `src/hooks/useFinanceStats.ts`, vou separar os pagamentos em 2 universos:
  - pagamentos normais
  - pagamentos de vendas Stripe/plano
- Para identificar vendas Stripe/plano, vou enriquecer a query de `sale_payments` com campos da `sale` já existentes no modelo, sobretudo `client_org_id` e `recurring_status`.
- Regra nova:
  - vendas Stripe só entram no Financeiro quando houver pagamento confirmado (`status = paid`)
  - pagamentos pendentes de Stripe não contam em:
    - `Pendente`
    - `Atrasados`
    - `A Vencer`
    - fluxo de caixa “Agendado”
- Isto corrige o caso do Daniel.

2. Mostrar renovação manual como lembrete no Resumo
- Vou reutilizar `src/components/finance/RenewalAlertsWidget.tsx`, que já existe e já lista recorrências ativas com renovação próxima/vencida.
- Em `src/pages/Finance.tsx`, vou inserir esse widget no separador `Resumo`, como card próprio.
- Assim, a venda do João deixa de aparecer como “pendente a receber” e passa a aparecer como lembrete operacional para renovares manualmente.

3. Corrigir o card “Pendente”
- Hoje `totalPending` é calculado com `filteredPayments`, então muda com o filtro de período.
- Vou alterar para calcular o card `Pendente` com base no saldo pendente total da organização, ignorando o `dateRange`.
- O restante resumo pode continuar filtrado por período, mas:
  - `Pendente` passa a refletir sempre o valor total por receber
- Em `src/pages/Finance.tsx`, também vou ajustar o subtítulo/copy do card para deixar claro que é saldo global pendente.

4. Preservar a lógica existente de faturado/recebido
- Vou manter a regra já documentada de coerência entre faturado e recebido.
- A única exceção será o tratamento das vendas Stripe ainda não confirmadas, que ficarão fora do resumo financeiro até confirmação real do pagamento.

Detalhes técnicos
- Ficheiros principais:
  - `src/hooks/useFinanceStats.ts`
  - `src/pages/Finance.tsx`
  - possivelmente `src/types/finance.ts` se eu precisar separar métricas filtradas vs globais
- Alterações previstas em `useFinanceStats`:
  - enriquecer `sales:sale_id!inner(...)` com `client_org_id`, `recurring_status`, `next_renewal_date`
  - criar filtros auxiliares tipo:
    - pagamento normal
    - pagamento Stripe confirmado
    - pagamento Stripe não confirmado
  - recalcular:
    - `totalPending` usando todos os pagamentos pendentes elegíveis do histórico inteiro
    - `dueSoon`, `overdue`, `cashflowTrend.scheduled/overdue` excluindo Stripe não confirmado
- Alterações previstas em `Finance.tsx`:
  - inserir `RenewalAlertsWidget` no `Resumo`
  - atualizar texto do card `Pendente` para não sugerir que está filtrado por período

Resultado esperado
- Daniel (Stripe): não aparece no Financeiro enquanto o pagamento não estiver confirmado pela Stripe.
- João (recorrência manual): aparece no Resumo como lembrete de renovação.
- Card `Pendente`: mostra sempre o total real em dívida, mesmo com filtro de datas ativo.

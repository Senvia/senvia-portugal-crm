
Objetivo

Corrigir o bloco “B) Vendas” do dashboard para que, nas métricas de energia, só entrem vendas com tipo de negociação:
- `angariacao`
- `angariacao_indexado`

e fiquem excluídas:
- `renovacao`
- `sem_volume`

O que confirmei no código

- O bloco afetado é o `B) Vendas` em `src/components/dashboard/SalesPerformancePanel.tsx`.
- Os valores vêm de `src/hooks/useMonthSalesMetrics.ts`.
- Hoje esse hook:
  - busca vendas `status = fulfilled`
  - agrega tudo por `proposal_id`
  - não lê `negotiation_type`
  - por isso conta também registos que não deviam entrar na energia.
- Já existe uma regra muito parecida em `src/hooks/useLiveCommissions.ts`:
  - inclui volume quando o tipo não é `sem_volume` nem `renovacao`
  - isso já cobre exatamente “angariação + ang. indexado”.

Abordagem recomendada

1. Ajustar só a fonte de dados do bloco B) Vendas
- Alterar `useMonthSalesMetrics` para também carregar da proposta:
  - `proposal_type`
  - `negotiation_type`
  - `servicos_details` se necessário
- Aplicar o filtro apenas na agregação usada por esse painel.

2. Regra de contabilização
- Energia/comissão de energia só contam se:
  - `proposal_type = energia`
  - `negotiation_type` for `angariacao` ou `angariacao_indexado`
- Excluir explicitamente:
  - `renovacao`
  - `sem_volume`

3. Manter o resto do dashboard como está
- Não mexer em:
  - `B) Ritmo`
  - `Ativações`
- Foi isso que confirmou.

4. Alinhar a lógica com o resto do produto
- Reaproveitar a mesma regra conceptual já usada nas comissões live, para evitar números contraditórios entre painéis.

Ficheiros a alterar

- `src/hooks/useMonthSalesMetrics.ts`
- possivelmente `src/components/dashboard/SalesPerformancePanel.tsx` apenas se for preciso ajustar labels/comportamento, mas a correção principal está no hook

Resultado esperado

- O quadro `B) Vendas` deixa de contar energia de:
  - renovação
  - sem volume
- Passa a contabilizar corretamente:
  - angariação
  - angariação indexado
- Sem alterar os outros blocos do dashboard

Nota técnica

Implementação mais segura:
```text
buscar sales do mês
→ obter proposals relacionadas
→ criar mapa proposal_id -> negotiation_type / proposal_type
→ ao agregar:
   se proposal_type = energia
   contar apenas se negotiation_type in [angariacao, angariacao_indexado]
```

Validação depois da implementação

- Comparar um consultor com vendas mistas no mesmo mês
- Confirmar que:
  - `angariacao` entra
  - `angariacao_indexado` entra
  - `renovacao` sai
  - `sem_volume` sai
- Verificar que `B) Ritmo` e `Ativações` continuam iguais

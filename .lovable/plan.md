
Objetivo

Ajustar o painel Ativações para que os cards de Energia, tanto Mensal como Anual, usem esta regra funcional:
- objetivo continua a vir dos objetivos de Energia
- realizado conta apenas vendas concluídas
- entram só propostas de energia com negociação:
  - `angariacao`
  - `angariacao_indexado`

O que confirmei no código

- O painel está em `src/components/dashboard/ActivationsPanel.tsx`
- A lógica vem de `src/hooks/useActivationObjectives.ts`
- Os objetivos já são lidos corretamente da tabela `activation_objectives`
- O hook já busca vendas com:
  - `status = delivered`
  - `activation_date` dentro do período
- O hook também já cruza com `proposals` para ler:
  - `proposal_type`
  - `negotiation_type`
- Neste momento a filtragem de Energia já está desenhada para:
  - `proposal_type = energia`
  - `negotiation_type in ['angariacao', 'angariacao_indexado']`

Risco principal a validar no código

Há um desfasamento de tipagem/contrato entre o hook e o painel:
- `useActivationObjectives` expõe `countActivations` com 4.º parâmetro opcional (`countMode`)
- `ActivationsPanel` tipa `countActivations` dos blocos como função de apenas 3 argumentos
- o painel usa esse 4.º argumento para Serviços quando o módulo de energia está desligado

Isto pode estar a mascarar o comportamento esperado ou gerar inconsistências futuras, mesmo que o problema funcional pedido seja de Energia.

Plano de implementação

1. Consolidar a regra de Energia no hook
- Garantir explicitamente que os cards de Energia mensal e anual usam apenas:
  - vendas `delivered`
  - propostas `energia`
  - negociação `angariacao` ou `angariacao_indexado`
- manter a soma técnica via `proposal_cpes.consumo_anual / 1000` para MWh

2. Aplicar a regra aos dois cards de Energia
- Confirmado: a regra vale para:
  - `Energia — Mensal`
  - `Energia — Anual`

3. Alinhar o contrato do painel com o hook
- Atualizar a tipagem de `countActivations` em `ActivationsPanel.tsx` e `ActivationBlockProps`
- refletir que a função aceita o parâmetro opcional de modo (`value` / `count`)
- isto evita inconsistências entre a implementação real do hook e o tipo usado pelo componente

4. Preservar Serviços como estão
- não mexer na lógica funcional de Serviços
- manter:
  - kWp quando o módulo energia está ativo
  - contagem de contratos quando o módulo energia está inativo

Ficheiros a alterar

- `src/hooks/useActivationObjectives.ts`
- `src/components/dashboard/ActivationsPanel.tsx`

Resultado esperado

Nos cards de Ativações de Energia:
- o objetivo continua a ser o objetivo de Energia
- o realizado passa a refletir apenas:
  - vendas concluídas
  - energia
  - angariação
  - angariação indexada

Nos cards de Serviços:
- sem alteração funcional

Validação após implementação

- uma venda de energia `angariacao` entra no total
- uma venda de energia `angariacao_indexado` entra no total
- vendas de energia com outros tipos de negociação não entram
- o card mensal e o anual mostram a mesma regra
- os objetivos continuam corretos

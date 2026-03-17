
Objetivo

Corrigir o painel “Ativações” para que o bloco de Energia:
- leia o objetivo de Energia normalmente
- conte apenas ativações de vendas concluídas
- inclua só propostas de energia com negociação:
  - `angariacao`
  - `angariacao_indexado`
- exclua:
  - `renovacao`
  - `sem_volume`

O que confirmei no código

- O painel usa `src/components/dashboard/ActivationsPanel.tsx`
- Os dados vêm de `src/hooks/useActivationObjectives.ts`
- Hoje os objetivos já são lidos da tabela `activation_objectives` por:
  - `period_type`
  - `proposal_type`
  - `month`
- O problema está na contabilização das ativações:
  - o hook lê vendas `status = delivered`
  - mas filtra Energia apenas por `proposal_type`
  - não considera `negotiation_type`
- Isso faz com que Energia em “Ativações” possa somar propostas que não deviam entrar.

Implementação proposta

1. Ajustar a leitura das ativações de energia no hook
- Expandir a leitura das propostas relacionadas às vendas ativadas para também obter:
  - `proposal_type`
  - `negotiation_type`
- Criar um mapa por `proposal_id` com essa metadata.

2. Aplicar a regra correta só à Energia
- Em `countActivations(..., "energia")`, contar apenas vendas:
  - `status = delivered`
  - com `proposal_type = energia`
  - e `negotiation_type in ['angariacao', 'angariacao_indexado']`
- Continuar a somar MWh a partir de `proposal_cpes`.

3. Manter Serviços como está
- Não alterar o comportamento atual de `servicos`
- Continuar a usar:
  - kWp quando o módulo Energia está ativo
  - contagem de contratos quando o módulo Energia está inativo

4. Preservar a lógica de objetivos
- `getTarget` já está estruturado corretamente para objetivos de Energia
- Não será necessário mexer no modal nem na tabela de objetivos, apenas garantir que o “real” usa o mesmo critério funcional esperado.

Ficheiros a alterar

- `src/hooks/useActivationObjectives.ts`
- `src/components/dashboard/ActivationsPanel.tsx` só se for necessário algum ajuste de label, mas a correção principal está no hook

Resultado esperado

No card “Energia” de Ativações:
- o objetivo continua a vir do objetivo de Energia
- o valor realizado passa a refletir apenas:
  - vendas concluídas
  - energia
  - angariação
  - angariação indexado

No card “Serviços”:
- mantém o comportamento atual

Nota técnica

A alteração mais segura é:
```text
vendas delivered com activation_date no período
→ obter proposal_id
→ carregar proposal_type + negotiation_type das propostas
→ em energia, somar só proposal_type=energia e negotiation_type elegível
→ converter consumo_anual para MWh
```

Validação depois da implementação

- Confirmar uma venda de energia `angariacao` entra
- Confirmar uma venda `angariacao_indexado` entra
- Confirmar `renovacao` não entra
- Confirmar `sem_volume` não entra
- Confirmar objetivos continuam a aparecer corretamente no card de Energia

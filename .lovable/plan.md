
Objetivo

Garantir que cada proposta seja exclusivamente de um único tipo:
- ou Energia
- ou Outros Serviços
- nunca os dois ao mesmo tempo

O que encontrei
- A UI já trabalha com `proposalType` e mostra apenas uma secção de cada vez.
- Mas a regra ainda não está totalmente protegida:
  1. `CreateProposalModal.tsx` pode criar uma proposta de serviços e ainda gravar `proposal_cpes` se o utilizador tiver preenchido energia antes de trocar de tipo.
  2. `EditProposalModal.tsx` ao mudar de energia para serviços não limpa automaticamente os `proposal_cpes` existentes.
  3. No backend não há uma validação forte para impedir mistura entre `servicos_*` e `proposal_cpes`.

Plano de implementação

1. Fechar a regra no frontend
- Em `CreateProposalModal.tsx`:
  - ao trocar para `energia`, limpar `servicosProdutos` e `servicosDetails`
  - ao trocar para `servicos`, limpar `proposalCpes`
  - no submit, só criar `proposal_cpes` se `proposalType === 'energia'`
- Em `EditProposalModal.tsx`:
  - aplicar a mesma limpeza ao trocar o tipo
  - se a proposta passar para `servicos`, atualizar os CPEs com lista vazia para remover os `proposal_cpes`
  - se passar para `energia`, limpar `servicos_*` no payload

2. Enforçar a regra no backend
- Adicionar validação na base de dados para impedir estados mistos:
  - trigger em `proposal_cpes` para bloquear insert/update quando a proposta ligada não for `energia`
  - trigger em `proposals` para validar coerência mínima entre `proposal_type` e campos próprios de serviços
- Assim a regra fica protegida mesmo fora da UI.

3. Manter compatibilidade com o fluxo atual
- Continuar a permitir:
  - propostas de energia com CPEs
  - propostas de serviços com `servicos_produtos` / `servicos_details`
- Sem alterar listagens, métricas ou detalhes, apenas a integridade dos dados.

Resultado esperado
- Uma proposta nunca fica com CPEs e serviços ao mesmo tempo.
- Trocar o tipo da proposta passa a limpar corretamente o tipo anterior.
- Novas propostas e edições antigas ficam consistentes com a regra de negócio.

Ficheiros a alterar
- `src/components/proposals/CreateProposalModal.tsx`
- `src/components/proposals/EditProposalModal.tsx`
- nova migration para validação na base de dados

Validação
- Criar proposta de energia, adicionar CPEs, mudar para serviços, guardar:
  - não deve gravar CPEs
- Editar proposta de energia para serviços:
  - os CPEs antigos devem desaparecer
- Editar proposta de serviços para energia:
  - os campos de serviços não devem permanecer ativos
- Testar o fluxo end-to-end para confirmar que nunca é possível guardar uma proposta mista

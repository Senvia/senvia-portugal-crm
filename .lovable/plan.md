
Objetivo: tornar realmente obrigatório preencher Valor e kWp para Carregadores e Condensadores (criar + editar + backend).

1) Corrigir validação no Editar Proposta
- Ficheiro: `src/components/proposals/EditProposalModal.tsx`
- Adicionar estado `attempted` e regra `isServicosValid` (igual ao fluxo de criação).
- Bloquear `handleSubmit` quando `proposalType === 'servicos'` e faltar `valor`/`kwp` (> 0) em Carregadores/Condensadores selecionados.
- Mostrar erro inline “Obrigatório” nesses campos e adicionar `*` no label.
- Desativar botão “Guardar Alterações” quando formulário inválido após tentativa de submit.

2) Unificar regra para evitar divergência entre Criar e Editar
- Criar util compartilhado (ex.: `src/lib/proposal-servicos-validation.ts`) com função de validação de serviços.
- Aplicar essa função em:
  - `src/components/proposals/CreateProposalModal.tsx`
  - `src/components/proposals/EditProposalModal.tsx`
- Regra explícita: se produto selecionado for `Carregadores` ou `Condensadores`, exigir `valor` e `kwp` numéricos e > 0.

3) Reforçar validação no backend (server-side)
- Criar migration SQL com trigger `BEFORE INSERT OR UPDATE` em `public.proposals`.
- Validar:
  - `proposal_type = 'servicos'`
  - se `servicos_produtos` contém `Carregadores` ou `Condensadores`, `servicos_details[produto].valor` e `servicos_details[produto].kwp` devem existir e ser > 0.
- Em caso inválido, lançar erro claro (ex.: “Carregadores requer valor e kwp”).

4) Guardrail no hook de escrita
- Ficheiro: `src/hooks/useProposals.ts`
- Antes de `.insert()` e `.update()`, aplicar a mesma validação compartilhada para falhar cedo com mensagem amigável.
- Mantém UX consistente mesmo antes da resposta do backend.

5) Validação final (QA)
- Testar end-to-end no fluxo de criar e editar proposta:
  - Carregadores sem valor/kwp → deve bloquear.
  - Condensadores sem valor/kwp → deve bloquear.
  - Com ambos preenchidos (>0) → deve guardar.
  - Confirmar mobile e desktop no modal full-screen.
  
Detalhes técnicos
- Problema identificado: hoje a criação tem validação parcial, mas a edição não bloqueia submissão; além disso, não há regra no backend para impedir payload inválido.
- Evidência no dado atual: existe proposta com `servicos_produtos` contendo `Carregadores` sem detalhes correspondentes em `servicos_details`.
- Resultado esperado após implementação: obrigatoriedade real em 3 camadas (UI criar/editar + backend), sem regressão no restante formulário de serviços.


Objetivo: descobrir por que as propostas do Thiago Sousa não entram na “Performance da Equipa” e corrigir o cálculo para ficar consistente com o resto do dashboard.

Diagnóstico mais provável
- No banco, o Thiago Sousa tem pelo menos 1 proposta neste mês na organização `Senvia Agency`.
- A tabela “Performance da Equipa” não usa o mesmo fluxo consolidado de dados do resto da app; ela faz consultas próprias em `TeamPerformanceTable.tsx`.
- Esse widget depende de 3 coisas ao mesmo tempo:
  1. organização ativa no dashboard,
  2. mês selecionado no filtro do dashboard,
  3. lista de membros devolvida por `useTeamMembers`.
- Há um detalhe importante no registo do Thiago: ele está como membro ativo da organização, mas sem `profile_id` em `organization_members`. Isso não deveria apagar as propostas, mas é um sinal de inconsistência de configuração.
- Além disso, as regras de acesso ainda dependem em vários pontos de `get_user_org_id(...)`, que é sensível à organização ativa no token. Isso é um padrão conhecido de falhas de visibilidade quando a organização atual na UI e a organização usada nas políticas ficam desalinhadas.

Plano de correção
1. Validar exatamente o caminho do bug no widget
- Rever `src/components/dashboard/TeamPerformanceTable.tsx` para confirmar onde o Thiago está a ser perdido:
  - se sai da lista `filteredMembers`,
  - se a query de propostas devolve vazio,
  - ou se o filtro de mês/organização está a excluir a proposta.

2. Unificar a origem dos dados da performance
- Refatorar a tabela para deixar de recalcular propostas com uma query isolada.
- Passar a usar a mesma lógica de escopo já usada em hooks centrais (`useProposals`, `useTeamFilter`, etc.) e só agregar por colaborador dentro do mês selecionado.
- Isto reduz discrepâncias entre “lista de propostas” e “Performance da Equipa”.

3. Corrigir o mapeamento de membros
- Garantir que qualquer membro ativo da organização aparece na tabela mesmo se estiver sem `profile_id`.
- Adicionar fallback robusto para o utilizador atual, para que o próprio Thiago nunca desapareça da lista por falha de configuração do perfil organizacional.

4. Endurecer a visibilidade por organização
- Rever as políticas de acesso de `proposals`, `leads` e `sales` para usar o padrão baseado em pertença ativa à organização, em vez de depender da organização do token.
- Isto evita casos em que o dashboard está numa organização, mas a consulta ainda é filtrada por outra.

5. Melhorar a transparência no UI
- Mostrar no cabeçalho da tabela o contexto aplicado:
  - mês,
  - comercial filtrado,
  - escopo atual.
- Se um utilizador tiver propostas fora do mês/organização selecionados, mostrar uma indicação clara em vez de parecer “sumido”.

Resultado esperado
- O Thiago passa a aparecer corretamente na “Performance da Equipa” quando houver propostas dele no mês e organização ativos.
- O widget fica alinhado com os restantes módulos do dashboard.
- Problemas futuros de visibilidade por troca de organização ficam muito menos prováveis.

Detalhes técnicos
- Ficheiros principais:
  - `src/components/dashboard/TeamPerformanceTable.tsx`
  - `src/hooks/useProposals.ts`
  - `src/hooks/useTeamFilter.ts`
  - possíveis ajustes nas políticas de acesso de `proposals`, `leads` e `sales`
- Não espero mudança estrutural grande no frontend; a parte mais sensível é alinhar a lógica de visibilidade do backend com o padrão de pertença à organização.

<lov-actions>
<lov-suggestion message="Testa a Performance da Equipa de ponta a ponta mudando mês, organização e filtro de comercial para confirmar que as propostas do Thiago aparecem corretamente.">Verificar que funciona</lov-suggestion>
<lov-suggestion message="Mostrar no cabeçalho da Performance da Equipa quais filtros estão ativos: mês, organização e comercial selecionado.">Mostrar filtros ativos</lov-suggestion>
<lov-suggestion message="Adicionar um modo de diagnóstico no dashboard para explicar por que um colaborador não aparece na Performance da Equipa.">Adicionar diagnóstico de visibilidade</lov-suggestion>
</lov-actions>

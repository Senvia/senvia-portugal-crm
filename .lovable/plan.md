
Objetivo

Corrigir de vez os dois filtros da página de Leads:
1. filtro de Colaboradores;
2. filtro de Data.

Diagnóstico

1. Filtro de Colaboradores
- Encontrei a causa principal no `useTeamFilter`.
- Para admins (`dataScope === 'all'`), o hook só aceita seleções presentes em `all-team-members-entries` (`team_members`).
- Na organização “Escolha Inteligente” existem 6 membros ativos, mas 0 equipas e 0 registos em `team_members`.
- Resultado: o dropdown abre, o admin escolhe um colaborador, mas o `useEffect` limpa logo a seleção porque esse utilizador “não é permitido”. Por isso parece que “abre mas não aplica”.

2. Filtro de Data
- Na página `Leads.tsx`, o filtro de data está implementado manualmente com dois `Popover + Calendar` (“De” / “Até”).
- Noutras páginas do sistema já existe um componente padrão `DateRangePicker` usado para este mesmo comportamento.
- O filtro atual de Leads é mais frágil e inconsistente com o resto da app. A melhor correção é unificar com o componente partilhado e normalizar a comparação das datas.

O que vou implementar

1. Corrigir a lógica do filtro de colaboradores
- Ajustar `useTeamFilter.ts`.
- Para admin, a lista de IDs permitidos deve vir dos membros reais da organização, não de `team_members`.
- Vou usar a fonte de membros da organização para que o admin possa filtrar qualquer colaborador ativo, mesmo quando não existirem equipas.

2. Preservar a lógica dos líderes de equipa
- Para líderes com escopo `team`, mantenho a lógica atual:
  - líder vê a própria equipa + ele mesmo;
  - se não puder selecionar alguém, a seleção é limpa.
- Ou seja: corrijo o caso do admin sem quebrar o comportamento atual dos líderes.

3. Substituir o filtro de data manual no Leads
- Trocar os dois calendários “De / Até” por `DateRangePicker`, igual ao usado noutras páginas.
- Isso simplifica a UI e reduz a chance de falha de aplicação do filtro.

4. Normalizar o cálculo do filtro por data
- Garantir comparação com:
  - início do dia para `from`;
  - fim do dia para `to`.
- Assim, quando o utilizador escolhe uma data, todos os leads daquele dia entram corretamente no resultado.

5. Validar a aplicação real dos filtros na lista
- Confirmar que `filteredLeads` continua a ser a fonte usada por:
  - kanban;
  - tabela;
  - contagem no topo.
- Assim, quando o filtro mudar, toda a página reflete o resultado.

Ficheiros a ajustar

- `src/hooks/useTeamFilter.ts`
- `src/pages/Leads.tsx`
- possivelmente reutilização direta de `src/components/ui/date-range-picker.tsx` sem alterar a sua lógica

Resultado esperado

- O admin da Escolha Inteligente conseguirá selecionar qualquer colaborador e os leads serão filtrados corretamente.
- O filtro de data passará a aplicar de forma consistente.
- Os filtros funcionarão tanto na vista kanban como na tabela.
- A experiência ficará alinhada com o resto do sistema.

Nota técnica importante

Isto parece ser um problema de frontend/estado, não de permissões da base de dados:
- a organização tem membros ativos;
- o bloqueio do filtro de colaborador acontece porque o código depende de equipas inexistentes;
- o filtro de data deve ser estabilizado ao migrar para o componente de intervalo já usado noutras páginas.

Checklist de validação após implementação

1. Admin selecionar um colaborador e ver a lista reduzir.
2. Admin voltar para “Todos os colaboradores”.
3. Aplicar apenas data inicial.
4. Aplicar apenas data final.
5. Aplicar intervalo completo.
6. Confirmar comportamento igual em kanban e tabela.

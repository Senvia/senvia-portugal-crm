

## Contratos: Pesquisa → Resultados (sem empty state)

O fluxo passa a ser: o colaborador abre os filtros, pesquisa, e os resultados do contrato aparecem abaixo dos filtros. A área de empty state atual é removida.

### Alterações

**1. `src/pages/portal-total-link/Contratos.tsx`**
- Remover o `PortalTotalLinkEmptyState` completamente
- Substituir por um componente que mostra:
  - **Estado inicial** (sem pesquisa): mensagem discreta a convidar o colaborador a usar os filtros acima para pesquisar contratos (ícone Search + texto curto)
  - **Estado de resultados**: uma tabela/card com os dados do contrato retornados (preparada para receber dados do PHC CS futuramente)
- Usar o contexto `usePortalTotalLinkFilters` para saber se há filtros ativos e decidir o que mostrar

**2. Estrutura do componente de resultados** (novo: `PortalTotalLinkContratosResults.tsx`)
- Se `activeFilterCount === 0`: mostra placeholder discreto ("Utilize os filtros acima para pesquisar contratos")
- Se há filtros ativos mas sem dados (fase atual): mostra estado "Nenhum resultado encontrado" ou "A pesquisa será ligada ao PHC CS"
- Preparar a estrutura da tabela de resultados com colunas: Cliente, Contrato, Ciclo, Estado Comercial, Estado BO

A integração real com o PHC CS será feita numa fase posterior — por agora fica a estrutura visual pronta para receber os dados.


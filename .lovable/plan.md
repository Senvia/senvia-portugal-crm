

## Reclamações: Substituir empty state por tabela de resultados

Mesmo padrão aplicado na página de Contratos.

### Alterações

**1. Novo componente `src/components/portal-total-link/PortalTotalLinkReclamacoesResults.tsx`**
- Usa `usePortalTotalLinkFilters` para verificar filtros ativos
- **Sem filtros**: placeholder discreto ("Utilize os filtros acima para pesquisar reclamações")
- **Com filtros**: tabela com colunas **Data**, **NIF do cliente**, **Nome do cliente**, **Estado**
- Estado atual sem dados: mensagem "Sem resultados / A pesquisa será ligada ao PHC CS numa fase posterior"

**2. Atualizar `src/pages/portal-total-link/Reclamacoes.tsx`**
- Remover `PortalTotalLinkEmptyState`
- Renderizar o novo `PortalTotalLinkReclamacoesResults`


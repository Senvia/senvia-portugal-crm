

## Pendentes: Substituir empty state por tabela de resultados

Mesmo padrão das Reclamações.

### Alterações

**1. Novo componente `src/components/portal-total-link/PortalTotalLinkPendentesResults.tsx`**
- Cópia do padrão de `PortalTotalLinkReclamacoesResults`
- Sem filtros: placeholder "Utilize os filtros acima para pesquisar pendentes"
- Com filtros: tabela com colunas **Cliente**, **Vendedor**, **Estado BO**, **Última atualização**
- Sem dados: mensagem "Sem resultados / A pesquisa será ligada ao PHC CS numa fase posterior"

**2. Atualizar `src/pages/portal-total-link/Pendentes.tsx`**
- Remover `PortalTotalLinkEmptyState`
- Renderizar `PortalTotalLinkPendentesResults`


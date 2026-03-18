

## Contratos e IDs: Ligar botões de ação + criar página IDs

### Problema
O botão "Adicionar" na página de Contratos não faz nada — o `onClick` só está configurado para `reclamacoes`. A página de IDs ainda usa o `PortalTotalLinkEmptyState` em vez do padrão de resultados com filtros.

### Alterações

**1. Novo componente `PortalTotalLinkContratoAddDialog.tsx`**
- Mesmo padrão do dialog de Reclamações: campo NIF, botão pesquisar, área de resultado placeholder
- Mensagem: "Indique o NIF do cliente para associar um novo contrato."

**2. Novo componente `PortalTotalLinkIdsResults.tsx`**
- Mesmo padrão de Reclamações/Pendentes/Contratos
- Sem filtros: placeholder "Utilize os filtros acima para pesquisar identificadores"
- Com filtros: tabela com colunas **Identificador**, **Cliente**, **Contrato**, **Estado BO**
- Sem dados: mensagem PHC CS placeholder

**3. Atualizar `PortalTotalLinkLayout.tsx`**
- Adicionar state `isContratoDialogOpen`
- No `onClick` do botão, adicionar condição para `contratos` abrir o dialog
- Renderizar `PortalTotalLinkContratoAddDialog`

**4. Atualizar `src/pages/portal-total-link/Ids.tsx`**
- Remover `PortalTotalLinkEmptyState`, renderizar `PortalTotalLinkIdsResults`

**Ficheiros:**
- `src/components/portal-total-link/PortalTotalLinkContratoAddDialog.tsx` (novo)
- `src/components/portal-total-link/PortalTotalLinkIdsResults.tsx` (novo)
- `src/components/portal-total-link/PortalTotalLinkLayout.tsx` (editar)
- `src/pages/portal-total-link/Ids.tsx` (editar)


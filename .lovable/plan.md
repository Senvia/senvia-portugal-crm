

## Reclamações: Dialog "Adicionar" com pesquisa por NIF no PHC

Ao clicar no botão "Adicionar" na página de Reclamações, abre um Dialog para o colaborador introduzir o NIF do cliente. O sistema consulta o PHC CS e apresenta os dados do cliente encontrado.

### Alterações

**1. Novo componente `PortalTotalLinkReclamacaoAddDialog.tsx`**
- Dialog com campo de input para NIF
- Mensagem descritiva: "Indique o NIF do cliente e verifique se o mesmo já existe ou se será necessário criar."
- Botão de pesquisa que (futuramente) chama o PHC CS para buscar dados do cliente
- Área de resultado que mostra os dados do cliente encontrado (Nome, NIF, morada, etc.) ou mensagem "Nenhum cliente encontrado"
- Por agora, a consulta ao PHC fica preparada mas sem integração real (placeholder/mock)

**2. Atualizar `PortalTotalLinkLayout.tsx`**
- O botão "Adicionar" da secção `reclamacoes` (linha 74-78) atualmente não faz nada
- Ligar o `onClick` do botão ao state que abre o Dialog
- Renderizar o novo Dialog condicionalmente quando a secção ativa for `reclamacoes`

**Ficheiros a criar/editar:**
- `src/components/portal-total-link/PortalTotalLinkReclamacaoAddDialog.tsx` (novo)
- `src/components/portal-total-link/PortalTotalLinkLayout.tsx` (editar)


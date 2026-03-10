

## Plano: Substituir checkboxes por pesquisa no catálogo de serviços

### Problema
A seleção de produtos do catálogo usa checkboxes — o utilizador quer poder **pesquisar** produtos por texto numa dropdown e adicioná-los, em vez de percorrer uma lista de checkboxes.

### Solução
Substituir a lista de checkboxes na `CatalogProducts` por um **SearchableCombobox** (já existe no projeto) + lista de produtos adicionados com edição inline.

### Alterações

**`src/components/proposals/ServicosSection.tsx`** — Refazer `CatalogProducts`:
- Remover a lista de checkboxes
- Adicionar um `SearchableCombobox` no topo com as opções do catálogo (filtradas para excluir já selecionados)
- Ao selecionar um produto, chamar `onToggleProduct` para o adicionar e pré-preencher os defaults do catálogo via `onSetProductDetail`
- Abaixo do combobox, mostrar os produtos já adicionados como cards editáveis (preço, comissão) com botão de remover (X)
- Manter os totais no fundo

**Também remover "Modelo de Serviço"** (Transacional/SAAS) **quando usado nas vendas** — adicionar prop opcional `hideModeloServico` à `ServicosSection`, e passá-la como `true` no `CreateSaleModal` e `EditSaleModal`.

### UX Final
1. Dropdown pesquisável → utilizador escreve texto → filtra produtos do catálogo
2. Seleciona produto → aparece na lista abaixo com preço e comissão editáveis
3. Botão X para remover produto da lista
4. Totais atualizados automaticamente


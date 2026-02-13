
# Detalhes da Lista -- Full-Page com Pesquisa

## Problema
O modal de detalhes da lista (`ListDetailsModal`) abre como um dialogo pequeno centrado no ecra. Deveria ser full-page como os restantes modais do sistema (Vendas, Clientes, Importacao). Tambem falta um filtro de pesquisa para os membros da lista.

## Alteracoes

### Ficheiro: `src/components/marketing/ListDetailsModal.tsx`

**1. Converter para full-page**
- Adicionar `variant="fullScreen"` ao `DialogContent`
- Remover `max-w-lg max-h-[85vh]`
- Centrar conteudo com `max-w-3xl mx-auto w-full`

**2. Adicionar filtro de pesquisa nos membros**
- Novo estado `memberSearch` para filtrar a lista de membros existentes
- Campo de pesquisa com icone acima da lista de membros
- Filtragem accent-insensitive usando a funcao `normalizeString` ja existente em `src/lib/utils.ts`
- Pesquisa por nome, email e telefone do cliente

**3. Aplicar `normalizeString` tambem na pesquisa de "Adicionar contactos"**
- A pesquisa actual na seccao de adicionar usa `.toLowerCase()` simples
- Passar a usar `normalizeString` para ignorar acentos

### Detalhes tecnicos
- Importar `normalizeString` de `@/lib/utils`
- Filtro de membros: `normalizeString(name).includes(normalizeString(query)) || normalizeString(email).includes(normalizeString(query)) || normalizeString(phone).includes(normalizeString(query))`
- Layout full-page: header fixo com nome da lista + badge de contagem + botao adicionar, seguido do campo de pesquisa e a lista scrollavel
- Remover `max-h-[300px]` do ScrollArea dos membros para usar o espaco full-page

### Ficheiros a editar
| Ficheiro | Acao |
|----------|------|
| `src/components/marketing/ListDetailsModal.tsx` | Editar |

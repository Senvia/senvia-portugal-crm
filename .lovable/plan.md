

## Limpar Interface de Faturas e Adicionar Ordenacao por Colunas

### O que muda

1. **Remover botao "Sincronizar"** do cabecalho (linha 214-227). A sincronizacao automatica no mount ja existe e continua a funcionar em background.
2. **Remover mensagem vazia** que diz "Clique em Sincronizar para importar..." (linha 287-288) -- substituir por texto neutro.
3. **Remover toasts de sincronizacao** nos hooks `useSyncInvoices` (em `useInvoices.ts`) e `useSyncCreditNotes` (em `useCreditNotes.ts`) -- remover os callbacks `onSuccess` com `toast`.
4. **Adicionar setas de ordenacao** nas colunas da tabela, seguindo o mesmo padrao implementado nos Pagamentos.

### Colunas ordenaveis

- **Referencia** (alfabetica)
- **Tipo** (alfabetica)
- **Data** (cronologica -- default, desc)
- **Cliente** (alfabetica)
- **Estado** (alfabetica)
- **Valor** (numerico)

As colunas "Doc. Relacionado", "Associada" e "PDF" nao serao ordenaveis.

### Detalhes tecnicos

**Ficheiro: `src/components/finance/InvoicesContent.tsx`**

1. Remover o botao "Sincronizar" e as importacoes associadas (`RefreshCw`, `handleSync`, `isSyncing`)
2. Remover a referencia textual a "Sincronizar" no estado vazio
3. Adicionar estados `sortField` (default: `'date'`) e `sortDirection` (default: `'desc'`)
4. Criar funcao `handleSort(field)` e componente `SortIcon` inline (igual ao padrao dos Pagamentos)
5. Adicionar `useMemo` para `sortedDocuments` que ordena `filteredDocuments` pelo campo ativo
6. Substituir os `TableHead` estaticos por cabecalhos clicaveis com icones de seta
7. Importar `ArrowUpDown`, `ArrowUp`, `ArrowDown` do lucide-react

**Ficheiro: `src/hooks/useInvoices.ts`**

- Remover o callback `onSuccess` do `useSyncInvoices` que dispara o toast "Sincronizacao concluida"

**Ficheiro: `src/hooks/useCreditNotes.ts`**

- Remover o callback `onSuccess` do `useSyncCreditNotes` que dispara o toast de sincronizacao

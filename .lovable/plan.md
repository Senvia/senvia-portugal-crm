

## Adicionar Ordenacao com Setas nas Colunas da Tabela de Pagamentos

### O que muda

As colunas da tabela de pagamentos passam a ter **setas de ordenacao clicaveis** (igual ao que ja existe na tabela de Leads). Ao clicar numa coluna, os dados sao ordenados por essa coluna. Clicar novamente inverte a direcao. A ultima ordenacao escolhida permanece ativa enquanto o utilizador estiver na pagina.

### Colunas ordenáveis

- **Data** (por data do pagamento)
- **Venda** (por codigo da venda)
- **Cliente** (por nome do cliente/lead)
- **Valor** (por montante)
- **Metodo** (por metodo de pagamento)
- **Estado** (por estado do pagamento)

A coluna "Fatura" e "Acoes" nao serao ordenaveis.

### Detalhes tecnicos

**Ficheiro:** `src/pages/finance/Payments.tsx`

Seguir o padrao ja existente em `src/components/leads/LeadsTableView.tsx`:

1. Adicionar tipos `SortField` e `SortDirection` locais
2. Adicionar estados `sortField` (default: `'payment_date'`) e `sortDirection` (default: `'desc'`) -- pagamentos mais recentes primeiro por defeito
3. Criar funcao `handleSort(field)` que alterna a direcao se o campo ja estiver ativo, ou define novo campo com direcao `asc`
4. Criar componentes `SortIcon` e `SortableHeader` inline (igual ao padrao dos Leads)
5. Aplicar `.sort()` no array `filteredPayments` dentro de um `useMemo` antes de renderizar
6. Substituir os `TableHead` estaticos por `SortableHeader` nas colunas ordenaveis
7. Importar `ArrowUpDown`, `ArrowUp`, `ArrowDown` do `lucide-react`

A ordenacao e feita no frontend (client-side) sobre os dados ja filtrados.


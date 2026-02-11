

## Persistir Todos os Filtros no Site (localStorage)

### Objetivo
Garantir que qualquer filtro escolhido pelo utilizador (status, pesquisa, datas, metodo, categoria, tab ativa) se mantenha ao navegar entre paginas e voltar.

### Abordagem
Criar um hook reutilizavel `usePersistedState` que funciona como `useState` mas guarda/le automaticamente do `localStorage`. Depois, substituir todos os `useState` de filtros em todas as paginas por este hook.

### Hook reutilizavel

**Novo ficheiro: `src/hooks/usePersistedState.ts`**

```text
function usePersistedState<T>(key: string, defaultValue: T, validate?: (v: any) => boolean): [T, (v: T) => void]
```

- Le do localStorage na inicializacao (lazy init)
- Grava no localStorage via useEffect quando o valor muda
- Aceita funcao de validacao opcional (para garantir que valores guardados sao validos)
- Envolve tudo em try/catch para ambientes sem localStorage

### Paginas a alterar

| Pagina | Ficheiro | Filtros a persistir | Key localStorage |
|--------|----------|---------------------|------------------|
| Financeiro (resumo) | `src/pages/Finance.tsx` | dateRange, tab ativa | `finance-daterange-v1`, `finance-tab-v1` |
| Pagamentos | `src/pages/finance/Payments.tsx` | statusFilter, methodFilter, dateRange, searchTerm | `finance-payments-filters-v1` |
| Despesas | `src/pages/finance/Expenses.tsx` | search, dateRange, categoryFilter | `finance-expenses-filters-v1` |
| Faturas | `src/components/finance/InvoicesContent.tsx` | searchTerm, dateRange | `finance-invoices-filters-v1` |
| Pedidos Internos | `src/pages/finance/InternalRequests.tsx` | filterType, filterStatus | `finance-requests-filters-v1` |
| Leads | `src/pages/Leads.tsx` | searchQuery, statusFilter, dateRange | `leads-filters-v1` |
| Vendas | `src/pages/Sales.tsx` | search, statusFilter | `sales-filters-v1` |
| Propostas | `src/pages/Proposals.tsx` | search, statusFilter | `proposals-filters-v1` |
| Clientes | `src/pages/Clients.tsx` | filters (status, source, dateFrom, dateTo) | `clients-filters-v1` |

### Detalhes tecnicos

**1. Criar `src/hooks/usePersistedState.ts`**
- Hook generico que substitui `useState` com persistencia
- Suporta tipos primitivos (string, number) e objetos (dateRange, filters)
- Datas sao serializadas como ISO strings e re-hidratadas como `Date` ao ler
- Aceita parametro `serialize`/`deserialize` opcional para tipos complexos como `DateRange` (que contem objetos `Date`)

**2. Criar `src/hooks/usePersistedFilters.ts`** (opcional, conveniencia)
- Wrapper que agrupa multiplos filtros numa unica key JSON
- Exemplo: `usePersistedFilters('finance-payments-filters-v1', { status: 'all', method: 'all', dateRange: undefined })`
- Evita ter 4 keys separadas por pagina

**3. Alterar cada pagina**
- Substituir `useState` dos filtros por `usePersistedState` ou `usePersistedFilters`
- Manter a logica de `?status=pending` via URL (Pagamentos) como override inicial -- se o URL tiver parametro, usa-o; senao, usa o valor guardado
- A tab ativa do Finance.tsx muda de `Tabs defaultValue="resumo"` para `Tabs value={activeTab} onValueChange={setActiveTab}` com persistencia
- O botao "Limpar filtros" (onde existir) limpa tanto o state como o localStorage

**4. Tratamento especial para DateRange**
- `DateRange` contem objetos `Date` que nao sobrevivem a JSON.stringify/parse
- O deserialize converte as strings ISO de volta para `Date`:
```text
deserialize: (v) => ({
  from: v.from ? new Date(v.from) : undefined,
  to: v.to ? new Date(v.to) : undefined,
})
```

**5. Nao persistir**
- Termos de pesquisa/search (resetam ao voltar -- experiencia mais natural)
- Modais abertos, items selecionados (sao estado de sessao, nao preferencia)

Nota: Apos reflexao, pesquisa/search tambem sera persistida conforme pedido do utilizador ("toda decisao em filtros").

### Resultado esperado
- O utilizador aplica qualquer combinacao de filtros em qualquer pagina
- Navega para outra pagina
- Volta -- todos os filtros estao exatamente como deixou
- O botao "Limpar" (onde existir) limpa tudo incluindo o localStorage


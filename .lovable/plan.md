

# Adicionar Filtro de Tipo (Energia / Outros Servicos) nos Modulos

## Resumo

Adicionar um filtro "Tipo" (Energia / Outros Servicos) nas paginas de Propostas, Vendas, Leads e Clientes. Este filtro so sera visivel para organizacoes do nicho **telecom**, pois e o unico nicho que utiliza `proposal_type`.

## Mapeamento por modulo

| Modulo | Campo filtrado | Valores |
|--------|---------------|---------|
| Propostas | `proposal.proposal_type` | energia / servicos |
| Vendas | `sale.proposal_type` | energia / servicos |
| Leads | `lead.tipologia` | ee, gas, servicos, ee_servicos (agrupados em Energia vs Servicos) |
| Clientes | Sem campo direto -- filtro nao aplicavel neste modulo |

**Nota sobre Clientes:** A tabela `crm_clients` nao tem campo `proposal_type` nem `tipologia`. Para filtrar clientes por tipo seria necessario cruzar com propostas/vendas associadas, o que adicionaria complexidade significativa. Recomenda-se aplicar o filtro apenas nas Propostas, Vendas e Leads.

## Secao Tecnica

### 1. Propostas (`src/pages/Proposals.tsx`)

- Novo state: `typeFilter` com valores `'all' | 'energia' | 'servicos'`
- Persistido com `usePersistedState('proposals-type-v1', 'all')`
- Adicionado ao bloco de filtros como um `Select` com 3 opcoes: "Todos os tipos", "Energia", "Outros Servicos"
- Filtro aplicado: `matchesType = typeFilter === 'all' || proposal.proposal_type === typeFilter`
- Visivel apenas quando `isTelecom === true`

### 2. Vendas (`src/pages/Sales.tsx`)

- Novo state: `typeFilter` com valores `'all' | 'energia' | 'servicos'`
- Persistido com `usePersistedState('sales-type-v1', 'all')`
- Adicionado ao bloco de filtros apos o filtro de estado
- Filtro aplicado: `matchesType = typeFilter === 'all' || sale.proposal_type === typeFilter`
- Visivel apenas quando `isTelecom === true`

### 3. Leads (`src/pages/Leads.tsx`)

- Novo state: `tipologiaFilter` com valores `'all' | 'ee' | 'gas' | 'servicos' | 'ee_servicos'`
- Persistido com `usePersistedState('leads-tipologia-v1', 'all')`
- Adicionado ao bloco de filtros existente
- Filtro aplicado: `matchesTipologia = tipologiaFilter === 'all' || lead.tipologia === tipologiaFilter`
- Labels ja existem em `TIPOLOGIA_LABELS` (`src/types/index.ts`)
- Visivel apenas quando `isTelecom === true`

### 4. Clientes -- Nao aplicavel

A tabela `crm_clients` nao possui campo de tipo/tipologia. Este filtro nao sera adicionado a este modulo.

### Ficheiros a alterar

- `src/pages/Proposals.tsx` -- adicionar Select de tipo + logica de filtragem
- `src/pages/Sales.tsx` -- adicionar Select de tipo + logica de filtragem
- `src/pages/Leads.tsx` -- adicionar Select de tipologia + logica de filtragem

### Aspeto visual do filtro

Sera um `Select` compacto, consistente com os filtros existentes:

```text
[Icone Zap] Todos os tipos  v
  - Todos os tipos
  - Energia
  - Outros Servicos
```

Para Leads, usara as tipologias ja definidas:

```text
Todas as tipologias  v
  - Todas
  - EE
  - Gas
  - Servicos
  - EE + Servicos
```


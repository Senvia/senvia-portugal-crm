

## Plano: Adicionar filtro de pesquisa por nome de comercial nas Comissões

### Alteração

**`src/components/finance/CommissionsTab.tsx`**
- Adicionar estado `searchTerm` para o input de pesquisa
- Adicionar `<Input>` com ícone de pesquisa ao lado do Select de mês, numa row flex
- Filtrar `commercials` por `item.name` com base no `searchTerm` (case-insensitive)
- Usar os `filteredCommercials` na renderização em vez de `commercials`

### Layout
```text
[ Select Mês ▾ ] [ 🔍 Pesquisar comercial... ]
```

Em mobile: ambos ficam full-width empilhados. Em desktop: lado a lado.

### 1 ficheiro afetado
- `src/components/finance/CommissionsTab.tsx`


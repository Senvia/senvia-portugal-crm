

## Reordenar filtros na pagina de Propostas

### Problema
O filtro "Periodo" (DateRangePicker) aparece depois dos outros filtros. O utilizador quer que apareca antes do campo de pesquisa.

### Solucao
Mover o `DateRangePicker` para ser o primeiro elemento dentro do contentor de filtros, antes do campo de pesquisa.

### Alteracao em `src/pages/Proposals.tsx`

Ordem actual dos filtros (linhas 131-152):
1. Pesquisa (Input)
2. TeamMemberFilter
3. Status (Select)
4. Periodo (DateRangePicker)

Nova ordem:
1. Periodo (DateRangePicker)
2. Pesquisa (Input)
3. TeamMemberFilter
4. Status (Select)

### Ficheiro a editar
- `src/pages/Proposals.tsx` (reordenar elementos dentro do contentor de filtros)


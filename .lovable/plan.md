

## Ocultar "Tipologia" (Bronze/Ouro/Prata) quando módulo de Energias está desativado

O nicho `telecom` renomeia os estados dos clientes para "Tipologia: Bronze/Prata/Ouro" em vez de "Estado: Ativo/Inativo/VIP". Quando o módulo de Energias está desativado, deve usar os labels genéricos.

### Abordagem

Modificar o hook `useClientLabels` para aceitar o estado do módulo de energia e retornar labels genéricos de status quando `modules.energy` está off:

**Ficheiro: `src/hooks/useClientLabels.ts`**
- Importar `useModules`
- Quando `niche === 'telecom' && !modules.energy`, sobrepor os campos de status com os valores genéricos (`Estado`, `Ativo`, `Inativo`, `VIP`, `Clientes Ativos`, `Clientes Inativos`, `Clientes VIP`)

Esta abordagem centralizada corrige automaticamente todos os locais que usam `labels`:
- Cards de stats em `Clients.tsx` (Clientes Bronze → Clientes Ativos, etc.)
- Tabela em `ClientsTable.tsx` (coluna Tipologia → Estado, badges)
- Drawer em `ClientDetailsDrawer.tsx` (campo Tipologia → Estado)
- Filtros em `ClientFilters.tsx` (dropdown de status)
- Modais Create/Edit (selector de status)
- Campanhas de marketing (filtros de status)

**1 ficheiro a alterar**, efeito propagado automaticamente.


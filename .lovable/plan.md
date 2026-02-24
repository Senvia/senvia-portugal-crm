

# Adicionar Filtro "Tipo" (Energia / Outros Servicos) nos Clientes

## Problema

A pagina de Clientes nao tem o filtro de Tipo (Energia / Outros Servicos) que ja existe nas Propostas, Vendas e Leads.

## Desafio Tecnico

A tabela `crm_clients` nao tem uma coluna `proposal_type`. Contudo, as tabelas `proposals` e `sales` estao ligadas aos clientes via `client_id` e possuem o campo `proposal_type`. A solucao e criar um hook que carrega os `proposal_type` distintos por cliente e filtra no frontend.

## Abordagem

Criar um hook `useClientProposalTypes` que faz um query leve para buscar os tipos de propostas/vendas associados a cada cliente. Com base nisso, o filtro funciona assim:

- **"Energia"**: Mostra clientes que tem pelo menos uma proposta/venda do tipo `energia`
- **"Outros Servicos"**: Mostra clientes que tem pelo menos uma proposta/venda do tipo `servicos`
- **"Todos os tipos"**: Sem filtro

## Secao Tecnica

### 1. Novo hook: `src/hooks/useClientProposalTypes.ts`

- Query a tabela `proposals` agrupando por `client_id` e `proposal_type` para obter um mapa: `{ [clientId]: Set<'energia' | 'servicos'> }`
- Utiliza `useQuery` com chave `['client-proposal-types', organizationId]`
- Apenas ativo quando `isTelecom === true`

### 2. Ficheiro: `src/components/clients/ClientFilters.tsx`

- Adicionar `proposalType: 'all' | 'energia' | 'servicos'` ao `ClientFiltersState`
- Atualizar `defaultFilters` com `proposalType: 'all'`
- Receber prop `isTelecom` para renderizar condicionalmente o Select de tipo
- Atualizar `hasActiveFilters` para incluir `proposalType`

### 3. Ficheiro: `src/pages/Clients.tsx`

- Importar e usar `useClientProposalTypes`
- Determinar `isTelecom` a partir de `organization?.niche === 'telecom'`
- Passar `isTelecom` ao componente `ClientFilters`
- Adicionar logica de filtragem: verificar se o `clientId` aparece no mapa de tipos para o tipo selecionado

### Ficheiros a alterar/criar

- `src/hooks/useClientProposalTypes.ts` (novo)
- `src/components/clients/ClientFilters.tsx` (alterar)
- `src/pages/Clients.tsx` (alterar)


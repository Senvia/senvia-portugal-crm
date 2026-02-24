# Substituir "Valor Total" por Comissao / MWh e kWp nos Clientes (Somente para Telecom)

## Contexto

Atualmente, na pagina de Clientes, existe uma metrica "Valor Total" que soma o `total_value` das vendas. Para o nicho **telecom**, esta metrica nao e relevante -- o que interessa sao:

- **Comissao** (soma do campo `comissao` das vendas)
- **MWh** (soma do campo `consumo_anual` das vendas, convertido de kWh para MWh)
- **kWp** (soma do campo `kwp` das vendas)

## Solucao

### 1. Base de Dados -- Novas Colunas

Adicionar 3 novas colunas a tabela `crm_clients`:

```text
total_comissao  NUMERIC DEFAULT 0
total_mwh       NUMERIC DEFAULT 0
total_kwp       NUMERIC DEFAULT 0
```

### 2. Trigger -- Atualizar Metricas Automaticamente

Alterar a funcao `update_client_sales_metrics` para tambem acumular:

- `total_comissao` += `sales.comissao`
- `total_mwh` += `sales.consumo_anual / 1000` (kWh para MWh)
- `total_kwp` += `sales.kwp`

Criar tambem um script de backfill para recalcular os valores para clientes existentes a partir das vendas ja registadas.

### 3. Interface -- Exibicao Condicional por Nicho

Para nicho **telecom**, substituir o card/coluna "Valor Total" por 3 metricas separadas:

**Pagina Clientes (`Clients.tsx`)** -- Card de stats:

- Substituir o card "Valor Total" por "Comissao Total" (para telecom)

**Detalhes do Cliente (`ClientDetailsDrawer.tsx`)** -- Metricas:

- Telecom: mostrar 3 metricas em vez de "Valor Total":
  - Comissao (euro)
  - MWh
  - kWp

**Modal de Detalhes (`ClientDetailsModal.tsx`)** -- Metricas:

- Mesma logica condicional

Para todos os outros nichos, "Valor Total" continua a funcionar como antes.

### 4. Tipos e Exportacao

- Atualizar `CrmClient` em `src/types/clients.ts` com os 3 novos campos opcionais
- Atualizar `mapClientsForExport` em `src/lib/export.ts` para incluir estas colunas no telecom

## Secao Tecnica

### Ficheiros alterados

1. **Migracao SQL** -- Adicionar colunas + atualizar trigger + backfill
2. `**src/types/clients.ts**` -- Adicionar `total_comissao`, `total_mwh`, `total_kwp`
3. `**src/pages/Clients.tsx**` -- Card de stats condicional (telecom vs generico)
4. `**src/components/clients/ClientDetailsDrawer.tsx**` -- Metricas condicionais
5. `**src/components/clients/ClientDetailsModal.tsx**` -- Metricas condicionais
6. `**src/hooks/useClients.ts**` -- `useClientStats` para incluir totais de comissao/mwh/kwp
7. `**src/lib/export.ts**` -- Colunas extra na exportacao para telecom


## Alterar OP para contar NIFs distintos das Propostas

### Contexto

O utilizador quer que as colunas **OP** contem **NIFs distintos** dos clientes associados às propostas no periodo, em vez de contar o numero total de propostas. Um cliente com 3 propostas de energia conta como 1 OP Energia.

### Solução

**`src/components/dashboard/MetricsPanel.tsx`**:

1. Alterar a query de proposals para incluir o `client_id` no select: `"created_by, proposal_type, kwp, client_id"`
2. Fazer uma segunda query (ou join) para buscar os NIFs dos clientes: query `crm_clients` com os `client_id` das proposals para obter o campo `nif`
3. No calculo de `ritmoRows`, em vez de `.length` para contar propostas, contar **NIFs distintos (não nulos)** por tipo:
   - `opEnergia`: count de NIFs distintos em propostas tipo `energia`
   - `opSolar`: count de NIFs distintos em propostas tipo `servicos` com `kwp > 0`
   - `opComissao`: soma de opEnergia + opSolar (NIFs distintos totais, ou soma simples)

### Abordagem técnica

- Na query de proposals, adicionar `.select("created_by, proposal_type, kwp, client_id")`
- Após obter as proposals, extrair os `client_id` únicos e fazer uma query ao `crm_clients` para buscar `id, nif`
- Criar um Map `client_id -> nif` para lookup rapido
- No `useMemo` do `ritmoRows`, agrupar por NIF distinto em vez de contar linhas

### Ficheiro
- `src/components/dashboard/MetricsPanel.tsx`


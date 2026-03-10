

## Corrigir tabela B) Vendas — contar contratos, mostrar valores corretos e incluir "Concluídas"

### Problemas identificados

1. **NIFs conta clientes distintos** — deveria contar nº de contratos (vendas), pois 1 NIF pode ter 2 contratos (energia + serviços)
2. **Energia mostra 0** — o campo `consumo_anual` existe mas o filtro de status só inclui `fulfilled`, excluindo `delivered`
3. **Comissão não soma vendas Concluídas (delivered)** — o hook `useMonthSalesMetrics` filtra apenas `status = 'fulfilled'`, ignorando vendas `delivered` (ex: DNR)

### Alterações

**Ficheiro: `src/hooks/useMonthSalesMetrics.ts`**

1. **Incluir status `delivered`**: Mudar `.eq("status", "fulfilled")` para `.in("status", ["fulfilled", "delivered"])`
2. **Contar contratos em vez de NIFs distintos**: Substituir o `Set<string>` de `client_id` por um contador simples que incrementa por cada venda
3. Manter os campos `energia` (consumo_anual/1000 → MWh) e `solar` (kwp) como estão — os valores apareciam a 0 porque as vendas `delivered` estavam excluídas

### Resultado esperado

- NIFs passa a mostrar **nº total de contratos** (vendas), não clientes únicos
- Energia e Solar mostram os valores reais de todas as vendas entregues + concluídas
- Comissão soma correctamente incluindo vendas com estado `delivered`

**1 ficheiro, ~3 linhas alteradas.**


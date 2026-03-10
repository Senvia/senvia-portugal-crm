

## Problema: Venda 0016 tem comissão nos CPEs mas NULL na tabela `sales`

### Diagnóstico

A comissão da venda 0016 (71,46€) está guardada na tabela `proposal_cpes`, não na tabela `sales`:

- `proposal_cpes` → `comissao: 71.46`, `consumo_anual: 100000`
- `sales` → `comissao: NULL`, `consumo_anual: NULL`

O hook `useMonthSalesMetrics` lê `comissao` e `consumo_anual` directamente da tabela `sales`, onde estão a NULL. O hook `useLiveCommissions` (módulo Ativações/Comissões) funciona correctamente porque vai buscar os dados à tabela `proposal_cpes`.

As vendas 0015, 0017 e 0018 tiveram os valores preenchidos manualmente na venda — a 0016 não.

### Solução

Alterar `useMonthSalesMetrics` para seguir a mesma lógica de `useLiveCommissions`: buscar os dados reais de `proposal_cpes` (comissão e consumo_anual) via `proposal_id` da venda, em vez de ler os campos directamente da tabela `sales`.

**Ficheiro: `src/hooks/useMonthSalesMetrics.ts`**

1. Após buscar as vendas `fulfilled`, extrair os `proposal_id`s
2. Fazer query a `proposal_cpes` para obter `comissao` e `consumo_anual` por proposta
3. Somar os valores dos CPEs por venda (uma proposta pode ter múltiplos CPEs)
4. Usar esses valores em vez dos campos directos da tabela `sales`
5. Manter `kwp` a partir de `servicos_details` da proposta (como faz o `useLiveCommissions`)

Isto garante que todas as vendas com proposta associada mostram os valores correctos, independentemente de terem sido copiados manualmente para a venda ou não.


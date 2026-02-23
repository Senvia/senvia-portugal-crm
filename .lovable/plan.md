

# Corrigir Ferramenta Financeira do Otto: Adicionar Filtros de Data

## Problema
A ferramenta `get_finance_summary` do Otto:
1. **Nao aceita parametros de data** -- busca TODAS as vendas/despesas da organizacao, ignorando o periodo pedido pelo utilizador
2. **Calcula "recebido" de forma errada** -- usa o `payment_status` da venda em vez de somar pagamentos reais da tabela `sale_payments`
3. **Nao filtra vendas por mes** -- quando o utilizador pergunta "vendas de fevereiro 2026", o Otto nao consegue filtrar

## Solucao

### Alterar a ferramenta `get_finance_summary` no ficheiro `supabase/functions/otto-chat/index.ts`

**1. Adicionar parametros de data a definicao da ferramenta:**

```
parameters: {
  type: "object",
  properties: {
    start_date: { type: "string", description: "Data inicio no formato YYYY-MM-DD (opcional, default: inicio do mes atual)" },
    end_date: { type: "string", description: "Data fim no formato YYYY-MM-DD (opcional, default: fim do mes atual)" },
  },
  required: [],
}
```

**2. Reescrever o executor da ferramenta para:**
- Calcular `start_date` e `end_date` automaticamente (mes atual) se nao fornecidos
- Filtrar vendas por `sale_date` dentro do intervalo
- Somar pagamentos reais da tabela `sale_payments` filtrados por `payment_date` no intervalo
- Filtrar despesas por `expense_date` no intervalo
- Retornar o periodo usado na resposta para o modelo saber a que se refere

**3. Novo formato de resposta da ferramenta:**

```json
{
  "period": { "start": "2026-02-01", "end": "2026-02-28" },
  "total_billed": 5000,
  "total_received": 3000,
  "total_pending": 2000,
  "total_expenses": 800,
  "balance": 2200,
  "total_sales_count": 6
}
```

### Ficheiro a alterar
- `supabase/functions/otto-chat/index.ts` -- definicao + executor de `get_finance_summary`

### Resultado
- O Otto filtrara dados financeiros pelo periodo correto quando o utilizador perguntar "vendas deste mes", "faturacao de janeiro", etc.
- Os valores de "recebido" e "pendente" serao calculados com base nos pagamentos reais
- O modelo sabera sempre a que periodo se referem os dados

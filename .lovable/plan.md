

## Diagnóstico

O módulo de comissões **já tem** o seletor de mês, o totalizador global e a lista de CPEs — a lógica está correta. O problema é que **os dados não aparecem** porque as vendas `delivered` deste mês têm `lead_id = NULL`.

No código atual (`useLiveCommissions.ts`, linha 125):
```typescript
if (!sale || !sale.lead_id) continue; // ← salta TODOS os CPEs
```

As 2 vendas de fevereiro 2026 (com `activation_date` 24 e 26 de fevereiro, `negotiation_type = angariacao`, CPEs com consumo 50.000 e 80.000 kWh) são ignoradas porque não têm lead associado.

## Plano de correção

### Ficheiro: `src/hooks/useLiveCommissions.ts`

1. **Remover a obrigatoriedade de `lead_id`** — quando `lead_id` é null, agrupar o CPE como "Sem comercial atribuído" em vez de o ignorar
2. **Suportar também `assigned_to` direto da venda** — algumas vendas podem não ter lead mas ter um `assigned_to` no próprio registo ou na proposta
3. Alterar a query de sales para incluir também o campo `assigned_to` da própria venda (se existir) como fallback

Concretamente:
- Linha 69: adicionar `assigned_to` ao select das sales
- Linha 125: remover `!sale.lead_id` — usar `sale.assigned_to || leadMap.get(sale.lead_id) || 'unassigned'` como chave de agrupamento
- O nome "unassigned" mostra "Sem Comercial" na UI

Apenas 1 ficheiro editado, ~5 linhas alteradas.


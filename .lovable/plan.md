

## Problema: Ritmo não mostra OPs na Perfect2Gether

### Diagnóstico

Encontrei **duas causas**:

1. **Cliente sem NIF**: A única proposta de Março (código 0027, cliente "Manuel") tem `nif = null`. O código do Ritmo exige NIF para contar uma OP — se não tem NIF, ignora a proposta (`if (!nif) continue`).

2. **Propostas antigas fora do filtro**: As outras propostas com status "sent"/"negotiating" são de Janeiro e Fevereiro, por isso não aparecem no mês de Março.

Ou seja, o Ritmo está tecnicamente correto — simplesmente não há propostas válidas (com NIF) no mês atual.

### Solução proposta

O problema de fundo é que a lógica de deduplificação por NIF falha quando os clientes não têm NIF preenchido. A correção:

**`src/components/dashboard/MetricsPanel.tsx`** — No cálculo dos `ritmoRows`, usar `client_id` como fallback quando o NIF é `null`:

```
// Antes:
if (!nif) continue;

// Depois:
const dedupeKey = nif || p.client_id;
if (!dedupeKey) continue;
```

Isto garante que propostas de clientes sem NIF ainda são contadas como OPs distintas (deduplificadas pelo ID do cliente em vez do NIF).

### Ficheiros alterados
- `src/components/dashboard/MetricsPanel.tsx` — fallback de `client_id` quando NIF é null

### Nota
O cliente "Manuel" (código 0012) deveria ter o NIF preenchido para garantir deduplificação correta entre propostas de diferentes clientes. O fix acima é um safety net.


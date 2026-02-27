

## Diagnóstico

A lógica de comissões (`useLiveCommissions.ts`, linha 127) determina o comercial via:
```
sale → lead_id → leads.assigned_to
```

Mas o vendedor está no **cliente**, não no lead:
```
sale → client_id → crm_clients.assigned_to = Nuno Dias ✅
```

Dados confirmados: ambas as vendas (0011, 0012) têm `client_id` apontando para "Ricardo Cabral", cujo `assigned_to` é o Nuno Dias.

## Plano

### 1. Alterar lógica de comissões para usar `crm_clients.assigned_to`

**Arquivo:** `src/hooks/useLiveCommissions.ts`

- No select de `sales`, incluir `client_id` (já existe na tabela)
- Substituir a query de `leads` por uma query de `crm_clients` usando os `client_id` das vendas
- Criar `clientMap` em vez de `leadMap`
- Linha 127: mudar de `sale.lead_id ? leadMap.get(sale.lead_id)` para `sale.client_id ? clientMap.get(sale.client_id)`
- Fallback mantém-se como `'unassigned'`

### Detalhes técnicos
- Sem alterações de base de dados
- Sem alterações de UI
- Apenas 1 ficheiro alterado: `useLiveCommissions.ts`
- As ~10 linhas que fazem fetch de leads e criam `leadMap` são substituídas por fetch de `crm_clients` e `clientMap`


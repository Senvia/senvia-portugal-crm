

## Alterar Ativações para contar apenas Vendas Concluídas

### Contexto

Atualmente, o painel de Ativações (`useActivationObjectives.ts`) conta vendas que tenham `activation_date` preenchida e status diferente de `cancelled` (`.neq("status", "cancelled")`). O utilizador quer que conte apenas vendas com status **"completed"** (Concluídas).

### Alteração

**`src/hooks/useActivationObjectives.ts`**:

1. Na query `activations-monthly` (linha 61): substituir `.neq("status", "cancelled")` por `.eq("status", "completed")`
2. Na query `activations-annual` (mesma lógica): substituir `.neq("status", "cancelled")` por `.eq("status", "completed")`

Isto garante que apenas vendas com status "completed" (Concluídas) são contabilizadas como ativações.

### Ficheiro
- `src/hooks/useActivationObjectives.ts`


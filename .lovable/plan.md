

## Saldo não descontado nas férias do Thiago

### Causa raiz

Existem **dois perfis "Thiago"** no sistema:
- `Thiago` (44a688ac) — tem saldo de férias configurado (22 dias)
- `Thiago Sousa` (504a57df) — submeteu o pedido de férias, mas **não tem saldo configurado**

O trigger `rh_update_vacation_balance` tentou descontar dias ao aprovar, mas não encontrou registo em `rh_vacation_balances` para o user `504a57df`, logo o UPDATE não afectou nenhuma linha.

### Correção imediata (dados)

1. **Adicionar saldo de férias para "Thiago Sousa"** (504a57df) via o painel "Gerir Saldos" — este é o utilizador real que submeteu as férias
2. Depois de adicionar o saldo, forçar o desconto manualmente (ou rejeitar e re-aprovar o pedido)

### Correção estrutural (código)

**Ficheiro: trigger `rh_update_vacation_balance`** — migration SQL

Alterar o trigger para que, quando não existe saldo configurado para o utilizador, crie automaticamente um registo com `total_days = 22` (valor default) e desconte os dias. Isto evita que aprovações futuras falhem silenciosamente.

```sql
-- Se não existe balance, criar com default 22 dias
INSERT INTO rh_vacation_balances (organization_id, user_id, year, total_days, used_days)
VALUES (NEW.organization_id, NEW.user_id, EXTRACT(YEAR FROM NEW.start_date)::int, 22, v_total_days)
ON CONFLICT (organization_id, user_id, year)
DO UPDATE SET used_days = rh_vacation_balances.used_days + v_total_days, updated_at = now();
```

**Ficheiro: `src/components/portal-total-link/rh/RhAdminPanel.tsx`**

Adicionar um aviso visual no painel de aprovação quando o colaborador **não tem saldo configurado**, para que o admin saiba antes de aprovar.

### Ficheiros alterados
- Migration SQL — trigger `rh_update_vacation_balance` com auto-criação de saldo
- `src/components/portal-total-link/rh/RhAdminPanel.tsx` — aviso quando o user não tem saldo


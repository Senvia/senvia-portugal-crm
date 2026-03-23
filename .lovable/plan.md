

## Unificar perfis do Thiago

### Situação actual

| Perfil | ID | Email | Orgs | Roles |
|--------|----|-------|------|-------|
| **Thiago Sousa** (MANTER) | `504a57df` | geral.senvia@gmail.com | Senvia Agency (admin) | super_admin, admin |
| **Thiago** (REMOVER) | `44a688ac` | thiagogaldino21@gmail.com | P2G (salesperson) | salesperson |

### Dados a migrar de `44a688ac` → `504a57df`

| Tabela | Registos | Acção |
|--------|----------|-------|
| `organization_members` | 1 (P2G, salesperson, profile_id=542847aa) | Inserir `504a57df` como membro P2G |
| `crm_clients.assigned_to` | 1 cliente (ACUSTIKASSUNTO) | UPDATE → `504a57df` |
| `activation_objectives.user_id` | 3 registos | UPDATE → `504a57df` |
| `monthly_objectives.user_id` | 1 registo | UPDATE → `504a57df` |
| `monthly_metrics.user_id` | 1 registo | UPDATE → `504a57df` |
| `rh_vacation_balances.user_id` | 1 registo (22 dias, 2026) | UPDATE → `504a57df` |

### Pós-migração — limpar perfil duplicado

1. Remover `44a688ac` de `organization_members` (P2G)
2. Remover `44a688ac` de `user_roles` (salesperson)
3. Banir o utilizador `44a688ac` via edge function (para não poder fazer login)

### Execução

Tudo via operações de dados (insert tool) — sem alterações de código ou schema.


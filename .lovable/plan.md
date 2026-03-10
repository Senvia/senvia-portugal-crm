

## Plano: Excluir admins do round-robin (Senvia)

### Problema
O round-robin atribui leads a **todos** os membros ativos, incluindo admins. Para a Senvia, apenas comerciais (`salesperson`) devem receber leads.

### Abordagem
Adicionar uma flag `exclude_admins_from_assignment: true` no `sales_settings` da organização. Quando ativa, o round-robin filtra membros com `role != 'admin'`.

Isto permite que a Senvia ative a flag sem afetar outras organizações.

### Alterações (4 locais de round-robin + 1 UI)

**1. `supabase/functions/submit-lead/index.ts`** (2 blocos de round-robin, linhas ~106 e ~507)
- Após obter `salesSettings`, verificar `salesSettings.exclude_admins_from_assignment`
- Se true, adicionar `.neq('role', 'admin')` à query de `organization_members`

**2. `src/hooks/useLeads.ts`** (linha ~174)
- Mesmo filtro condicional na query de membros do `useCreateLead`

**3. `src/hooks/useConvertProspectToLead.ts`** (linha ~34)
- Mesmo filtro condicional

**4. Ativar a flag para a Senvia**
- Migração SQL para adicionar `exclude_admins_from_assignment: true` ao `sales_settings` da organização Senvia

### Resultado
- Senvia: apenas `salesperson` recebe leads via round-robin
- Outras orgs: comportamento inalterado
- 3 ficheiros editados + 1 migração


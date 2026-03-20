

## Módulo RH dentro do Portal Total Link

### Contexto
Trazer o módulo de férias/ausências do projeto "Realize Solutions Hub" para este CRM, adaptado para funcionar **dentro do Portal Total Link** como uma nova secção "RH". A diferença principal: não há dois acessos separados (colaborador vs admin). Todos os membros P2G veem a mesma interface — colaboradores marcam férias/ausências, admins também marcam e conseguem aprovar/rejeitar.

### Estrutura da Base de Dados

Criar 4 tabelas novas (via migration):

1. **`rh_absences`** — pedidos de ausência
   - `id`, `organization_id`, `user_id` (quem marca), `absence_type` (enum: vacation, sick_leave, appointment, personal_leave, training, other), `status` (pending/approved/partially_approved/rejected), `start_date`, `end_date`, `notes`, `approved_by`, `approved_at`, `rejection_reason`, `created_at`, `updated_at`

2. **`rh_absence_periods`** — períodos dentro de um pedido
   - `id`, `absence_id` (FK), `start_date`, `end_date`, `business_days`, `status`, `period_type` (full_day/partial), `start_time`, `end_time`

3. **`rh_vacation_balances`** — saldo de férias por user/ano
   - `id`, `organization_id`, `user_id`, `year`, `total_days`, `used_days`, `created_at`, `updated_at`

4. **`rh_holidays`** — feriados nacionais/custom
   - `id`, `organization_id`, `date`, `name`, `year`, `is_national`, `created_at`

RLS: acesso restrito a membros da organização via `is_org_member()`. Todos veem os seus pedidos; admins veem todos os pedidos da org.

### Estrutura de Ficheiros

```text
src/
├── lib/
│   └── rh-utils.ts              # absence types, vacation utils (portado)
├── hooks/
│   ├── useRhAbsences.ts         # CRUD ausências + aprovações
│   └── useRhHolidays.ts         # feriados
├── pages/portal-total-link/
│   └── Rh.tsx                   # página principal do módulo RH
├── components/portal-total-link/rh/
│   ├── RhAbsenceRequestForm.tsx # form para marcar ausência (dialog)
│   ├── RhAbsenceCard.tsx        # card de cada pedido
│   ├── RhAbsenceApprovalDialog.tsx # dialog de aprovação (admin)
│   ├── RhVacationBalance.tsx    # card com saldo de férias
│   └── RhAdminPanel.tsx         # painel admin: ver todos os pedidos + gerir saldos
```

### UI — Página RH

A página terá **duas vistas** na mesma interface:

1. **Vista pessoal** (todos os users):
   - Card de saldo de férias do utilizador
   - Botão "+ Marcar Ausência" → abre dialog com tipo de ausência, selector de períodos (MultiPeriodSelector portado), notas
   - Lista dos seus pedidos com status (pendente/aprovado/rejeitado)

2. **Vista admin** (users com role admin):
   - Secção adicional "Pedidos da Equipa" com todos os pedidos pendentes
   - Ações: Aprovar, Rejeitar em cada card
   - Gestão de saldos de férias dos membros

A detecção admin usa `usePermissions().isAdmin`.

### Integração no Portal Total Link

1. **`portalTotalLinkConfig.ts`** — adicionar secção "RH" com key `rh`, path `/portal-total-link/rh`
2. **`App.tsx`** — adicionar rota `<Route path="rh" element={<Rh />} />` dentro do Portal Total Link
3. **`PortalTotalLinkLayout.tsx`** — o tipo `PortalTotalLinkSectionKey` será actualizado automaticamente pelo config

### Ficheiros alterados/criados

| Ficheiro | Acção |
|----------|-------|
| `src/components/portal-total-link/portalTotalLinkConfig.ts` | Adicionar secção RH |
| `src/App.tsx` | Adicionar rota RH |
| `src/lib/rh-utils.ts` | Criar — tipos de ausência + utils de dias úteis |
| `src/hooks/useRhAbsences.ts` | Criar — hook CRUD ausências |
| `src/hooks/useRhHolidays.ts` | Criar — hook feriados |
| `src/pages/portal-total-link/Rh.tsx` | Criar — página principal |
| `src/components/portal-total-link/rh/RhAbsenceRequestForm.tsx` | Criar — form de marcação |
| `src/components/portal-total-link/rh/RhAbsenceCard.tsx` | Criar — card de pedido |
| `src/components/portal-total-link/rh/RhAbsenceApprovalDialog.tsx` | Criar — aprovação admin |
| `src/components/portal-total-link/rh/RhVacationBalance.tsx` | Criar — saldo férias |
| `src/components/portal-total-link/rh/RhAdminPanel.tsx` | Criar — painel admin |
| Migration SQL | Criar 4 tabelas + RLS + seed feriados PT 2025-2026 |

### Notas importantes
- Não haverá tabela `employees` separada — usa directamente `auth.users` / `organization_members` + `profiles`
- O `user_id` nos pedidos referencia o próprio utilizador autenticado
- Feriados nacionais PT serão inseridos via seed na migration
- A lógica de dias úteis (excluir fins-de-semana e feriados) é portada do Realize


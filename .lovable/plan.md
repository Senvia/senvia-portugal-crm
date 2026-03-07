

## Atribuição Automática de Leads (Round-Robin)

### Conceito

Quando ativada, cada novo lead é automaticamente atribuído ao próximo comercial da lista, em sequência circular (round-robin). O índice é persistido na organização para manter a ordem entre sessões.

### Alterações

**1. `src/components/settings/SalesSettingsTab.tsx`**
- Adicionar Switch "Atribuição automática de leads" com nota explicativa:
  > "Quando ativo, os novos leads são distribuídos automaticamente entre os comerciais da equipa, por ordem sequencial (round-robin). Ex: Se existem 5 comerciais, o 1.º lead vai para o comercial 1, o 2.º para o comercial 2, e assim por diante. Quando todos receberem, o ciclo recomeça."
- O estado é guardado em `sales_settings.auto_assign_leads` (boolean) + `sales_settings.round_robin_index` (number)

**2. `supabase/functions/submit-lead/index.ts`** (principal ponto de entrada de leads públicos)
- Após obter a organização, verificar `sales_settings.auto_assign_leads`
- Se ativo E o lead não tem `assigned_to` (do formulário):
  - Buscar membros ativos da organização (`organization_members` com `is_active = true`)
  - Obter `round_robin_index` atual do `sales_settings`
  - Atribuir `assigned_to` = membro no índice atual
  - Incrementar índice (mod total de membros) e atualizar `sales_settings.round_robin_index`

**3. `src/hooks/useLeads.ts`** — `useCreateLead`
- Quando `assigned_to` não é fornecido e `auto_assign_leads` está ativo:
  - Buscar membros ativos, calcular próximo pelo índice, atribuir e incrementar

**4. `src/hooks/useConvertProspectToLead.ts`**
- Já permite escolher comercial manualmente, mas se não for escolhido e auto-assign estiver ativo, aplicar round-robin

### Fluxo técnico

```text
Novo Lead (sem assigned_to)
    │
    ▼
sales_settings.auto_assign_leads === true?
    │ SIM                          │ NÃO
    ▼                              ▼
Buscar membros ativos         Lead fica sem assigned_to
Índice = round_robin_index
assigned_to = membros[índice]
round_robin_index = (índice + 1) % total
Guardar novo índice
```

### Ficheiros
- `src/components/settings/SalesSettingsTab.tsx` — UI do switch + nota
- `supabase/functions/submit-lead/index.ts` — lógica round-robin server-side
- `src/hooks/useLeads.ts` — round-robin client-side para criação manual
- `src/hooks/useConvertProspectToLead.ts` — round-robin na conversão de prospects


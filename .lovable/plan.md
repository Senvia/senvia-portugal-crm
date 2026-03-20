

## Adicionar campo CPE no modal de criação de Lead (P2G)

### Problema
O campo CPE/CUI só existe no modal de **detalhes** da lead (edição), mas não no modal de **criação**. Para a P2G, o utilizador precisa de poder introduzir o CPE logo ao criar a lead.

### Alterações

#### 1) `src/hooks/useLeads.ts` — aceitar `custom_data` no `useCreateLead`
- Adicionar `custom_data?: Record<string, unknown>` ao tipo do `mutationFn`
- O spread `...leadData` já o passa para o insert, só falta no tipo

#### 2) `src/components/leads/AddLeadModal.tsx` — campo CPE para P2G
- Importar `isPerfect2GetherOrg` de `@/lib/perfect2gether`
- Adicionar estado `cpeValue` (string)
- Na secção "Empresa" (Card), após os campos NIF e Nome da Empresa, adicionar um campo de texto "CPE/CUI" com placeholder "PT00..." — visível apenas quando `isPerfect2GetherOrg(organization?.id)`
- No `onSubmit`, passar `custom_data: { cpe: cpeValue }` quando o valor existir
- Reset do `cpeValue` no reset do form

### Ficheiros alterados
- `src/hooks/useLeads.ts` — tipo do `useCreateLead`
- `src/components/leads/AddLeadModal.tsx` — campo CPE no card Empresa (P2G only)



# Adicionar NIF Obrigatorio e Verificacao Anti-Duplicacao

## Resumo
Tornar o campo "NIF da Empresa" (company_nif) obrigatorio tanto na criacao de leads como de clientes, e usar o NIF como criterio principal para detetar clientes existentes e evitar duplicacao.

## O que muda

1. **Nova coluna na tabela `leads`**: Adicionar `company_nif` (text) para guardar o NIF da empresa diretamente na lead
2. **Formulario de Lead (AddLeadModal)**: Novo campo "NIF Empresa" obrigatorio, com pesquisa automatica no `crm_clients` por NIF ao sair do campo
3. **Formulario Publico (PublicLeadForm)**: Adicionar campo NIF obrigatorio
4. **Edge Function (submit-lead)**: Aceitar e guardar o campo `company_nif`
5. **Conversao Lead -> Cliente**: Passar o `company_nif` da lead para o cliente ao converter automaticamente (etapa "Ganho")
6. **Formularios de Cliente**: Garantir que `company_nif` fica obrigatorio por defeito nas definicoes

## Alteracoes tecnicas

### 1. Migracao de Base de Dados
- Adicionar coluna `company_nif` (text, nullable) na tabela `leads`

### 2. `src/components/leads/AddLeadModal.tsx`
- Adicionar campo `company_nif` ao schema Zod como obrigatorio: `z.string().min(1, "NIF da empresa e obrigatorio")`
- Adicionar input "NIF Empresa *" no formulario (entre telefone e origem)
- Alterar `searchExistingClient` para pesquisar por `company_nif` em vez de email/phone
- Remover os `onBlur` de email e phone, e adicionar `onBlur` no campo NIF
- Passar `company_nif` no `createLead.mutateAsync`

### 3. `src/hooks/useLeads.ts`
- Adicionar `company_nif?: string` ao tipo do `useCreateLead`

### 4. `src/types/index.ts`
- Adicionar `company_nif?: string | null` na interface `Lead`

### 5. `src/components/forms/PublicLeadForm.tsx`
- Adicionar campo `company_nif` obrigatorio ao schema e ao formulario publico

### 6. `supabase/functions/submit-lead/index.ts`
- Aceitar `company_nif` no body e incluir no INSERT

### 7. `src/hooks/useClients.ts` (useConvertLeadToClient)
- Passar `company_nif` da lead para o cliente ao converter

### 8. `src/pages/Leads.tsx`
- Passar `company_nif` do lead na chamada `convertLeadToClient.mutate` quando a lead e ganha

### 9. `src/components/leads/LeadDetailsModal.tsx`
- Mostrar o campo NIF na ficha do lead

### Fluxo de verificacao

```text
Campo NIF Empresa (onBlur)
       |
       v
Query crm_clients WHERE company_nif = X AND organization_id = Y
       |
       v
[Match encontrado?]
  Sim -> Auto-preencher nome, email, phone, notes + banner amarelo
  Nao -> Nada (continuar normalmente)
```

### Fluxo Lead Ganha -> Cliente

```text
Lead arrastada para "Ganho"
       |
       v
Verificar crm_clients WHERE lead_id = X OU company_nif = lead.company_nif
       |
       v
[Existe?]
  Sim -> Nao duplicar
  Nao -> Criar cliente com company_nif da lead
```

## Ficheiros alterados
- 1 migracao SQL (nova coluna `company_nif` na tabela `leads`)
- `src/types/index.ts`
- `src/hooks/useLeads.ts`
- `src/hooks/useClients.ts`
- `src/components/leads/AddLeadModal.tsx`
- `src/components/leads/LeadDetailsModal.tsx`
- `src/components/forms/PublicLeadForm.tsx`
- `src/pages/Leads.tsx`
- `supabase/functions/submit-lead/index.ts`



## Adicionar "Nome da Empresa" obrigatorio nas Leads (Template Telecom)

### Contexto

Atualmente, as leads tem o campo `company_nif` (NIF da empresa) mas nao tem um campo para o **nome da empresa**. Para o template telecom, este campo deve ser obrigatorio.

### Alteracoes

**1. Migracaoo de Base de Dados**

Adicionar a coluna `company_name` (text, nullable) na tabela `leads`.

```sql
ALTER TABLE public.leads ADD COLUMN company_name text;
```

**2. Atualizar o Tipo `Lead`** (`src/types/index.ts`)

Adicionar `company_name?: string | null` ao interface `Lead`.

**3. Atualizar `AddLeadModal.tsx`**

- Adicionar campo `company_name` ao schema zod (obrigatorio para todos, ja que o NIF tambem e obrigatorio para todos)
- Adicionar o campo de input "Nome da Empresa *" logo apos o campo NIF
- Auto-preencher o nome da empresa quando o NIF encontra um cliente existente (buscar tambem `company` do `crm_clients`)
- Passar `company_name` no `createLead.mutateAsync()`

**4. Atualizar `useLeads.ts` (`useCreateLead`)**

- Adicionar `company_name` ao tipo dos parametros de criacao
- Incluir no insert do Supabase

**5. Atualizar `LeadDetailsModal.tsx`**

- Exibir o nome da empresa junto ao NIF na secao de informacoes
- Permitir editar o nome da empresa inline (mesmo padrao dos outros campos editaveis)

**6. Atualizar `LeadCard.tsx`**

- Mostrar o nome da empresa abaixo do nome do contacto no cartao Kanban (quando disponivel)

**7. Atualizar `submit-lead` Edge Function**

- Aceitar `company_name` no body do request
- Incluir no insert da lead
- Incluir no payload do webhook

**8. Atualizar `LeadsTableView.tsx`**

- Adicionar coluna "Empresa" na vista de tabela

### Resultado

- O campo "Nome da Empresa" aparece como obrigatorio no formulario de criacao de leads
- Ao inserir o NIF, se encontrar um cliente existente, auto-preenche tambem o nome da empresa
- O nome da empresa e visivel no cartao Kanban, na tabela e nos detalhes da lead
- Os formularios publicos tambem podem enviar o nome da empresa via edge function

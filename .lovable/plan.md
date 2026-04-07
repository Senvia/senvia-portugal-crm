

## Plano: WhatsApp obrigatório no registo + dados de contacto e expiração no System Admin

### Contexto
- A tabela `organizations` **não tem** campo de telefone/WhatsApp de contacto da empresa.
- A tabela `profiles` **já tem** um campo `phone` (mas nunca é preenchido no registo).
- O formulário de signup (`Login.tsx`) recolhe: nome, email, password, nome da empresa e slug — mas **não** pede telefone/WhatsApp.
- A tabela do System Admin (`OrganizationsTable.tsx`) mostra: nome, plano, estado, Stripe, membros, trial e data de criação — mas **não** mostra contacto nem data de expiração da licença.

### O que será feito

**1. Adicionar campo `contact_phone` à tabela `organizations`**
- Migração SQL: `ALTER TABLE organizations ADD COLUMN contact_phone text;`
- Este campo guarda o WhatsApp/telefone principal da empresa (não do utilizador individual).

**2. Adicionar campo WhatsApp obrigatório no formulário de registo**
- Novo campo no signup form: "WhatsApp da Empresa" (com placeholder `+351 912 345 678`)
- Validação com zod: obrigatório, mínimo 9 caracteres
- Passar o valor para a função `create_organization_for_current_user` (novo parâmetro `_contact_phone`)
- Atualizar a função SQL para aceitar e guardar o `contact_phone`

**3. Mostrar dados de contacto no System Admin**
- Na `OrganizationsTable`, adicionar colunas:
  - **Contacto**: email do admin + WhatsApp da org (`contact_phone`)
  - **Expiração**: data de expiração real (Stripe `period_end` ou `trial_ends_at`)
- Buscar o email do admin da organização via query adicional (primeiro membro com role admin)

### Ficheiros alterados
- **Migração SQL**: novo campo `contact_phone` na tabela `organizations` + atualizar função `create_organization_for_current_user`
- `src/pages/Login.tsx`: novo campo WhatsApp no formulário de signup + validação + passagem do valor
- `src/components/system-admin/OrganizationsTable.tsx`: colunas de contacto e expiração
- `src/pages/system-admin/Dashboard.tsx`: buscar emails dos admins e passar à tabela

### Detalhes técnicos

```text
Signup flow:
  Form → WhatsApp field (obrigatório)
  → supabase.rpc('create_organization_for_current_user', { _name, _slug, _contact_phone })
  → INSERT organizations (..., contact_phone) VALUES (..., _contact_phone)

System Admin table - novas colunas:
  Contacto    → org.contact_phone + admin email (from organization_members JOIN profiles)
  Expiração   → stripe_period_end || trial_ends_at (o que existir)
```


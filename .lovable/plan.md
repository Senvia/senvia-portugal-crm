

## Adicionar variáveis `{{vendedor_email}}` e `{{vendedor_telefone}}` aos templates

Para que os templates de email possam incluir o email e telefone do comercial responsável, é necessário:

### 1. Adicionar colunas `email` e `phone` à tabela `profiles`

A tabela `profiles` só tem `full_name` e `avatar_url`. Migração SQL:

```sql
ALTER TABLE public.profiles 
  ADD COLUMN email text,
  ADD COLUMN phone text;
```

### 2. Preencher o email automaticamente a partir do `auth.users`

Criar um trigger que, ao criar o perfil, copie o email do `auth.users`. Para perfis existentes, fazer um UPDATE one-off via edge function ou SQL.

### 3. Atualizar `src/types/marketing.ts`

Adicionar as novas variáveis ao grupo "Organização / Comercial":

```typescript
export const TEMPLATE_VARIABLES_ORG = [
  { key: '{{organizacao}}', label: 'Nome da organização' },
  { key: '{{vendedor}}', label: 'Nome do comercial' },
  { key: '{{vendedor_email}}', label: 'Email do comercial' },
  { key: '{{vendedor_telefone}}', label: 'Telefone do comercial' },
  { key: '{{data}}', label: 'Data atual' },
] as const;
```

### 4. Atualizar edge function `send-template-email`

Na secção onde resolve o `vendedorName` (linha ~200), também buscar `email` e `phone` do perfil:

```typescript
const { data: profileData } = await supabase
  .from('profiles')
  .select('full_name, email, phone')
  .eq('id', clientData.assigned_to)
  .single();

vendedorName = profileData?.full_name || '';
vendedorEmail = profileData?.email || '';
vendedorPhone = profileData?.phone || '';
```

E adicionar às variáveis:

```typescript
vendedor_email: vendedorEmail,
vendedor_telefone: vendedorPhone,
```

### 5. Adicionar campos no perfil do utilizador (Settings)

No separador de perfil das Settings, adicionar inputs para o comercial editar o seu email de contacto e telefone. Estes dados ficam guardados na tabela `profiles`.

### Resultado
- Dois novos botões no editor: `{{vendedor_email}}` e `{{vendedor_telefone}}`
- Ao enviar, o sistema busca o comercial `assigned_to` do cliente e preenche automaticamente
- Cada comercial pode editar os seus dados no perfil


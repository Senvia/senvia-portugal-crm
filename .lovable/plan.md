

## Correcao: Utilizador criado mas nao aparece na equipa

### Problema encontrado

A edge function `create-team-member` cria o utilizador em 3 sitios:
1. `auth.users` -- OK
2. `profiles` (com `organization_id`) -- OK
3. `user_roles` (com o role) -- OK

Mas a funcao `get-team-members` busca membros da tabela **`organization_members`**, que **nunca e preenchida** pela `create-team-member`. Resultado: o utilizador existe mas nao aparece na lista.

O utilizador `thiagogaldino21@gmail.com` ja esta na base de dados -- so falta o registo em `organization_members`.

### Solucao

**1. Corrigir a edge function `create-team-member`**

Adicionar um `INSERT` na tabela `organization_members` apos criar/atualizar o perfil e o role:

```typescript
// Adicionar à tabela organization_members
const { error: memberError } = await supabaseAdmin
  .from('organization_members')
  .upsert({
    user_id: userId,
    organization_id: organizationId,
    role: role,
    is_active: true,
    joined_at: new Date().toISOString()
  }, { onConflict: 'user_id,organization_id' });
```

**2. Corrigir o utilizador ja criado**

Executar uma migracao SQL para inserir o registo em falta:

```sql
INSERT INTO organization_members (user_id, organization_id, role, is_active, joined_at)
VALUES ('44a688ac-7124-4446-8f4d-1291782120d3', '96a3950e-31be-4c6d-abed-b82968c0d7e9', 'salesperson', true, now())
ON CONFLICT DO NOTHING;
```

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/create-team-member/index.ts` | Adicionar INSERT em `organization_members` apos criar perfil e role |
| Nova migracao SQL | Inserir o registo em falta para o utilizador existente |

### Impacto

- Todos os novos membros criados passarao a aparecer imediatamente na lista da equipa
- O utilizador Thiago ficara visivel apos a migracao

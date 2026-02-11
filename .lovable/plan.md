

## Sistema de Perfis Personalizados com Permissoes por Modulo

### Resumo

Criar um sistema onde o administrador pode definir perfis customizados (ex: "Diretor Comercial", "CE", ou qualquer outro nome) e, para cada perfil, configurar quais modulos estao acessiveis e que nivel de acesso tem em cada um (ver, editar, gerir).

### Como funciona hoje

- Existem 4 roles fixas no enum da BD: `super_admin`, `admin`, `viewer`, `salesperson`
- As permissoes estao hardcoded no hook `usePermissions.ts`
- A `TeamTab` so permite criar utilizadores com 3 perfis fixos

### Como vai funcionar

Os roles internos da BD continuam iguais (admin/viewer/salesperson) -- sao os "perfis base" de permissao. Mas por cima disto, criamos **perfis customizados** que mapeiam para um role base + permissoes granulares por modulo.

```text
+---------------------------+
|    Perfil Customizado     |
|  (nome: "Dir. Comercial") |
|  (role base: admin)       |
|  (modulos: {...})         |
+---------------------------+
         |
         v
+---------------------------+
|    Role BD (app_role)     |
|  admin / viewer / sales   |
+---------------------------+
```

### Estrutura de dados

**Nova tabela: `organization_profiles`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK organizations |
| name | text | Nome do perfil (ex: "Diretor Comercial") |
| base_role | app_role | Role base (admin, viewer, salesperson) |
| module_permissions | jsonb | Permissoes por modulo |
| is_default | boolean | Se e um perfil padrao do sistema |
| created_at | timestamp | Data de criacao |

**Formato do `module_permissions`:**
```text
{
  "leads": { "view": true, "edit": true, "delete": false },
  "clients": { "view": true, "edit": true, "delete": false },
  "proposals": { "view": true, "edit": false, "delete": false },
  "sales": { "view": true, "edit": false, "delete": false },
  "finance": { "view": true, "edit": false, "delete": false },
  "calendar": { "view": true, "edit": true, "delete": false },
  "marketing": { "view": false, "edit": false, "delete": false },
  "ecommerce": { "view": false, "edit": false, "delete": false },
  "settings": { "view": false, "edit": false, "delete": false }
}
```

**Alteracao na tabela `organization_members`:**
- Adicionar coluna `profile_id uuid REFERENCES organization_profiles(id)` (nullable, para retrocompatibilidade)

### Perfis padrao criados automaticamente

Quando a organizacao e criada (ou na migracao), criar 3 perfis padrao:

| Nome | Role Base | Descricao |
|------|-----------|-----------|
| Administrador | admin | Acesso total a todos os modulos |
| Visualizador | viewer | Apenas visualizacao em todos os modulos |
| Vendedor | salesperson | Acesso aos leads atribuidos, clientes, propostas e vendas |

### Ficheiros a criar/alterar

**1. Migracao SQL**
- Criar tabela `organization_profiles` com RLS
- Adicionar coluna `profile_id` a `organization_members`
- Inserir perfis padrao para organizacoes existentes
- Politicas RLS: membros da org podem ler, admins podem CRUD

**2. Novo hook: `src/hooks/useOrganizationProfiles.ts`**
- CRUD de perfis customizados
- Query por organization_id
- Validacao: nao permitir eliminar perfis em uso

**3. Nova secao em Settings: `src/components/settings/ProfilesTab.tsx`**
- Lista de perfis com nome, role base e descricao
- Botao "Criar Perfil"
- Modal de criacao/edicao com:
  - Nome do perfil (texto livre)
  - Role base (select: Admin, Visualizador, Vendedor)
  - Grelha de permissoes por modulo (checkboxes: Ver, Editar, Eliminar)
- Botao eliminar (se nao estiver em uso)

**4. Alterar `src/components/settings/TeamTab.tsx`**
- Na criacao de membro, em vez de escolher admin/viewer/salesperson, escolher um perfil customizado da lista
- Na alteracao de role, tambem usar os perfis

**5. Alterar `src/hooks/usePermissions.ts`**
- Ler o `profile_id` do membro atual
- Carregar as `module_permissions` do perfil
- Retornar permissoes granulares por modulo em vez de apenas isAdmin/isViewer

**6. Alterar `src/components/layout/AppSidebar.tsx` e `MobileBottomNav.tsx`**
- Filtrar menu nao so por modulos ativos da org, mas tambem pelas permissoes do perfil do utilizador (se `view: false`, nao mostra o item)

**7. Alterar edge functions**
- `create-team-member/index.ts`: aceitar `profile_id` em vez de `role` direto, extrair o `base_role` do perfil
- `manage-team-member/index.ts`: aceitar `profile_id` na acao `change_role`

**8. Alterar `src/pages/Settings.tsx`**
- Adicionar tab "Perfis" ao menu de configuracoes

### Fluxo do administrador

1. Vai a Configuracoes > Perfis
2. Ve os perfis padrao (Administrador, Visualizador, Vendedor)
3. Clica "Criar Perfil"
4. Preenche nome: "Diretor Comercial"
5. Escolhe role base: Administrador
6. Ativa/desativa modulos e niveis de acesso
7. Guarda
8. Vai a Equipa > Adicionar Acesso
9. Escolhe o perfil "Diretor Comercial" da lista
10. O membro herda as permissoes configuradas

### Seguranca

- RLS na tabela `organization_profiles` garante isolamento entre organizacoes
- O `base_role` continua a ser escrito na `user_roles` para manter compatibilidade com todas as politicas RLS existentes
- As permissoes granulares sao verificadas no frontend (controlo de UI) e podem ser expandidas para o backend futuramente


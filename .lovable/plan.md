

## Sistema de Perfis Personalizados com Permissoes por Modulo

### STATUS: ✅ IMPLEMENTADO

### Resumo

Sistema onde o administrador pode definir perfis customizados (ex: "Diretor Comercial", "CE", ou qualquer outro nome) e, para cada perfil, configurar quais modulos estao acessiveis e que nivel de acesso tem em cada um (ver, editar, gerir).

### O que foi implementado

1. **Tabela `organization_profiles`** com RLS, perfis padrão (Administrador, Visualizador, Vendedor) criados automaticamente para cada organização
2. **Coluna `profile_id`** adicionada a `organization_members`
3. **Trigger automático** que cria perfis padrão quando uma nova organização é criada
4. **Hook `useOrganizationProfiles`** para CRUD de perfis
5. **`ProfilesTab`** em Definições > Perfis com grelha de permissões por módulo
6. **`usePermissions`** atualizado para ler permissões granulares do perfil do utilizador
7. **Sidebar e Bottom Nav** filtram módulos com base nas permissões do perfil
8. **TeamTab** usa dropdown de perfis customizados em vez de roles fixas

### Pendente (futuro)

- Guardar `profile_id` no `organization_members` ao criar/alterar membro (requer update nas edge functions)
- Enforcement server-side das permissões granulares

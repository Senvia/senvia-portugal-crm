

## Adicionar "Visibilidade de Dados" aos Perfis

### Resumo

Atualmente os perfis controlam **o que** o utilizador pode fazer (ver, editar, eliminar), mas nao **de quem** pode ver os dados. Um CE (Coordenador de Equipa) precisa de ver os dados da sua equipa -- individuais e agregados -- sem ser admin.

Vamos adicionar um campo **"Visibilidade de Dados"** aos perfis com 3 niveis:

```text
Proprio     -> Ve apenas os seus dados
Equipa      -> Ve os seus + dados dos membros da sua equipa
Tudo        -> Ve todos os dados da organizacao (nivel admin)
```

### O que muda

**1. Base de dados**
- Adicionar coluna `data_scope` a tabela `organization_profiles` com valores: `own`, `team`, `all` (default: `own`)
- Os perfis padrao existentes serao atualizados: Administrador -> `all`, Vendedor -> `own`, Visualizador -> `own`

**2. Logica de filtro (`useTeamFilter.ts`)**
- Hoje: a visibilidade depende de ser admin ou lider de equipa (hardcoded)
- Depois: a visibilidade depende do `data_scope` do perfil do utilizador
  - `own` -> ve so os seus dados
  - `team` -> ve os seus + membros da sua equipa (precisa de estar atribuido como lider)
  - `all` -> ve tudo (igual a admin)

**3. Hook de permissoes (`usePermissions.ts`)**
- Expor o `data_scope` do perfil do utilizador
- O `useTeamFilter` le este valor para decidir a visibilidade

**4. UI dos Perfis (`ProfilesTab.tsx`)**
- Adicionar um seletor "Visibilidade de Dados" no modal de criar/editar perfil com as 3 opcoes
- Mostrar o nivel de visibilidade nos cards dos perfis existentes

### Resultado: Perfil "CE"

Ao criar o perfil "CE" (Coordenador de Equipa):
- **Role Base**: Vendedor (ou Admin, conforme necessidade)
- **Visibilidade de Dados**: Equipa
- **Permissoes**: Leads (ver, editar, atribuir), Vendas (ver), Clientes (ver), etc.
- **Resultado**: O CE ve os seus dados + dados de todos os membros da equipa que lidera, com resultados individuais e agregados

### Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| Migracao SQL | Adicionar `data_scope text default 'own'` a `organization_profiles` e atualizar perfis padrao |
| `src/hooks/useOrganizationProfiles.ts` | Adicionar `data_scope` ao tipo `OrganizationProfile` |
| `src/hooks/usePermissions.ts` | Ler e expor `data_scope` do perfil do utilizador |
| `src/hooks/useTeamFilter.ts` | Usar `data_scope` em vez de `isAdmin` para determinar visibilidade |
| `src/components/settings/ProfilesTab.tsx` | Adicionar seletor de visibilidade no modal e badge nos cards |

### Fluxo

1. Admin vai a Configuracoes > Perfis
2. Clica "Criar Perfil" -> nome "CE"
3. Seleciona "Visibilidade de Dados: Equipa"
4. Configura permissoes granulares (ver leads, ver vendas, etc.)
5. Guarda o perfil
6. Em Configuracoes > Acessos, atribui o perfil "CE" a um membro
7. Em Configuracoes > Equipas, esse membro e definido como lider
8. O CE entra e ve automaticamente os dados dele + equipa dele




## Separar "Equipa" em "Acessos" e "Equipas"

### Resumo

A tab atual "Equipa" mistura duas coisas diferentes: gestao de acessos (criar utilizadores, mudar passwords/roles) e gestao de equipas hierarquicas. Vamos separa-las em duas tabs independentes.

### Antes vs Depois

```text
ANTES:                          DEPOIS:
Equipa (1 tab)                  Acessos (tab 1)
  - TeamsSection                  - Membros da organizacao
  - Membros da organizacao        - Convites pendentes
  - Convites pendentes            - Criar/gerir acessos
  - Criar/gerir acessos
                                Equipas (tab 2)
                                  - Criar equipas hierarquicas
                                  - Atribuir lider e membros
```

### Ficheiros a alterar

**1. `src/components/settings/TeamTab.tsx`**
- Renomear para representar "Acessos" (ou manter o ficheiro mas ajustar o conteudo)
- Remover o `<TeamsSection />` que esta no topo
- Atualizar titulos: "Membros da Equipa" -> "Acessos" / "Membros"

**2. `src/pages/Settings.tsx`**
- Adicionar nova tab "Equipas" com icone `Users` (ou `UsersRound`)
- A tab "Equipa" passa a chamar-se "Acessos" com icone `KeyRound` ou `UserPlus`
- Adicionar `TabsContent` para a nova tab que renderiza `<TeamsSection />`
- Atualizar `sectionTitles` para refletir os novos nomes

**3. `src/components/settings/MobileSettingsNav.tsx`**
- Atualizar o tipo `SettingsSection` para incluir `"teams"` como nova seccao
- Renomear a seccao `team` para label "Acessos" com descricao "Gerir utilizadores e permissoes"
- Adicionar nova seccao `teams` com label "Equipas" e descricao "Equipas hierarquicas"

**4. Permissoes**
- A tab "Acessos" usa a mesma permissao `canManageTeam`
- A tab "Equipas" tambem usa `canManageTeam` (so admins gerem equipas)

### Resultado final nas tabs (desktop)

```text
Geral | Seguranca | Acessos | Perfis | Equipas | Pipeline | Modulos | ...
```

### Resultado final no mobile

```text
- Geral
- Seguranca
- Acessos (Gerir utilizadores e permissoes)
- Perfis
- Equipas (Equipas hierarquicas e lideres)
- Pipeline
- ...
```

### Detalhes tecnicos

- `TeamTab.tsx`: remover import e render de `TeamsSection`, atualizar textos do card header
- `Settings.tsx`: adicionar `TabsTrigger value="teams"` e `TabsContent value="teams"` com `<TeamsSection />`
- `MobileSettingsNav.tsx`: adicionar `{ id: "teams", label: "Equipas", icon: UsersRound, description: "Equipas hierarquicas", requiresTeam: true }` e renomear `team` para "Acessos"
- Atualizar `SettingsSection` type para incluir `"teams"`
- Atualizar `sectionTitles` em Settings.tsx para incluir `teams: "Equipas"` e mudar `team: "Acessos"`

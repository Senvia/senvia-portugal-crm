

# Dashboards Diferenciados por Perfil de Acesso

## Objetivo
Permitir que cada perfil de acesso (ex: Diretor Comercial, CE, Vendedor) tenha um conjunto de widgets pre-definido no dashboard. Quando um utilizador sem personalizacao propria acede ao painel, ve os widgets configurados para o seu perfil em vez dos defaults do nicho.

## Como funciona hoje
1. Cada utilizador tem widgets guardados na tabela `dashboard_widgets` (por user)
2. Se nao tem widgets guardados, usa os defaults do nicho da organizacao (ex: telecom mostra instalacoes pendentes, comissoes, etc.)
3. O utilizador pode personalizar o seu dashboard individualmente via botao "Personalizar"

## O que muda
Adicionar uma camada intermédia: **widgets default por perfil**. A hierarquia de prioridade passa a ser:

```text
1. Widgets personalizados pelo utilizador (dashboard_widgets) -- maior prioridade
2. Widgets configurados no perfil de acesso (organization_profiles.dashboard_widgets)
3. Widgets default do nicho (NICHE_DEFAULT_WIDGETS) -- fallback
```

## Alteracoes

### 1. Base de dados
Adicionar coluna `dashboard_widgets` (JSONB, nullable) a tabela `organization_profiles`:
- Formato: array de `{ type: string, is_visible: boolean }` (ex: `[{"type": "leads_total", "is_visible": true}, {"type": "monthly_commissions", "is_visible": true}]`)
- Quando `null`, o perfil nao tem widgets custom e usa o fallback do nicho

### 2. Settings > Perfis - Configuracao de Widgets
No modal de criar/editar perfil (`ProfilesTab.tsx`), adicionar uma nova seccao **"Dashboard"** dentro do Accordion:
- Lista de widgets disponíveis com checkboxes (similar ao `WidgetSelector`)
- O admin pode escolher quais widgets o perfil ve por defeito
- Opcao "Usar padrão do nicho" para nao definir widgets custom (deixa null)

### 3. Hook `useDashboardWidgets` - Nova logica de fallback
Atualizar para:
1. Verificar se o utilizador tem widgets guardados (comportamento atual)
2. Se nao, verificar se o perfil do utilizador tem `dashboard_widgets` configurados
3. Se nao, usar defaults do nicho (comportamento atual)

Isto requer ler o `profile_id` do utilizador e o perfil correspondente.

### 4. Hook `usePermissions` - Expor dados do perfil
Expor o `profile_id` e opcionalmente os `dashboard_widgets` do perfil para que o `useDashboardWidgets` possa aceder.

## Ficheiros a criar
Nenhum ficheiro novo -- tudo integrado nos existentes.

## Ficheiros a editar

| Ficheiro | Alteracao |
|----------|-----------|
| `organization_profiles` (DB) | Adicionar coluna `dashboard_widgets jsonb default null` |
| `src/hooks/useOrganizationProfiles.ts` | Atualizar tipo `OrganizationProfile` para incluir `dashboard_widgets` |
| `src/components/settings/ProfilesTab.tsx` | Adicionar seccao "Dashboard" no modal de perfil com seletor de widgets |
| `src/hooks/useDashboardWidgets.ts` | Adicionar fallback para widgets do perfil antes do fallback do nicho |
| `src/hooks/usePermissions.ts` | Expor `profileDashboardWidgets` dos dados do perfil |

## Detalhes tecnicos

### Migracao SQL
```text
ALTER TABLE organization_profiles 
ADD COLUMN dashboard_widgets jsonb DEFAULT NULL;
```

### Logica de fallback no useDashboardWidgets
```text
1. savedWidgets (user) tem dados? -> usar esses
2. senao, profileWidgets (perfil) tem dados? -> converter para DashboardWidget[]
3. senao -> usar NICHE_DEFAULT_WIDGETS (atual)
```

### UI no ProfilesTab
- Nova seccao "Dashboard" no accordion (apos "Permissoes por Modulo")
- Switch "Usar padrão do nicho" vs "Widgets personalizados"
- Quando "personalizados", mostra lista de checkboxes com todos os widgets disponiveis
- Filtra widgets por modulos ativos da organizacao

### Fluxo do utilizador
1. Admin vai a Definicoes > Perfis > Editar "CE"
2. Expande seccao "Dashboard"
3. Desativa "Usar padrão" e seleciona: Leads Total, Comissoes do Mes, Vendas Ativas
4. Guarda
5. Qualquer utilizador com perfil "CE" que nao tenha personalizado o dashboard vera esses 3 widgets
6. Se o utilizador clicar em "Personalizar", os widgets dele sao guardados individualmente e tem prioridade


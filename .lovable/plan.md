
# Sistema de Feature Flags e Limites por Plano de Subscricao

## Resumo
Implementar um sistema completo de restricoes por plano (Starter, Pro, Elite) que controla o acesso a modulos, limites de utilizadores/formularios e comportamento da UI (cadeado + modal de upsell).

## Arquitetura

A tabela `organizations` ja tem uma coluna `plan` (texto, default 'basic'). Vamos:
1. Criar uma tabela `subscription_plans` com as definicoes de cada plano (feature flags, limites)
2. Criar um hook `useSubscription` que le o plano ativo e as suas restricoes
3. Adaptar a navegacao (sidebar/mobile) para mostrar cadeado em modulos bloqueados
4. Criar um modal de upsell reutilizavel
5. Validar limites no backend (edge function `create-team-member` e criacao de formularios)

## Alteracoes

### 1. Base de Dados

**Migracao SQL:**

- Atualizar coluna `plan` nas organizacoes existentes de `'basic'` para `'starter'`
- Criar tabela `subscription_plans` com as colunas:
  - `id` (text, PK) - 'starter', 'pro', 'elite'
  - `name` (text) - nome de exibicao
  - `max_users` (int, nullable) - null = ilimitado
  - `max_forms` (int, nullable) - null = ilimitado
  - `features` (jsonb) - objeto com todas as feature flags booleanas
  - `price_monthly` (numeric) - para exibicao no modal de upsell
  - `created_at` (timestamptz)
- Inserir os 3 planos com as feature flags definidas:

```text
Features JSONB structure:
{
  "modules": {
    "sales": true/false,
    "finance": true/false,
    "marketing": true/false,
    "ecommerce": true/false
  },
  "integrations": {
    "whatsapp": true/false,
    "invoicing": true/false,
    "meta_pixels": true/false
  },
  "features": {
    "conversational_forms": true/false,
    "multi_org": true/false,
    "push_notifications": true/false,
    "fidelization_alerts": true/false
  }
}
```

- Starter: sales=false, finance=false, marketing=false, ecommerce=false, whatsapp=false, invoicing=false, meta_pixels=false, conversational_forms=false, multi_org=false, push_notifications=false, fidelization_alerts=false
- Pro: sales=true, finance=false, marketing=true, ecommerce=false, whatsapp=true, invoicing=false, meta_pixels=true, conversational_forms=true, multi_org=false, push_notifications=true, fidelization_alerts=true
- Elite: tudo true, max_users=null, max_forms=null

RLS: Leitura publica para authenticated (os planos sao dados de referencia, nao sensiveis).

### 2. Novo Hook: `src/hooks/useSubscription.ts`

- Consulta `subscription_plans` com base no `organization.plan`
- Expoe:
  - `plan` (string): 'starter' | 'pro' | 'elite'
  - `planName` (string): nome de exibicao
  - `limits` (object): `{ maxUsers, maxForms }`
  - `canUseModule(module)` (function): verifica se o modulo esta liberado pelo plano
  - `canUseFeature(feature)` (function): verifica features especificas (conversational_forms, multi_org, etc.)
  - `canUseIntegration(integration)` (function): verifica integracoes (whatsapp, invoicing, meta_pixels)
  - `isFeatureLocked(moduleKey)` (function): retorna true se o plano bloqueia o modulo (para exibir cadeado)

### 3. Novo Componente: `src/components/shared/UpgradeModal.tsx`

- Modal reutilizavel com:
  - Titulo "Funcionalidade Premium"
  - Descricao dinamica baseada no modulo clicado
  - Indicacao do plano minimo necessario (Pro ou Elite)
  - Botao "Falar com Vendas" ou "Ver Planos" (link configuravel)
  - Design dark mode, consistente com o resto do app

### 4. Navegacao - Sidebar e Mobile Bottom Nav

**`src/components/layout/AppSidebar.tsx`** e **`src/components/layout/MobileBottomNav.tsx`**:

- Logica atual: modulos desativados sao **escondidos** do menu
- Nova logica: modulos bloqueados pelo plano **continuam visiveis** mas com icone de cadeado (`Lock`)
- Ao clicar num modulo bloqueado: abre o `UpgradeModal` em vez de navegar

Fluxo de decisao para cada item do menu:
1. Se o modulo esta bloqueado pelo plano -> mostrar com cadeado, abrir modal
2. Se o modulo esta desativado pelo admin (enabled_modules) -> esconder (comportamento atual)
3. Se o perfil nao tem permissao -> esconder (comportamento atual)

### 5. Validacao Backend - Edge Function `create-team-member`

- Antes de criar o utilizador, consultar o plano da organizacao e o `max_users` do `subscription_plans`
- Contar membros ativos em `organization_members` para essa org
- Se >= max_users, retornar erro 403 com mensagem "Limite de utilizadores atingido para o plano X"

### 6. Validacao Frontend - FormsManager

- No `FormsManager.tsx`, antes de permitir criar um novo formulario:
  - Contar formularios existentes da org
  - Comparar com `limits.maxForms` do hook `useSubscription`
  - Se atingido, mostrar toast de erro + abrir UpgradeModal

### 7. OrganizationSwitcher - Bloqueio Multi-Org

- No `OrganizationSwitcher.tsx`, usar `canUseFeature('multi_org')` do hook
- Se `multi_org === false`, nao mostrar o dropdown mesmo com multiplas orgs (mostrar apenas o nome)

### 8. Integracao com ModulesTab (Settings)

- No `ModulesTab.tsx`, modulos bloqueados pelo plano mostram o switch desativado + badge "Plano Pro" ou "Plano Elite"
- Admin nao pode ativar um modulo que o plano nao permite

## Ficheiros a criar
| Ficheiro | Descricao |
|----------|-----------|
| `src/hooks/useSubscription.ts` | Hook central de feature flags por plano |
| `src/components/shared/UpgradeModal.tsx` | Modal de upsell reutilizavel |

## Ficheiros a editar
| Ficheiro | Alteracao |
|----------|-----------|
| `subscription_plans` (DB) | Nova tabela + dados dos 3 planos |
| `organizations.plan` (DB) | Atualizar 'basic' -> 'starter' |
| `src/components/layout/AppSidebar.tsx` | Cadeado + modal nos modulos bloqueados |
| `src/components/layout/MobileBottomNav.tsx` | Cadeado + modal nos modulos bloqueados |
| `src/components/settings/ModulesTab.tsx` | Desativar switches para modulos bloqueados pelo plano |
| `src/components/settings/FormsManager.tsx` | Validar limite de formularios |
| `src/components/layout/OrganizationSwitcher.tsx` | Bloquear multi-org para planos sem essa feature |
| `supabase/functions/create-team-member/index.ts` | Validar limite de utilizadores |
| `src/contexts/AuthContext.tsx` | Nenhuma alteracao necessaria (ja expoe `plan`) |

## Sequencia de implementacao
1. Migracao DB (tabela `subscription_plans` + update planos existentes)
2. Hook `useSubscription`
3. Componente `UpgradeModal`
4. Sidebar + MobileBottomNav (UI com cadeado)
5. ModulesTab (switches bloqueados)
6. FormsManager (limite de forms)
7. OrganizationSwitcher (multi-org)
8. Edge function create-team-member (limite de users)

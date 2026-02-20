

## Personalizar Dashboard apenas por Perfis

### O que muda

Atualmente, cada utilizador pode personalizar o seu dashboard individualmente (botao "Personalizar" no Painel que abre um Sheet lateral). O objetivo e remover essa personalizacao individual e deixar o dashboard controlado **exclusivamente pelos Perfis de Acesso** (Definicoes > Perfis).

### Alteracoes

**1. Simplificar `Dashboard.tsx`**

- Remover o botao "Personalizar" (icone Settings2)
- Remover o estado `isCustomizing` e todo o bloco do `WidgetSelector`
- Remover as funcoes `handleSaveWidgets` e `handleResetWidgets`
- Remover o import do `WidgetSelector`
- O dashboard passa a mostrar apenas os widgets definidos pelo perfil do utilizador (ou os defaults do nicho)

**2. Simplificar `useDashboardWidgets.ts`**

- Remover as mutations `saveWidgets`, `toggleVisibility`, `reorderWidgets` e `resetToDefaults` (ja nao ha personalizacao individual)
- Remover a query a tabela `dashboard_widgets` (ja nao e usada)
- A hierarquia passa a ser: **Perfil > Nicho default** (sem camada de personalizacao individual)
- O hook continua a ler os `profileDashboardWidgets` do `usePermissions` para determinar quais widgets mostrar

**3. Eliminar `WidgetSelector.tsx`**

- O componente `src/components/dashboard/WidgetSelector.tsx` deixa de ser necessario e sera removido

**4. Atualizar o conhecimento do Otto** (`supabase/functions/otto-chat/index.ts`)

No `SYSTEM_PROMPT`, atualizar a secao do PAINEL:
- Remover referencia a "widgets personalizaveis" pelo utilizador
- Indicar que os widgets do dashboard sao configurados pelo Administrador em **Definicoes > Perfis > Dashboard Personalizado**
- Indicar que cada perfil pode ter um conjunto diferente de widgets

**5. Limpar ficheiros e imports**

- Remover `WidgetSelector` dos ficheiros do projeto
- Remover imports nao utilizados em `Dashboard.tsx` (ex: `Settings2`, `WidgetSelector`, `WidgetType`)

### Resultado

- O botao "Personalizar" desaparece do Painel
- Os widgets do dashboard sao controlados exclusivamente pela configuracao do Perfil de Acesso do utilizador
- Se o perfil nao tiver widgets configurados, usa os defaults do nicho
- O Otto sabe explicar que a configuracao do dashboard e feita nos Perfis de Acesso

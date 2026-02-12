

# Navegacao em Dois Niveis nas Definicoes

## Conceito

A navegacao passa a ter **dois niveis hierarquicos**:

1. **Nivel 1 (Grupo)**: Definicoes Gerais, Seguranca, Equipa e Acessos, Produtos, Financeiro, Notificacoes, Integracoes
2. **Nivel 2 (Sub-modulo)**: Dentro de cada grupo, cada sub-modulo e um item individual com o seu proprio conteudo

Quando um grupo tem apenas 1 sub-modulo, mostra o conteudo diretamente.

## Estrutura Completa

| Grupo | Sub-modulos |
|---|---|
| Definicoes Gerais | Geral, Pipeline, Modulos, Formulario, Campos |
| Seguranca | (conteudo direto - Password e 2FA) |
| Equipa e Acessos | Acessos, Perfis, Equipas |
| Produtos | (conteudo direto - Catalogo) |
| Financeiro | (conteudo direto - Despesas) |
| Notificacoes | Push, Alertas |
| Integracoes | (conteudo direto - todas as integracoes) |

## Comportamento

### Mobile (3 niveis de drill-down)

```text
Pagina 1: Lista de Grupos
  [Definicoes Gerais]  >
  [Seguranca]          >
  [Equipa e Acessos]   >
  ...

Clica "Definicoes Gerais" -->

Pagina 2: Sub-modulos do grupo
  <- Definicoes Gerais
  [Geral]        >
  [Pipeline]     >
  [Modulos]      >
  [Formulario]   >
  [Campos]       >

Clica "Pipeline" -->

Pagina 3: Conteudo do sub-modulo
  <- Definicoes Gerais > Pipeline
  (PipelineEditor renderiza aqui)
```

Para grupos com 1 unico sub-modulo (Seguranca, Produtos, Financeiro, Integracoes), clicar no grupo vai direto para o conteudo (salta o nivel 2).

### Desktop (Tabs em dois niveis)

```text
Nivel 1 (TabsList principal):
  [Def. Gerais] [Seguranca] [Equipa] [Produtos] [Financeiro] [Notificacoes] [Integracoes]

Nivel 2 (Sub-tabs dentro do conteudo, quando ha mais que 1 sub-modulo):
  Ao selecionar "Definicoes Gerais":
    [Geral] [Pipeline] [Modulos] [Formulario] [Campos]
    (conteudo do sub-modulo selecionado)

  Ao selecionar "Seguranca":
    (conteudo direto, sem sub-tabs)
```

## Detalhes Tecnicos

### Novo tipo de dados

Sera necessario um novo tipo `SettingsSubSection` que mapeia cada sub-modulo:

```text
type SettingsSubSection =
  | "org-general" | "org-pipeline" | "org-modules" | "org-forms" | "org-fields"
  | "security"
  | "team-access" | "team-profiles" | "team-teams"
  | "products"
  | "finance-expenses"
  | "notif-push" | "notif-alerts"
  | "integrations"
```

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/settings/MobileSettingsNav.tsx` | Exportar novos tipos. Adicionar componente `MobileSubSectionNav` para renderizar a lista de sub-modulos de um grupo. Manter `MobileSettingsNav` para o nivel 1. |
| `src/pages/Settings.tsx` | Adicionar estado `activeSubSection`. No desktop, usar `Tabs` aninhados (tabs principais + sub-tabs dentro de cada TabsContent que tenha multiplos sub-modulos). No mobile, gerir 3 niveis de drill-down (null -> grupo -> sub-modulo). Mapear cada sub-modulo ao seu componente de conteudo individual. |

### Mapeamento sub-modulo para componente

| Sub-modulo | Componente |
|---|---|
| org-general | `GeneralContent` |
| org-pipeline | `PipelineEditor` |
| org-modules | `ModulesTab` |
| org-forms | `FormsManager` |
| org-fields | `ClientFieldsEditor` |
| security | `SecuritySettings` |
| team-access | `TeamTab` |
| team-profiles | `ProfilesTab` |
| team-teams | `TeamsSection` |
| products | `ProductsTab` |
| finance-expenses | `ExpenseCategoriesTab` |
| notif-push | `PushNotificationsCard` |
| notif-alerts | `FidelizationAlertsSettings` |
| integrations | `IntegrationsContent` |

### Logica de estado no mobile

```text
Estado: { group: SettingsSection | null, sub: SettingsSubSection | null }

- group=null, sub=null -> Lista de grupos
- group="general", sub=null -> Lista de sub-modulos de "Definicoes Gerais"
- group="general", sub="org-pipeline" -> Conteudo do PipelineEditor
- group="security", sub=null -> (grupo com 1 item) -> Conteudo direto do SecuritySettings
```

### Logica no desktop

Tabs principais normais. Para grupos com multiplos sub-modulos, dentro do `TabsContent` renderiza-se um segundo `Tabs` (sub-tabs) com estilo mais discreto (por exemplo, variant outline ou pills menores). Para grupos com 1 sub-modulo, renderiza-se o conteudo diretamente.

### Sem alteracoes em

- Nenhum componente de conteudo (GeneralContent, PipelineEditor, SecuritySettings, etc.)
- Nenhuma logica de estado dos formularios ou handlers
- Apenas a navegacao e composicao de vistas muda


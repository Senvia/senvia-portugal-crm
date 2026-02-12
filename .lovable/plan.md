

# Definicoes: Cards em vez de Tabs

## Conceito

Substituir as duas linhas de tabs (nivel 1 e nivel 2) por **cards pequenos** com icone, titulo e descricao curta. O resultado sera uma navegacao mais visual e intuitiva, similar a paginas de definicoes de apps modernas (iOS Settings, Notion).

## Layout Desktop

```text
Definicoes
Configure a sua organizacao e integracoes.

Nivel 1 - Grid de cards (3-4 por linha):
+---------------------+  +---------------------+  +---------------------+
| [icon] Def. Gerais  |  | [icon] Seguranca    |  | [icon] Equipa       |
| Org, pipeline, ...  |  | Password e 2FA      |  | Acessos e perfis    |
+---------------------+  +---------------------+  +---------------------+
+---------------------+  +---------------------+  +---------------------+
| [icon] Produtos     |  | [icon] Financeiro   |  | [icon] Notificacoes |
| Catalogo de prod.   |  | Despesas e fiscal   |  | Push e alertas      |
+---------------------+  +---------------------+  +---------------------+
+---------------------+
| [icon] Integracoes  |
| WhatsApp, Email,... |
+---------------------+

Clica "Definicoes Gerais" -->

Nivel 2 - Header com botao voltar + Grid de sub-cards:
<- Definicoes Gerais

+---------------------+  +---------------------+  +---------------------+
| [icon] Geral        |  | [icon] Pipeline     |  | [icon] Modulos      |
| Nome e logotipo     |  | Etapas de vendas    |  | Funcionalidades     |
+---------------------+  +---------------------+  +---------------------+
+---------------------+  +---------------------+
| [icon] Formulario   |  | [icon] Campos       |
| Captacao de leads   |  | Campos de clientes  |
+---------------------+  +---------------------+

Clica "Pipeline" -->

Conteudo:
<- Definicoes Gerais > Pipeline
(PipelineEditor renderiza aqui)
```

Para grupos com conteudo direto (Seguranca, Produtos, Integracoes), clicar no card vai direto ao conteudo com botao de voltar.

## Layout Mobile

Comportamento identico ao desktop mas em coluna unica (1 card por linha, full-width). O drill-down de 3 niveis ja existe e mantem-se, apenas o visual muda de lista para cards.

## Estilo dos Cards

- Borda subtil (`border`), fundo `bg-card`, hover com `bg-accent/50`
- Icone a esquerda com cor do tema (ou fundo colorido subtil)
- Titulo em `font-medium text-sm`
- Descricao em `text-xs text-muted-foreground`
- Cursor pointer, transicao suave
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`

## Detalhes Tecnicos

### Estado de navegacao (desktop e mobile unificado)

O desktop passa a usar o mesmo sistema de drill-down do mobile em vez de tabs:

```text
Estado: { group: SettingsSection | null, sub: SettingsSubSection | null }

- group=null -> Grid de cards dos grupos
- group="general", sub=null -> Grid de sub-cards
- group="general", sub="org-pipeline" -> Conteudo
- group="security" (direto) -> Conteudo
```

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/settings/MobileSettingsNav.tsx` | Alterar `MobileSettingsNav` e `MobileSubSectionNav` para renderizar cards em vez de lista simples. Adicionar campo `description` a cada item de `subSectionsMap` (ja existe parcialmente). |
| `src/pages/Settings.tsx` | Remover logica de `Tabs` no desktop. Unificar desktop e mobile no mesmo sistema de drill-down baseado em estado. Adicionar breadcrumb/botao voltar no desktop. Usar grid responsivo para os cards. |

### Componente SettingsCard

Novo componente pequeno (inline ou separado) com a estrutura:

```text
Props: { icon, title, description, onClick }

Renderiza:
<div onClick className="flex items-center gap-3 p-4 rounded-lg border bg-card
  hover:bg-accent/50 cursor-pointer transition-colors">
  <div className="rounded-md bg-primary/10 p-2">
    <Icon className="h-5 w-5 text-primary" />
  </div>
  <div>
    <p className="font-medium text-sm">{title}</p>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
</div>
```

### Dados dos cards (nivel 1)

Cada grupo precisa de uma descricao curta para o card:

| Grupo | Descricao |
|---|---|
| Definicoes Gerais | Organizacao, pipeline e formularios |
| Seguranca | Password e autenticacao |
| Equipa e Acessos | Membros, perfis e equipas |
| Produtos | Catalogo de produtos |
| Financeiro | Despesas e configuracao fiscal |
| Notificacoes | Push e alertas automaticos |
| Integracoes | WhatsApp, email e faturacao |

### Dados dos sub-cards (nivel 2)

Os sub-modulos ja tem `label` e `icon` no `subSectionsMap`. Basta adicionar/garantir o campo `description`:

| Sub-modulo | Descricao |
|---|---|
| Geral | Nome, logotipo e dados |
| Pipeline | Etapas do funil de vendas |
| Modulos | Funcionalidades ativas |
| Formulario | Captacao de leads |
| Campos | Campos personalizados |
| Acessos | Convites e permissoes |
| Perfis | Niveis de acesso |
| Equipas | Hierarquia e lideres |
| Tipos de Despesas | Categorias de despesas |
| Fiscal | IVA e configuracao fiscal |
| Push | Notificacoes no telemovel |
| Alertas | Lembretes automaticos |

### Sem alteracoes em

- Nenhum componente de conteudo (GeneralContent, PipelineEditor, etc.)
- Nenhuma logica de estado dos formularios ou handlers
- Base de dados


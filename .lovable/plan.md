

# Reorganizar Definicoes em Sub-Modulos Agrupados

## Nova Estrutura

As seccoes passam de uma lista plana para grupos logicos:

| Grupo | Seccoes incluidas |
|-------|-------------------|
| Definicoes Gerais | Geral, Seguranca, Pipeline, Modulos, Formulario, Campos |
| Equipa | Acessos, Perfis, Equipas |
| Produtos | Produtos |
| Financeiro | Despesas |
| Notificacoes | Alertas |
| Integracoes | Integracoes |

Nota: "Notificacoes Push" continua dentro do conteudo da seccao Geral (GeneralContent). O grupo "Notificacoes" aqui refere-se aos Alertas de Fidelizacao.

## Mobile (MobileSettingsNav)

A lista plana de botoes passa a ter separadores visuais por grupo. Cada grupo tera:
- Um titulo de grupo (label muted, texto pequeno, tipo "DEFINICOES GERAIS")
- Os items do grupo por baixo, com o mesmo estilo atual

Resultado visual (exemplo):

```text
DEFINICOES GERAIS
  [icone] Geral - Organizacao e conta          >
  [icone] Seguranca - Password e 2FA           >
  [icone] Pipeline - Etapas de venda           >
  [icone] Modulos - Funcionalidades ativas     >
  [icone] Formulario - Personalizar            >
  [icone] Campos - Visibilidade                >

EQUIPA
  [icone] Acessos - Utilizadores               >
  [icone] Perfis - Perfis de acesso            >
  [icone] Equipas - Hierarquia                 >

PRODUTOS
  [icone] Produtos - Catalogo                  >

FINANCEIRO
  [icone] Despesas - Tipos de despesas         >

NOTIFICACOES
  [icone] Alertas - Fidelizacao                >

INTEGRACOES
  [icone] Integracoes - Webhook, WhatsApp      >
```

## Desktop (Tabs)

As duas linhas de tabs existentes passam a ser organizadas por grupo, com separadores visuais entre grupos dentro das TabsLists. Cada grupo tera os seus triggers agrupados com um separador vertical entre grupos.

A disposicao sera em duas linhas:
- Linha 1: Definicoes Gerais | Equipa
- Linha 2: Produtos | Financeiro | Notificacoes | Integracoes

Os separadores serao um `Separator` vertical fino ou um pequeno espaco + borda visual para distinguir os grupos.

## Detalhes Tecnicos

### Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/settings/MobileSettingsNav.tsx` | Reestruturar `sections` para array de grupos com `groupLabel` e `items`. Renderizar label de grupo + items. Atualizar tipo `SettingsSection` (sem mudanca, apenas a renderizacao agrupa). |
| `src/pages/Settings.tsx` | Reorganizar as `TabsTrigger` nas duas `TabsList` por grupos com separadores visuais. Os `TabsContent` mantem-se iguais (apenas a ordem das tabs muda). |

### Logica de visibilidade por grupo

Cada grupo so aparece se tiver pelo menos uma seccao visivel. Exemplo: o grupo "Equipa" so aparece se `canManageTeam` for true. O grupo "Financeiro" so aparece se `canManageIntegrations` for true.

### Sem alteracoes em:
- Nenhum componente de conteudo (GeneralContent, SecuritySettings, etc.)
- Nenhuma logica de estado ou handlers
- Apenas a organizacao visual e de navegacao muda


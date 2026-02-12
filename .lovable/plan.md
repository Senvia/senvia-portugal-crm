

# Reorganizar Definicoes em Sub-Modulos (Conteudo Agrupado)

## Conceito

A navegacao atual tem uma tab individual para cada seccao (Geral, Pipeline, Modulos, etc.). A mudanca e passar para **navegacao ao nivel do grupo**, onde cada tab/botao mostra **todas as sub-seccoes empilhadas** numa unica vista.

## Nova Estrutura de Grupos

| Grupo (Tab/Botao) | Conteudo renderizado junto |
|---|---|
| Definicoes Gerais | GeneralContent + PipelineEditor + ModulesTab + FormsManager + ClientFieldsEditor |
| Seguranca | SecuritySettings (password + 2FA) |
| Equipa e Acessos | TeamTab + ProfilesTab + TeamsSection |
| Produtos | ProductsTab |
| Financeiro | ExpenseCategoriesTab |
| Notificacoes | PushNotifications (extraido do GeneralContent) + FidelizationAlertsSettings |
| Integracoes | IntegrationsContent |

## Alteracoes Visuais

### Desktop
- De ~13 tabs individuais para **7 tabs de grupo**
- Cabem numa unica linha de TabsList
- Ao clicar num grupo, todo o conteudo das sub-seccoes aparece empilhado verticalmente

### Mobile
- MobileSettingsNav passa a ter **7 botoes** (um por grupo)
- Ao clicar num grupo, a vista mostra todas as sub-seccoes empilhadas com separadores visuais entre elas (titulo + conteudo)

## Detalhes Tecnicos

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/settings/GeneralContent.tsx` | Remover o card de "Notificacoes Push" e a prop `pushNotifications`. O push passa para o grupo Notificacoes. |
| `src/components/settings/PushNotificationsCard.tsx` | **Novo ficheiro** -- Extrair o card de Notificacoes Push para componente proprio, reutilizavel no grupo Notificacoes. |
| `src/components/settings/MobileSettingsNav.tsx` | Simplificar para 7 itens de grupo (sem sub-items). Atualizar `SettingsSection` type para: `"general" \| "security" \| "team" \| "products" \| "finance" \| "notifications" \| "integrations"`. |
| `src/pages/Settings.tsx` | Redesenhar completamente a zona de tabs/conteudo. Cada `TabsContent` (ou mobile section) renderiza multiplos componentes empilhados. |

### Tipo SettingsSection (novo)

```text
"general" | "security" | "team" | "products" | "finance" | "notifications" | "integrations"
```

### Exemplo de renderizacao do grupo "Definicoes Gerais"

```text
TabsContent value="general":
  <GeneralContent ... />         (Organizacao + Conta + GDPR)
  <Separator />
  <PipelineEditor />
  <Separator />
  <ModulesTab />
  <Separator />
  <FormsManager />
  <Separator />
  <ClientFieldsEditor />
```

### Exemplo de renderizacao do grupo "Notificacoes"

```text
TabsContent value="notifications":
  <PushNotificationsCard ... />      (extraido do GeneralContent)
  <Separator />
  <FidelizationAlertsSettings />
```

### Visibilidade por grupo

- **Definicoes Gerais**: Sempre visivel (Geral sempre aparece). Pipeline/Modulos/Formulario/Campos so aparecem se `canManageIntegrations`.
- **Seguranca**: Sempre visivel.
- **Equipa e Acessos**: Apenas se `canManageTeam`.
- **Produtos**: Apenas se `canManageIntegrations`.
- **Financeiro**: Apenas se `canManageIntegrations`.
- **Notificacoes**: Sempre visivel (Push e sempre acessivel). Alertas so aparece se `canManageIntegrations`.
- **Integracoes**: Apenas se `canManageIntegrations`.

### Sem alteracoes em:
- Nenhum componente de conteudo interno (PipelineEditor, ModulesTab, SecuritySettings, etc.)
- Nenhuma logica de estado ou handlers
- Apenas a organizacao de navegacao e composicao de vistas muda


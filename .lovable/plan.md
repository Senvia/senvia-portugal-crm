

# Integrações: Cards em vez de Accordion

## Resumo

Substituir o layout de Accordion (sanfonas empilhadas) por um **grid de cards** idêntico ao das Definições. Cada integração passa a ser um card com ícone, nome, descrição curta e badge de estado. Clicar no card abre o formulário de configuração com botão de voltar.

## Layout

```text
<- Integrações

+-----------------------------------+  +-----------------------------------+
| [Webhook]  n8n / Automações       |  | [MessageCircle]  WhatsApp Business|
| Notificações de novos leads  [OK] |  | Evolution API               [OK] |
+-----------------------------------+  +-----------------------------------+
+-----------------------------------+  +-----------------------------------+
| [Mail]  Email (Brevo)             |  | [Receipt]  InvoiceXpress          |
| Envio de emails            [---]  |  | Emissão de faturas         [OK]  |
+-----------------------------------+  +-----------------------------------+
+-----------------------------------+
| [Receipt]  KeyInvoice             |
| Faturação API 5.0          [---]  |
+-----------------------------------+

Clica "WhatsApp Business" -->

<- Integrações
[Switch ativo/inativo]
(formulário de credenciais do WhatsApp)
[Guardar]
```

## Detalhes técnicos

### Componente `IntegrationCard`

Reutilizar o `SettingsCard` existente mas com uma variação: incluir o **Badge** de estado (Configurado / Não configurado / Desativado) e o **Switch** de ativação no próprio card.

Criar um componente wrapper `IntegrationCard` que estende o `SettingsCard` com:
- Badge de estado (à direita, antes do chevron)
- Switch de ativar/desativar (no canto, com `stopPropagation`)

### Estado de navegação

Adicionar estado local no `IntegrationsContent`:
- `activeIntegration: string | null` (valores: `'webhook'`, `'whatsapp'`, `'brevo'`, `'invoicexpress'`, `'keyinvoice'`, ou `null`)
- `null` = grid de cards
- Valor = formulário da integração com botão voltar

### Alterações nos ficheiros

| Ficheiro | Tipo | Alteração |
|---|---|---|
| `src/components/settings/IntegrationsContent.tsx` | Editar | Substituir `Accordion` por grid de cards + estado de drill-down. Extrair cada formulário para renderização condicional. Manter toda a lógica de props/handlers. |

### Dados dos cards

| Integração | Ícone | Título | Descrição | Badge baseado em |
|---|---|---|---|---|
| Webhook | Webhook | n8n / Automações | Notificações de novos leads | `!!webhookUrl` |
| WhatsApp | MessageCircle | WhatsApp Business | Integração com Evolution API | `!!(baseUrl && instance && apiKey)` |
| Brevo | Mail | Email (Brevo) | Envio de emails e propostas | `!!(apiKey && senderEmail)` |
| InvoiceXpress | Receipt | InvoiceXpress | Emissão de faturas automática | `!!(accountName && apiKey)` |
| KeyInvoice | Receipt | KeyInvoice | Faturação via API 5.0 | `!!apiKey` |

### Comportamento do Switch

O switch de ativar/desativar fica visível **no ecrã de detalhe** (formulário), não no card do grid. No card aparece apenas o badge de estado. Isto simplifica o layout e evita cliques acidentais.

### Sem alterações em

- `Settings.tsx` (as props passadas mantêm-se iguais)
- Nenhum handler ou lógica de save
- Base de dados

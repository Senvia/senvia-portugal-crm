

# Agrupar Integrações por Categoria

## Resumo

Organizar os 5 cards de integrações em 3 grupos visuais com headers de secção, em vez de uma lista plana.

## Layout

```text
Automações
+-----------------------------------+
| [Webhook]  n8n / Automações       |
| Notificações de novos leads  [OK] |
+-----------------------------------+

Comunicações
+-----------------------------------+  +-----------------------------------+
| [MessageCircle]  WhatsApp Business|  | [Mail]  Email (Brevo)             |
| Evolution API               [OK] |  | Envio de emails            [---]  |
+-----------------------------------+  +-----------------------------------+

Faturação
+-----------------------------------+  +-----------------------------------+
| [Receipt]  InvoiceXpress          |  | [Receipt]  KeyInvoice             |
| Emissão de faturas         [OK]   |  | Faturação API 5.0          [---]  |
+-----------------------------------+  +-----------------------------------+
```

## Alteração

### `src/components/settings/IntegrationsContent.tsx`

Adicionar um campo `group` a cada item do array `integrations` e agrupar na renderização:

```text
Grupos:
- "Automações" -> webhook
- "Comunicações" -> whatsapp, brevo
- "Faturação" -> invoicexpress, keyinvoice
```

Na grid view (quando `active === null`), em vez de renderizar todos os cards numa única grid, iterar pelos grupos e renderizar:

1. Um `<h3>` com o nome do grupo (texto pequeno, `text-sm font-medium text-muted-foreground mb-2`)
2. Uma grid de cards apenas desse grupo
3. Espaçamento entre grupos (`space-y-6`)

O resto do componente (detail view, forms, badges, switch) mantém-se inalterado.

### Sem alterações em
- Nenhum outro ficheiro
- Nenhuma lógica de save/toggle
- Base de dados


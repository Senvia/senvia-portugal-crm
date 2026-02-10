

## Correcao do Modal de Rascunho e IVA

### Problemas Identificados

**1. Campo IVA com nome errado (bug critico)**
- A base de dados guarda `tax_config.tax_value` (ex: 23 ou 0)
- O modal de rascunho le `taxConfig.tax_rate` que **nao existe** no objeto
- Resultado: o modal mostra sempre "Isento" (porque `tax_rate` e `undefined`, default 0), mas a edge function envia IVA a 23% porque le o campo correto `tax_value`

**2. A tua organizacao tem `tax_value: 23` na base de dados**
- Mesmo que tenhas configurado "Isento" no InvoiceXpress, nas definicoes do Senvia o IVA esta a 23%
- Tens de ir a Definicoes -> Integracoes -> InvoiceXpress e guardar com taxa 0% e motivo de isencao

### Correcoes

**`src/components/sales/InvoiceDraftModal.tsx`**
- Alterar a interface de props para usar `tax_value` em vez de `tax_rate` (alinhar com o que a DB guarda)
- Ler `taxConfig?.tax_value` em vez de `taxConfig?.tax_rate`

**`src/components/sales/SalePaymentsList.tsx`**
- Alterar a interface `taxConfig` de `{ tax_rate?: number; ... }` para `{ tax_value?: number; ... }`

**`src/components/sales/SaleDetailsModal.tsx`**
- Alterar o cast de `tax_rate` para `tax_value` na passagem de props

### Detalhes tecnicos

| Ficheiro | O que muda |
|---|---|
| `InvoiceDraftModal.tsx` | Interface: `tax_rate` -> `tax_value`; logica interna usa `tax_value` |
| `SalePaymentsList.tsx` | Interface de props: `tax_rate` -> `tax_value` |
| `SaleDetailsModal.tsx` | Cast no JSX: `tax_rate` -> `tax_value` |

### Nota importante
Apos esta correcao, o modal vai mostrar os dados **reais** (IVA 23% se a tua config estiver a 23%). Para emitir sem IVA, tens de ir a Definicoes -> Integracoes -> InvoiceXpress, colocar a taxa a 0% e preencher o motivo de isencao, e guardar.




# Corrigir Totais no Rascunho de Recibo

## Problema
O modal "Rascunho de Recibo" mostra o valor total da venda (397,00 EUR) no Subtotal e Total, quando deveria mostrar o valor do pagamento individual (198,50 EUR). Isto acontece porque o calculo dos totais usa os `saleItems` (itens da venda inteira) em vez do `amount` do pagamento.

## Causa Raiz
No ficheiro `src/components/sales/InvoiceDraftModal.tsx`, linhas 117-132:
- Os itens da venda (`saleItems`) sao usados para calcular `subtotal` e `totalWithTax`
- Estes valores representam o total da venda, nao o pagamento
- No modo `receipt`, o Subtotal e Total deveriam usar diretamente o `amount` (valor do pagamento)

## Alteracao

### `src/components/sales/InvoiceDraftModal.tsx`

Na seccao de Totais (linhas 250-267), quando o `mode === "receipt"`, usar sempre o `amount` do pagamento em vez dos totais calculados dos itens:

- **Subtotal**: mostrar `amount` (valor do pagamento)
- **IVA**: mostrar `0` (o IVA ja foi incluido na fatura original, o recibo so comprova o pagamento)
- **Total**: mostrar `amount`

Alem disso, os itens da venda nao devem ser exibidos no modo `receipt` (ja nao sao mostrados - a condicao na linha 196 so mostra itens para `invoice` e `invoice_receipt`), mas os totais ainda estao a usar os valores dos itens.

### Codigo a alterar (linhas 250-267)

Adicionar logica condicional: se `mode === "receipt"`, os valores do bloco de totais usam `amount` diretamente em vez de `subtotal`/`fallbackTotal`.

```typescript
// Para receipt, usar sempre o amount do pagamento
const displaySubtotal = mode === "receipt" ? amount : (hasItems ? subtotal : amount);
const displayTax = mode === "receipt" ? 0 : fallbackTax;
const displayTotal = mode === "receipt" ? amount : fallbackTotal;
```

E na UI, usar estas variaveis em vez das atuais.


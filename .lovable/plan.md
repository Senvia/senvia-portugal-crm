
# Esconder Botao "Ver Rascunho de Recibo" Quando a Fatura-Recibo (FR) Ja Foi Emitida

## Problema
Quando uma Fatura-Recibo (FR) e emitida, ela ja inclui o recibo no proprio documento. No entanto, o botao "Ver Rascunho de Recibo" continua a aparecer nos pagamentos porque a condicao apenas verifica se existe um `invoicexpress_id` na venda (indicando que ha um documento emitido) e se o pagamento nao tem `invoice_reference` propria.

O Recibo (RC) so faz sentido quando existe uma Fatura simples (FT) -- nesse caso, e necessario emitir recibos individuais para cada pagamento. Quando o documento e uma Fatura-Recibo (FR), o recibo ja esta incluido e nao deve ser emitido separadamente.

## Solucao
Adicionar uma verificacao do tipo de documento (`invoicexpress_type`) na condicao do botao de recibo. O botao so deve aparecer quando o documento emitido e uma Fatura (FT), nunca quando e uma Fatura-Recibo (FR).

## Alteracao Tecnica

### `src/components/sales/SalePaymentsList.tsx`

Na linha 267, a condicao atual e:
```
payment.status === 'paid' && hasInvoiceXpress && hasInvoice && !payment.invoice_reference && !readonly
```

Deve ser alterada para incluir a verificacao do tipo de documento:
```
payment.status === 'paid' && hasInvoiceXpress && hasInvoice && invoicexpressType === 'FT' && !payment.invoice_reference && !readonly
```

Isto garante que:
- O botao "Ver Rascunho de Recibo" so aparece quando a venda tem uma Fatura (FT) emitida
- Quando a venda tem uma Fatura-Recibo (FR) emitida, o botao nao aparece (porque o recibo ja esta incluido no documento)
- A alteracao e minima e cirurgica, afetando apenas uma condicao

### Resultado
- Venda com FT emitida: botao de recibo aparece nos pagamentos pagos (comportamento correto para emitir RC)
- Venda com FR emitida: botao de recibo NAO aparece (o recibo ja esta incluido na FR)

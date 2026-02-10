

## Botao "Emitir Fatura" apos pagamento (manual, nunca automatico)

### Contexto

Nem todos os clientes pedem fatura. A emissao deve ser sempre manual, atraves de um botao, e nao deve estar limitada ao status "Concluida".

### Alteracoes

**1. `src/components/sales/SaleDetailsModal.tsx`**

- Remover a condicao `sale.status === 'delivered'` do botao "Emitir Fatura-Recibo" (linha 519)
- O botao passa a aparecer sempre que:
  - InvoiceXpress esta ativo (`hasInvoiceXpress`)
  - A venda tem pelo menos 1 pagamento registado com status `paid`
- Para isso, usar os dados de `useSalePayments` (que ja esta disponivel via `SalePaymentsList`) ou adicionar uma query simples para verificar se existem pagamentos pagos
- Manter toda a logica existente do botao (verificacao de NIF, loading state, badge de fatura ja emitida)

**2. `src/components/sales/AddDraftPaymentModal.tsx`**

- Adicionar prop `hideInvoiceReference?: boolean`
- Quando `true`, esconder o campo "Referencia da Fatura"
- Mostrar nota informativa: "A fatura pode ser emitida apos criar a venda."

**3. `src/components/sales/CreateSaleModal.tsx`**

- Calcular `hasInvoiceXpress` a partir dos dados da organizacao
- Passar `hideInvoiceReference={hasInvoiceXpress}` ao `AddDraftPaymentModal`

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `SaleDetailsModal.tsx` | Botao "Emitir Fatura" visivel apos pagamento pago (sem restricao de status) |
| `AddDraftPaymentModal.tsx` | Esconder campo fatura manual quando InvoiceXpress ativo + nota informativa |
| `CreateSaleModal.tsx` | Passar flag `hideInvoiceReference` ao modal de pagamento draft |


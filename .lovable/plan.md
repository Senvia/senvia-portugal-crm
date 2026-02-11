

## Anular Faturas no InvoiceXpress

### O que vai ser feito
Implementar a funcionalidade de anular (cancelar) faturas ja emitidas no InvoiceXpress, com campo obrigatorio de motivo, atualizando o estado tanto no InvoiceXpress como na base de dados local.

### Fluxo do utilizador
1. Na lista de pagamentos de uma venda, ao lado de um pagamento que ja tem fatura emitida (`invoice_reference`), aparece um botao "Anular"
2. Ao clicar, abre um dialog com campo obrigatorio para o motivo de anulacao
3. Ao confirmar, o sistema cancela a fatura no InvoiceXpress e limpa a referencia na base de dados
4. O utilizador pode depois emitir uma nova fatura se necessario

### Alteracoes

**1. Nova Edge Function `cancel-invoice`**

Ficheiro: `supabase/functions/cancel-invoice/index.ts`

Responsabilidades:
- Autenticacao e verificacao de membership na organizacao
- Obter credenciais InvoiceXpress da organizacao
- Determinar o tipo de documento (invoice ou invoice_receipt) a partir do `invoice_reference` (prefixo FT ou FR)
- Chamar `PUT /:document-type/:document-id/change-state.json` com `state: "canceled"` e `message: motivo`
- Para obter o `document-id`, usar o campo `invoicexpress_id` da sale (legacy) ou buscar via referencia
- Limpar `invoice_reference` e `invoice_file_url` do pagamento na tabela `sale_payments`
- Retornar sucesso ou erro

Parametros de entrada:
```text
{
  payment_id: string (obrigatorio)
  organization_id: string (obrigatorio)
  reason: string (obrigatorio, motivo de anulacao)
  invoicexpress_id: number (obrigatorio, ID do documento no InvoiceXpress)
  document_type: "invoice" | "invoice_receipt" (obrigatorio)
}
```

**2. Guardar invoicexpress_id nos pagamentos**

Problema: atualmente o `invoicexpress_id` so e guardado na tabela `sales` (legacy). Para pagamentos individuais, nao temos o ID do documento InvoiceXpress guardado no `sale_payments`.

Solucao: 
- Adicionar coluna `invoicexpress_id` (bigint, nullable) a tabela `sale_payments` via migracao
- Atualizar a edge function `issue-invoice` para guardar o `invoicexpress_id` tambem no pagamento
- Atualizar a edge function `cancel-invoice` para usar este campo

**3. Hook `useCancelInvoice`**

Ficheiro: `src/hooks/useCancelInvoice.ts`

- Mutation que chama a edge function `cancel-invoice`
- Toast de sucesso/erro
- Invalidar queries `sales` e `sale-payments`

**4. Modal de Anulacao**

Ficheiro: `src/components/sales/CancelInvoiceDialog.tsx`

- AlertDialog com campo Textarea obrigatorio para o motivo
- Botao desativado enquanto o motivo esta vazio
- Loading state durante o pedido

**5. Atualizar `SalePaymentsList`**

Ficheiro: `src/components/sales/SalePaymentsList.tsx`

- Adicionar botao "Anular" ao lado do botao de download, visivel quando o pagamento tem `invoice_reference` e `invoicexpress_id`
- Ao clicar, abre o `CancelInvoiceDialog`

### Resumo tecnico

| Ficheiro | Tipo | Alteracao |
|---|---|---|
| Migracao SQL | Novo | Adicionar coluna `invoicexpress_id` a `sale_payments` |
| `supabase/functions/cancel-invoice/index.ts` | Novo | Edge function para anular fatura no InvoiceXpress |
| `supabase/functions/issue-invoice/index.ts` | Editar | Guardar `invoicexpress_id` no pagamento |
| `supabase/config.toml` | Editar | Adicionar config para `cancel-invoice` |
| `src/hooks/useCancelInvoice.ts` | Novo | Hook mutation para anular fatura |
| `src/components/sales/CancelInvoiceDialog.tsx` | Novo | Dialog com campo de motivo |
| `src/components/sales/SalePaymentsList.tsx` | Editar | Adicionar botao "Anular" |
| `src/types/sales.ts` | Editar | Adicionar `invoicexpress_id` ao tipo `SalePayment` |

### Notas
- A API do InvoiceXpress exige o campo `message` ao cancelar (motivo obrigatorio)
- Transicoes validas: `final -> canceled` e `settled -> canceled` (para invoice_receipts)
- Apos anular, as referencias sao limpas para permitir re-emissao
- O `proprietary_uid` ja implementado permite re-emitir apos anulacao (o InvoiceXpress gera novo documento)


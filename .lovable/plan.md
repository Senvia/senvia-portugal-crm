

## Reestruturar Logica de Faturacao: Valor Total + Observacoes com Datas de Pagamento

### Resumo da mudanca

A logica de faturacao muda de "por pagamento" para "por venda", sempre com o valor total:

- **Fatura (FT)**: Emitida para o valor total da venda quando existem pagamentos agendados/pendentes. As observacoes incluem automaticamente as datas e valores de cada parcela.
- **Fatura-Recibo (FR)**: Emitida para o valor total da venda quando o pagamento ja foi recebido (todos pagos ou pagamento unico ja pago).

Em ambos os casos, o documento cobre o **valor total da venda** e as **observacoes** sao enviadas para o InvoiceXpress (campo `observations` da API).

### O que muda na interface

1. Os botoes de "FR" e "Recibo" **por pagamento** desaparecem
2. O botao global de fatura (no topo da secao de pagamentos) passa a decidir automaticamente se emite FT ou FR conforme o estado dos pagamentos
3. O modal de rascunho mostra as observacoes que serao enviadas (editaveis antes de confirmar)

### Detalhes tecnicos

**Ficheiro 1: `supabase/functions/issue-invoice/index.ts`**
- Aceitar novo parametro `observations` no body do request
- Incluir `observations` no payload da fatura enviado ao InvoiceXpress:
  ```
  invoice: { ..., observations: observations || '' }
  ```
- Buscar todos os `sale_payments` da venda para construir observacoes automaticas no backend (como fallback se o frontend nao enviar)

**Ficheiro 2: `supabase/functions/issue-invoice-receipt/index.ts`**
- Mudar para emitir com o **valor total da venda** (nao o valor do pagamento individual)
- Remover a logica de `ratio` e escalonamento proporcional de itens
- Aceitar `observations` no body e incluir no payload
- O `payment_id` deixa de ser obrigatorio (pode ser omitido se a venda tiver um unico pagamento)
- Guardar a referencia na tabela `sales` (campos `invoicexpress_id`, `invoice_reference`, etc.) em vez de apenas em `sale_payments`

**Ficheiro 3: `src/hooks/useIssueInvoice.ts`**
- Aceitar `observations?: string` nos parametros
- Enviar `observations` no body da edge function

**Ficheiro 4: `src/hooks/useIssueInvoiceReceipt.ts`**
- Remover `paymentId` dos parametros (ja nao e por pagamento)
- Aceitar `observations?: string`
- Enviar `observations` no body

**Ficheiro 5: `src/components/sales/InvoiceDraftModal.tsx`**
- Adicionar campo `observations` (textarea editavel) pre-preenchido com as datas dos pagamentos
- Exemplo de observacoes geradas automaticamente:
  ```
  Pagamento em 3 parcelas:
  - 1.a parcela: 500,00 EUR - 15 Jan 2026
  - 2.a parcela: 500,00 EUR - 15 Fev 2026
  - 3.a parcela: 500,00 EUR - 15 Mar 2026
  ```
- Para FR: observacoes simples como "Pagamento recebido em 11 Fev 2026"
- Passar `observations` no callback `onConfirm`
- Remover a logica de `ratio` para FR (passa a usar sempre o valor total)

**Ficheiro 6: `src/components/sales/SalePaymentsList.tsx`**
- Remover os botoes de FR/RC por pagamento individual (linhas 383-397)
- O botao global (linha 298-307) decide automaticamente:
  - Se todos os pagamentos estao `paid` → abre draft como `invoice_receipt` (FR)
  - Se ha pagamentos `pending` → abre draft como `invoice` (FT)
- Passar array de `payments` ao `InvoiceDraftModal` para construir as observacoes
- Ajustar o `onConfirm` do draft FR para chamar `issueInvoiceReceipt` sem `paymentId`
- Manter botoes de Recibo (RC) por pagamento apenas quando ja existe uma FT emitida (para registar recibos individuais de pagamentos ja feitos contra uma fatura existente)

### Fluxo resultante

```text
Venda com pagamentos pendentes/agendados:
  → Botao "Ver Rascunho de Fatura" (FT)
  → Observacoes auto-geradas com datas das parcelas
  → Emite FT pelo valor total

Venda com pagamento(s) ja recebido(s):
  → Botao "Ver Rascunho de Fatura-Recibo" (FR)
  → Observacoes com data de recebimento
  → Emite FR pelo valor total

Venda com FT ja emitida + pagamentos pagos:
  → Botao "Ver Rascunho de Recibo" (RC) por pagamento
  → Emite RC individual (comportamento atual mantido)
```


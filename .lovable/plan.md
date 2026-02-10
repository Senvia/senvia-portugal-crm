

## Correcao de 2 Bugs Graves na Emissao de Faturas

### Bug 1: Fatura emitida com valor TOTAL em vez do valor do pagamento

**O que acontece:** Quando clicas no botao "Fatura" ou "Fatura-Recibo" num pagamento especifico (ex: parcela de 500 EUR), a edge function ignora esse pagamento e usa sempre o `sale.total_value` (valor total da venda). Resultado: fatura emitida com valor errado.

**Causa raiz:** O frontend nao envia o `payment_id` nem o `amount` do pagamento. A edge function usa os `sale_items` ou, se nao existirem, cria um item com o valor total da venda (linha 183 da edge function).

**Correcao:**

1. **`src/hooks/useIssueInvoice.ts`** -- Adicionar campos `paymentId` e `paymentAmount` ao `IssueInvoiceParams` e envia-los no body.

2. **`src/components/sales/SalePaymentsList.tsx`** -- Passar o `payment.id` e `payment.amount` ao chamar `issueInvoice.mutate()` (linhas 195 e 213).

3. **`supabase/functions/issue-invoice/index.ts`** -- Quando `payment_id` e `payment_amount` sao fornecidos:
   - Usar `payment_amount` como valor do item na fatura (em vez de `sale.total_value`)
   - Guardar a `invoice_reference` no registo do pagamento (`sale_payments`) em vez de (ou alem de) na venda
   - Nao bloquear por `sale.invoicexpress_id` existir (porque uma venda pode ter multiplas faturas, uma por pagamento)

4. **Logica de bloqueio:** Verificar se o pagamento especifico ja tem `invoice_reference` em vez de verificar se a venda ja tem `invoicexpress_id`.

### Bug 2: Fatura emitida com IVA 23% em vez de Isento

**O que acontece:** A fatura sai com IVA 23% mesmo tendo dito que es Art. 53.o (isento).

**Causa raiz:** Na base de dados, o `tax_config` da tua organizacao ainda tem `{ tax_name: "IVA23", tax_value: 23, tax_exemption_reason: null }`. A configuracao nunca foi alterada para isento.

**Correcao:** Isto e uma questao de configuracao. Precisas ir a **Definicoes -> Integracoes -> InvoiceXpress**, mudar a "Taxa de IVA" para "Isento de IVA", selecionar "M10 - IVA regime de isencao (Art. 53.o)" e clicar **Guardar**. A logica de save (`handleSaveInvoiceXpress` no Settings.tsx) ja esta correta e guarda `{ tax_name: "Isento", tax_value: 0, tax_exemption_reason: "M10" }`.

No entanto, para evitar este erro no futuro, vou adicionar uma melhoria na UI:
- Mostrar um aviso visivel no botao de fatura quando o IVA esta configurado como 23% mas o utilizador pode querer verificar.

### Resumo das alteracoes

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useIssueInvoice.ts` | Adicionar `paymentId` e `paymentAmount` aos parametros |
| `src/components/sales/SalePaymentsList.tsx` | Passar `paymentId` e `paymentAmount` ao emitir fatura por pagamento |
| `supabase/functions/issue-invoice/index.ts` | Suportar emissao por pagamento individual; guardar referencia no `sale_payments`; remover bloqueio por venda ja faturada |

### O que NAO sera alterado

- A logica de save do `tax_config` nas Definicoes (ja funciona corretamente)
- A estrutura da base de dados (a coluna `invoice_reference` ja existe em `sale_payments`)

### Acao manual necessaria

Antes de emitir a proxima fatura, iras as Definicoes e configuras o IVA como Isento + M10. A fatura errada que ja foi emitida no InvoiceXpress tera de ser anulada diretamente no painel do InvoiceXpress.




## Emitir Recibo apos Marcar como Pago (Pagina de Pagamentos)

### Contexto

Atualmente, ao marcar um pagamento como pago na pagina Financeiro > Pagamentos, o estado e sincronizado com a venda automaticamente (via trigger na base de dados). Porem, para emitir o recibo fiscal (RC) ou fatura-recibo (FR), o utilizador tem de navegar ate ao detalhe da venda -- o que quebra o fluxo.

### O que muda

Apos clicar em "Confirmar" no dialogo de "Marcar como Pago", o sistema mostra um **segundo dialogo/botao** perguntando se o utilizador deseja emitir o documento fiscal. Este botao so aparece se:

1. A organizacao tem InvoiceXpress ativo
2. A venda associada ao pagamento tem uma fatura emitida (`invoicexpress_id` na sale)
3. O pagamento ainda nao tem referencia de documento (`invoice_reference` vazio)

Se a venda **tem fatura (FT)** associada, o botao oferece "Emitir Recibo (RC)". Se **nao tem**, oferece "Emitir Fatura-Recibo (FR)".

### Fluxo do utilizador

```text
Pagamentos (Pendentes)
    |
    v
[Marcar Pago] --> Dialogo de confirmacao --> Confirmar
    |
    v
Pagamento atualizado para "Pago"
    |
    v
(Se InvoiceXpress ativo + condicoes cumpridas)
    |
    v
Aparece botao "Emitir Recibo" na coluna de acoes
    |
    v
Clica --> Abre InvoiceDraftModal (modo receipt ou invoice_receipt)
    |
    v
Confirma --> Recibo gerado via Edge Function
```

### Detalhes tecnicos

**Ficheiro principal:** `src/pages/finance/Payments.tsx`

1. **Adicionar verificacao de InvoiceXpress**: Importar `useAuth` e verificar `organization.invoicexpress_api_key` e `invoicexpress_account_name` para determinar se a integracao esta ativa.

2. **Mostrar botao de emissao para pagamentos pagos**: Na coluna de acoes, alem do botao "Marcar Pago" (para `pending`), mostrar um botao "Emitir Recibo" para pagamentos `paid` que:
   - Tenham a integracao InvoiceXpress ativa
   - Nao tenham `invoice_reference` (ainda sem documento fiscal)
   - A venda associada tenha `invoicexpress_id` (para RC) ou nao (para FR)

3. **Integrar InvoiceDraftModal**: Importar e renderizar o `InvoiceDraftModal` com os dados do pagamento selecionado. Precisa de:
   - `clientName` e `clientNif` -- ja disponiveis via `PaymentWithSale` (o `client_name` ja existe; para `clientNif` e necessario adicionar ao query do `useAllPayments`)
   - `taxConfig` -- obter da organizacao via `useAuth`
   - `saleItems` -- carregar via `useSaleItems` quando o utilizador clica no botao

4. **Hooks de emissao**: Importar `useGenerateReceipt` (para RC quando a venda tem FT) e `useIssueInvoiceReceipt` (para FR quando nao tem FT).

5. **Atualizar `useAllPayments`**: Incluir `nif` do cliente no query e `invoicexpress_id`/`invoicexpress_type` da venda no mapeamento (alguns ja estao mapeados).

6. **Atualizar tipo `PaymentWithSale`**: Adicionar `client_nif` ao tipo para suportar a verificacao de NIF.

**Ficheiros alterados:**
- `src/pages/finance/Payments.tsx` -- logica principal, botao de emissao, InvoiceDraftModal
- `src/hooks/useAllPayments.ts` -- adicionar `nif` do cliente ao query
- `src/types/finance.ts` -- adicionar `client_nif` ao tipo PaymentWithSale

### Notas
- A sincronizacao pagamento-venda continua automatica via trigger da base de dados
- Pagamentos que ja tenham `invoice_reference` nao mostram o botao (documento ja emitido)
- O botao usa a mesma logica do `SalePaymentsList`: se a venda tem FT emite RC, senao emite FR
- Para carregar os itens da venda (necessarios para o rascunho), usamos `useSaleItems` com o `sale_id` do pagamento selecionado, carregado on-demand



## Enviar Fatura/Recibo por Email via InvoiceXpress

### Objetivo
Adicionar a funcionalidade de enviar documentos fiscais (Fatura e Recibos) por email diretamente pelo InvoiceXpress, usando o endpoint `PUT /:document-type/:document-id/email-document.json`.

### Fluxo do Utilizador

```text
Fatura emitida (FT 0001)
    |
    v
[Botao "Enviar por Email"] --> Abre modal com:
    |                          - Email pre-preenchido (do cliente)
    |                          - Assunto pre-preenchido
    |                          - Corpo editavel
    v
[Confirmar] --> Edge Function --> InvoiceXpress API
    |
    v
Toast de sucesso

--- Mesmo fluxo para Recibos individuais ---
```

### Alteracoes Tecnicas

**1. Nova Edge Function `send-invoice-email`**

Ficheiro: `supabase/functions/send-invoice-email/index.ts`

Responsabilidades:
- Receber `document_id`, `document_type`, `organization_id`, `email`, `subject`, `body`
- Verificar autenticacao e membership
- Buscar credenciais InvoiceXpress da organizacao
- Chamar `PUT /:document-type/:document-id/email-document.json` com:

```text
{
  "message": {
    "client": { "email": "...", "save": "0" },
    "subject": "...",
    "body": "...",
    "logo": "0"
  }
}
```

Mapeamento de `document_type`:
- `invoice` -> `invoices`
- `receipt` -> `receipts`

- Retornar sucesso ou erro

**2. Novo Hook `useSendInvoiceEmail`**

Ficheiro: `src/hooks/useSendInvoiceEmail.ts`

- Mutation que chama a edge function `send-invoice-email`
- Toast de sucesso/erro
- Sem invalidacao de queries necessaria (enviar email nao altera dados)

**3. Novo Modal `SendInvoiceEmailModal`**

Ficheiro: `src/components/sales/SendInvoiceEmailModal.tsx`

Campos do formulario:
- **Email** (pre-preenchido com email do cliente, editavel)
- **Assunto** (pre-preenchido com "Fatura {referencia}" ou "Recibo {referencia}")
- **Corpo** (textarea editavel, com texto padrao em portugues)
- Botao "Enviar" com estado de loading

**4. Atualizar `SalePaymentsList`**

Adicionar botoes de envio por email:
- **Fatura global**: botao "Enviar Email" ao lado do QR Code e do botao Anular, visivel quando `invoicexpressId` existe
- **Recibo por pagamento**: botao "Enviar Email" ao lado do PDF/QR Code, visivel quando `payment.invoicexpress_id` existe

**5. Atualizar `supabase/config.toml`**

Registar a nova funcao `send-invoice-email` com `verify_jwt = false`.

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| `supabase/functions/send-invoice-email/index.ts` | Criar | Edge function para enviar email via InvoiceXpress |
| `supabase/config.toml` | Editar | Registar `send-invoice-email` |
| `src/hooks/useSendInvoiceEmail.ts` | Criar | Hook com mutation para enviar email |
| `src/components/sales/SendInvoiceEmailModal.tsx` | Criar | Modal com formulario de email |
| `src/components/sales/SalePaymentsList.tsx` | Editar | Adicionar botoes "Enviar Email" para fatura e recibos |

### Notas
- O `document-type` no path da API corresponde ao plural: `invoices`, `receipts`
- O campo `save: "0"` nao atualiza o email do cliente no InvoiceXpress
- O campo `logo: "0"` envia sem logotipo (depende do plano InvoiceXpress)
- O email do cliente e obtido dos dados ja disponiveis no `SaleDetailsModal` (via props)
- Sera necessario passar o email do cliente como nova prop ao `SalePaymentsList`


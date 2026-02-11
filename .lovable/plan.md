

## Consultar e Sincronizar Documentos InvoiceXpress

### Objetivo
Criar uma edge function que consulta documentos no InvoiceXpress via `GET /:document-type/:document-id.json`, permitindo:
- Buscar PDF URLs em falta para faturas ja emitidas
- Ver detalhes completos do documento (valores, itens, estado, ATCUD)
- Sincronizar dados locais com os dados atuais do InvoiceXpress

### Fluxo do Utilizador

```text
Venda com Fatura emitida (sem PDF guardado)
    |
    v
[Botao "Sincronizar" ou "Ver Detalhes"] --> Edge Function
    |                                        GET /invoices/:id.json
    v                                        GET /api/pdf/:id.json
Atualiza dados locais (PDF, QR, referencia)
    |
    v
Exibe detalhes do documento num modal/drawer
```

### Alteracoes Tecnicas

**1. Nova Edge Function `get-invoice-details`**

Ficheiro: `supabase/functions/get-invoice-details/index.ts`

Responsabilidades:
- Receber `document_id`, `document_type`, `organization_id` e flag opcional `sync` (boolean)
- Verificar autenticacao e membership
- Buscar credenciais InvoiceXpress da organizacao
- Chamar `GET /:document-type/:document-id.json` para obter detalhes
- Se `sync=true`, tambem chamar `GET /api/pdf/:document-id.json` para buscar PDF
- Se `sync=true`, atualizar a tabela correspondente (`sales` ou `sale_payments`) com os dados atualizados (pdf_url, qr_code_url)
- Retornar os detalhes completos do documento

Mapeamento de `document_type`:
- `invoice` -> `invoices` (resposta em `invoice`)
- `invoice_receipt` -> `invoice_receipts` (resposta em `invoice_receipt`)
- `receipt` -> `receipts` (resposta em `receipt`)

Dados retornados:
- `id`, `status`, `sequence_number`, `atcud`
- `date`, `due_date`, `permalink`
- `sum`, `discount`, `before_taxes`, `taxes`, `total`
- `client` (nome, NIF, pais)
- `items` (nome, preco, quantidade, taxa)
- `pdf_url` (se pedido via sync)

**2. Novo Hook `useInvoiceDetails`**

Ficheiro: `src/hooks/useInvoiceDetails.ts`

- Query que chama a edge function `get-invoice-details`
- Mutation separada `useSyncInvoice` para sincronizar e atualizar dados locais
- Invalidar queries de `sale-payments` e `sales` apos sync

**3. Novo Modal `InvoiceDetailsModal`**

Ficheiro: `src/components/sales/InvoiceDetailsModal.tsx`

Exibe informacoes do documento InvoiceXpress:
- Cabecalho com referencia, estado (badge), ATCUD
- Dados do cliente (nome, NIF)
- Tabela de itens (nome, quantidade, preco unitario, IVA, total)
- Resumo financeiro (subtotal, IVA, total)
- Link permalink para ver no InvoiceXpress
- Botao "Sincronizar" que busca o PDF e atualiza dados locais

**4. Atualizar `SalePaymentsList.tsx`**

Adicionar novos botoes:
- **Fatura global**: icone "Info" (Eye ou FileSearch) que abre o `InvoiceDetailsModal` com os dados da fatura
- **Recibo por pagamento**: mesmo icone para abrir detalhes do recibo
- Quando o PDF nao esta disponivel localmente mas existe `invoicexpress_id`, mostrar botao "Buscar PDF" que faz sync automatico

**5. Atualizar `supabase/config.toml`**

Registar `get-invoice-details` com `verify_jwt = false`.

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| `supabase/functions/get-invoice-details/index.ts` | Criar | Edge function para consultar e sincronizar documentos |
| `supabase/config.toml` | Editar | Registar `get-invoice-details` |
| `src/hooks/useInvoiceDetails.ts` | Criar | Hook com query e mutation de sync |
| `src/components/sales/InvoiceDetailsModal.tsx` | Criar | Modal com detalhes do documento InvoiceXpress |
| `src/components/sales/SalePaymentsList.tsx` | Editar | Adicionar botoes "Ver Detalhes" e "Buscar PDF" |

### Secao Tecnica - Logica de Sync

Quando `sync=true`, a edge function:
1. Chama `GET /:type/:id.json` para obter dados atualizados
2. Chama `GET /api/pdf/:id.json` com polling (3 tentativas, 2s intervalo)
3. Chama `GET /api/qr_codes/:id.json` com polling (3 tentativas)
4. Identifica se o documento pertence a `sales` (fatura global) ou `sale_payments` (recibo individual)
5. Recebe `sale_id` e opcionalmente `payment_id` no request
6. Se `payment_id` fornecido: atualiza `sale_payments` com `invoice_file_url` (PDF) e `qr_code_url`
7. Se apenas `sale_id`: atualiza `sales` com `invoice_pdf_url` e `qr_code_url`


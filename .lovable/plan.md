
## Fase 1: Emitir Fatura-Recibo (com logica condicional)

### Comportamento

O modal de venda tera **duas experiencias diferentes** na secao de faturacao, dependendo se a organizacao tem uma integracao de faturacao ativa ou nao:

**Se InvoiceXpress configurado** (organizacao tem `invoicexpress_account_name` E `invoicexpress_api_key`):
- Mostra botao "Emitir Fatura-Recibo" para vendas com status `delivered`
- Apos emissao, mostra Badge verde com referencia da fatura (ex: "FR A/28")
- Valida NIF do cliente antes de emitir

**Se SEM integracao de faturacao:**
- Mostra os campos manuais que ja existem ao nivel do pagamento (referencia da fatura + anexar ficheiro)
- Nenhuma alteracao necessaria aqui -- ja funciona no `AddPaymentModal` via `invoice_reference` e `invoice_file_url`

### Secao tecnica

#### 1. Migracao de base de dados

Adicionar campos para guardar o ID do documento InvoiceXpress na venda:

```sql
ALTER TABLE public.sales
  ADD COLUMN invoicexpress_id bigint,
  ADD COLUMN invoicexpress_type text DEFAULT 'invoice_receipts',
  ADD COLUMN invoice_reference text;
```

O campo `invoice_reference` guarda o numero sequencial da fatura (ex: "FR A/28").

#### 2. Edge Function `issue-invoice` (novo ficheiro)

`supabase/functions/issue-invoice/index.ts`

Responsabilidades:
- Recebe `sale_id` e `organization_id` via POST (com auth JWT)
- Busca a venda com items e dados do cliente
- Busca credenciais InvoiceXpress da organizacao
- Valida: cliente tem NIF, credenciais existem, venda nao tem ja fatura emitida
- Chama API InvoiceXpress:
  - POST para criar draft do documento
  - PUT para finalizar (comunicar AT)
- Guarda `invoicexpress_id` e `invoice_reference` na venda
- Retorna sucesso com numero da fatura

#### 3. Atualizar tipo `Sale` em `src/types/sales.ts`

Adicionar novos campos:
```typescript
invoicexpress_id: number | null;
invoicexpress_type: string | null;
invoice_reference: string | null;  // ja existe na Sale mas confirmar
```

#### 4. Hook `useIssueInvoice` (novo ficheiro)

`src/hooks/useIssueInvoice.ts` -- useMutation que chama a edge function, invalida queries `["sales"]` no sucesso, mostra toasts.

#### 5. Atualizar `SaleDetailsModal.tsx`

Logica condicional na secao de acoes (footer do modal):

```text
const hasInvoiceXpress = organization?.invoicexpress_account_name 
  && organization?.invoicexpress_api_key;
```

- **Se `hasInvoiceXpress` e `sale.status === 'delivered'`:**
  - Se `sale.invoicexpress_id` existe: Badge verde "Fatura Emitida: {invoice_reference}"
  - Se nao: Botao "Emitir Fatura-Recibo" com loading state e validacao de NIF

- **Se NAO tem InvoiceXpress:**
  - Nada muda -- os campos de referencia/anexo de fatura ja existem no `AddPaymentModal` ao nivel de cada pagamento

#### 6. Garantir que `organization` inclui campos InvoiceXpress

Verificar que o `useAuth` / contexto da organizacao ja traz os campos `invoicexpress_account_name` e `invoicexpress_api_key` (adicionados na migracao anterior).

### Ficheiros a criar/alterar

| Ficheiro | Acao |
|---|---|
| `supabase/migrations/...` | Nova migracao (3 colunas) |
| `supabase/functions/issue-invoice/index.ts` | Novo -- Edge Function |
| `src/types/sales.ts` | Adicionar campos `invoicexpress_id`, `invoicexpress_type` |
| `src/hooks/useIssueInvoice.ts` | Novo -- hook para chamar a edge function |
| `src/components/sales/SaleDetailsModal.tsx` | Botao condicional no footer |

### Validacoes e seguranca

- Edge Function valida auth JWT e membership na organizacao
- Credenciais InvoiceXpress lidas da BD, nunca expostas ao frontend
- NIF obrigatorio -- toast de aviso se nao existir
- Protecao contra duplicados: se `invoicexpress_id` ja existe, recusa emitir
- IVA fixo a 23% (configuravel numa fase futura)

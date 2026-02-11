

## Sincronizar Faturas do InvoiceXpress (Tabela Dedicada)

### Problema

A tab "Faturas" mostra apenas pagamentos locais que tenham `invoice_reference` ou `invoicexpress_id` preenchido. Nao importa as faturas reais do InvoiceXpress. Resultado: faturas emitidas la nao aparecem aqui.

### Solucao

Aplicar a mesma estrategia usada para as Notas de Credito: tabela dedicada `invoices` + edge function de sync + auto-sync ao abrir a tab.

---

### Passo 1: Migracao - Criar tabela `invoices`

Nova tabela para guardar todas as faturas importadas do InvoiceXpress:

- `id` (uuid, PK)
- `organization_id` (uuid, FK organizations)
- `invoicexpress_id` (integer, ID no InvoiceXpress)
- `reference` (text, ex: "FT ATSIRE01FT/1" ou "FR ATSIRE01FR/2")
- `document_type` (text: "invoice", "invoice_receipt", "simplified_invoice")
- `status` (text: "final", "settled", "canceled", etc.)
- `client_name` (text)
- `total` (numeric)
- `date` (date)
- `due_date` (date, nullable)
- `sale_id` (uuid, nullable - associacao a venda local)
- `payment_id` (uuid, nullable - associacao a pagamento local)
- `pdf_path` (text, nullable - caminho no storage)
- `raw_data` (jsonb)
- `created_at`, `updated_at`
- UNIQUE(organization_id, invoicexpress_id)

RLS: membros da organizacao podem ler.

### Passo 2: Criar Edge Function `sync-invoices`

Nova edge function que:

1. Busca todas as faturas, faturas-recibo e faturas simplificadas da API InvoiceXpress (paginado)
2. Faz upsert na tabela `invoices` para cada documento
3. Tenta associar a vendas/pagamentos locais:
   - `sales.invoicexpress_id` = doc ID
   - `sale_payments.invoice_reference ILIKE '%' || sequence_number || '%'`
   - Fallback por nome de cliente
4. Download e armazena PDF no bucket `invoices`
5. Suporta modo `sync_all` para cron job e modo individual com autenticacao

### Passo 3: Atualizar `InvoicesTable` no frontend

- Substituir a query de `useAllPayments` por uma query directa a tabela `invoices`
- Auto-sync via `useEffect` ao montar (mesmo padrao das Notas de Credito)
- Mostrar badge se associada a venda local ou nao
- Manter botao de sync manual

### Passo 4: Cron Job

Agendar sync horario (mesmo padrao das Notas de Credito).

---

### Seccao Tecnica

**Migracao SQL:**

```text
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  invoicexpress_id integer NOT NULL,
  reference text,
  document_type text DEFAULT 'invoice',
  status text,
  client_name text,
  total numeric DEFAULT 0,
  date date,
  due_date date,
  sale_id uuid REFERENCES sales(id),
  payment_id uuid REFERENCES sale_payments(id),
  pdf_path text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, invoicexpress_id)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invoices"
  ON public.invoices FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Super admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (is_super_admin(auth.uid()));
```

**Edge Function `sync-invoices/index.ts`:**

Busca 3 tipos de documentos da API InvoiceXpress:
- `/invoices.json` (Faturas)
- `/invoice_receipts.json` (Faturas-Recibo)
- `/simplified_invoices.json` (Faturas Simplificadas)

Para cada documento:
1. Upsert na tabela `invoices`
2. Matching em cadeia (invoicexpress_id -> invoice_reference ILIKE -> client_name)
3. Download PDF via `/api/pdf/{id}.json`
4. Suporte `sync_all` para cron

**Ficheiros a criar/modificar:**

| Ficheiro | Acao |
|---|---|
| Migracao SQL | Criar tabela `invoices` com RLS |
| `supabase/functions/sync-invoices/index.ts` | Nova edge function para importar faturas do InvoiceXpress |
| `src/hooks/useInvoices.ts` | Novo hook para query da tabela `invoices` + mutation de sync |
| `src/components/finance/InvoicesContent.tsx` | Refactoring para usar dados da tabela `invoices` em vez de derivar de `sale_payments` |
| Cron SQL | Agendar sync horario |

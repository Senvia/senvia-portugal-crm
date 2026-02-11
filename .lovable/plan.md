

## Corrigir Notas de Credito: Tabela Dedicada para Guardar Todas as NCs

### Problema Raiz

A sincronizacao encontrou 1 nota de credito no InvoiceXpress mas nao conseguiu associa-la a nenhum registo local porque:

1. Os `sale_payments` nao tem `invoicexpress_id` preenchido (esta sempre NULL) - so tem `invoice_reference` em texto
2. A correspondencia por nome de cliente falhou (provavel diferenca de formatacao)
3. O sistema actual so mostra NCs que estejam associadas a vendas/pagamentos. Se a associacao falhar, a NC desaparece completamente

### Solucao

Criar uma tabela dedicada `credit_notes` para guardar TODAS as notas de credito importadas do InvoiceXpress, independentemente de serem associadas ou nao a vendas locais. Assim, nunca se perde uma NC.

---

### Passo 1: Migracao - Criar tabela `credit_notes`

Nova tabela com os campos:
- `id` (uuid, PK)
- `organization_id` (referencia a organizations)
- `invoicexpress_id` (integer, ID no InvoiceXpress)
- `reference` (text, ex: "NC ATSIRE01NC/1")
- `status` (text, ex: "final", "settled")
- `client_name` (text)
- `total` (numeric)
- `date` (date)
- `related_invoice_id` (integer, nullable - ID da fatura original no InvoiceXpress)
- `sale_id` (uuid, nullable - associacao a venda local se encontrada)
- `payment_id` (uuid, nullable - associacao a pagamento local se encontrado)
- `pdf_path` (text, nullable - caminho no storage local)
- `raw_data` (jsonb - dados completos do InvoiceXpress para referencia)
- `created_at`, `updated_at`

RLS: membros da organizacao podem ler; service role pode inserir/atualizar.

### Passo 2: Atualizar Edge Function `sync-credit-notes`

Modificar para:
1. Continuar a buscar NCs da API InvoiceXpress
2. Guardar TODAS na tabela `credit_notes` (upsert por `invoicexpress_id` + `organization_id`)
3. Tentar associar a vendas/pagamentos por:
   - `invoicexpress_id` na sales
   - `invoice_reference` na sale_payments (match por texto, ex: "FT #250820014" -> buscar se a NC referencia este documento)
   - Nome de cliente como fallback
4. Guardar PDF no storage
5. Mesmo que nao associe, a NC fica guardada na tabela

### Passo 3: Atualizar Hook `useCreditNotes`

Mudar para consultar a nova tabela `credit_notes` directamente, em vez de derivar dados de sales/sale_payments. Muito mais simples e fiavel.

### Passo 4: Atualizar `CreditNotesContent.tsx`

- Mostrar todas as NCs da tabela (associadas ou nao)
- Coluna "Estado" indicando se esta associada a uma venda ou nao
- Download de PDF via signed URL do storage
- Botao de sync mantido

---

### Seccao Tecnica

**Migracao SQL:**

```text
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  invoicexpress_id integer NOT NULL,
  reference text,
  status text,
  client_name text,
  total numeric DEFAULT 0,
  date date,
  related_invoice_id integer,
  sale_id uuid REFERENCES sales(id),
  payment_id uuid REFERENCES sale_payments(id),
  pdf_path text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, invoicexpress_id)
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view credit notes"
  ON public.credit_notes FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));
```

**Edge Function - Logica melhorada de matching:**

```text
Para cada NC do InvoiceXpress:
1. Upsert na tabela credit_notes
2. Se tem related_documents -> extrair ID do doc original
3. Matching em cadeia:
   a. sales.invoicexpress_id = related_doc_id
   b. sale_payments WHERE invoice_reference ILIKE '%' || related_doc_sequence || '%'
   c. sales por client_name (fuzzy)
4. Se encontrar match -> atualizar sale_id ou payment_id na credit_notes
5. Download PDF -> guardar em invoices/{org_id}/credit_note_{ix_id}.pdf
```

**Ficheiros a criar/modificar:**

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | Criar tabela `credit_notes` com RLS |
| `supabase/functions/sync-credit-notes/index.ts` | Upsert na nova tabela + matching melhorado via `invoice_reference` |
| `src/hooks/useCreditNotes.ts` | Query directa a tabela `credit_notes` em vez de derivar de sales/payments |
| `src/components/finance/CreditNotesContent.tsx` | Adaptar colunas e acoes para a nova estrutura |
| `src/types/finance.ts` | Atualizar `CreditNoteItem` para refletir a nova tabela |

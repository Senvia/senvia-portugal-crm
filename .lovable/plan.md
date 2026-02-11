

## Tornar Explicita a Relacao entre Faturas e Notas de Credito

### Problema

1. A nota de credito nao mostra qual fatura lhe deu origem
2. A fatura nao mostra se tem uma nota de credito associada
3. O campo `related_invoice_id` esta a `null` na nota de credito, mesmo quando o InvoiceXpress tem essa informacao nos `related_documents`
4. Os estados das notas de credito tambem estao em ingles (mesmo problema ja corrigido nas faturas)

### Solucao

#### 1. Adicionar coluna "Fatura Origem" na tabela de Notas de Credito

**Ficheiro: `src/components/finance/CreditNotesContent.tsx`**

- Adicionar coluna "Fatura Origem" que mostra a referencia da fatura relacionada
- Fazer JOIN com a tabela `invoices` usando `related_invoice_id` para obter a referencia
- Traduzir estados para portugues (mesmo mapa usado nas faturas)

#### 2. Adicionar coluna "Nota de Credito" na tabela de Faturas

**Ficheiro: `src/components/finance/InvoicesContent.tsx`**

- Adicionar coluna "N. Credito" que mostra a referencia da nota de credito associada
- Fazer query a `credit_notes` onde `related_invoice_id = invoice.invoicexpress_id`

#### 3. Melhorar matching no sync de notas de credito

**Ficheiro: `supabase/functions/sync-credit-notes/index.ts`**

- Quando `related_documents` retorna um ID, guardar esse ID em `related_invoice_id`
- O codigo ja faz isto (linha 122), mas pode estar a falhar se a API nao devolver `related_documents`

#### 4. Criar query para cruzar dados

**Ficheiro: `src/hooks/useCreditNotes.ts`**

- Atualizar a query para incluir a referencia da fatura relacionada via lookup na tabela `invoices`

**Ficheiro: `src/hooks/useInvoices.ts`**

- Atualizar a query para incluir notas de credito associadas via lookup na tabela `credit_notes`

---

### Seccao Tecnica

**Alteracoes nos hooks:**

`useCreditNotes.ts`:
- Apos buscar as notas de credito, fazer uma segunda query para obter as referencias das faturas relacionadas usando os `related_invoice_id` nao-nulos
- Retornar `related_invoice_reference` em cada item

`useInvoices.ts`:
- Apos buscar as faturas, fazer uma segunda query a `credit_notes` onde `related_invoice_id` esta nos `invoicexpress_id` das faturas
- Retornar `credit_note_reference` em cada item

**Alteracoes na UI:**

`CreditNotesContent.tsx`:
- Nova coluna "Fatura Origem" com badge clicavel mostrando a referencia (ex: "FT 1/2026")
- Traduzir estados com funcao `getStatusLabel` identica a das faturas
- Aplicar `getStatusVariant` para cores nos badges

`InvoicesContent.tsx`:
- Nova coluna "N. Credito" apos "Estado"
- Se existir nota de credito associada, mostrar badge com referencia (ex: "NC 1/2026")
- Se nao existir, mostrar "-"

**Correcao na Edge Function `sync-credit-notes`:**
- Adicionar log para debug quando `related_documents` esta vazio
- Tentar match adicional por `invoicexpress_id` na tabela `invoices` quando `related_invoice_id` e encontrado


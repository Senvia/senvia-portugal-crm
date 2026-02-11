

## Correcao da Tab Faturas: PDFs e Notas de Credito

### Problemas Identificados

1. **PDFs nao acessiveis**: O sistema guarda URLs temporarios da AWS (expiram em ~7 dias) em vez de guardar os PDFs no storage local. Exemplo: a venda #0005 do Nuno Dias tem um URL expirado no campo `invoice_pdf_url`.

2. **Notas de Credito nao aparecem**: Apesar de existirem campos `credit_note_id` e `credit_note_reference` na base de dados, as notas de credito nunca sao mostradas na tab Faturas.

3. **Falta sub-tab de Notas de Credito**: Tudo aparece misturado numa unica tabela.

---

### Plano de Implementacao

#### 1. Sub-tabs dentro de Faturas

Dentro da tab "Faturas" no Financeiro, criar duas sub-tabs:
- **Faturas** - Lista de faturas e faturas-recibo (comportamento atual melhorado)
- **Notas de Credito** - Lista dedicada de notas de credito emitidas

#### 2. Corrigir o fluxo de PDF (Sync para Storage Local)

Modificar a edge function `get-invoice-details` para que, quando `sync=true`:
- Descarregue o PDF do InvoiceXpress
- Guarde-o no bucket `invoices` do storage local
- Guarde o **caminho do storage** (nao o URL temporario) na base de dados

No frontend, ao fazer download:
- Se existe caminho local -> gerar signed URL do storage
- Se nao existe -> oferecer botao "Sincronizar" que descarrega e guarda localmente

#### 3. Novo componente CreditNotesContent

Criar componente para listar notas de credito, consultando `sales` e `sale_payments` que tenham `credit_note_id` preenchido. Com as mesmas acoes: ver detalhes, sincronizar PDF, download.

#### 4. Incluir faturas a nivel da venda

Actualmente so mostra pagamentos com referencia. Tambem incluir vendas que tenham `invoicexpress_id` mas cujos pagamentos nao tenham referencia individual (fatura global da venda).

---

### Seccao Tecnica

**Ficheiros a modificar:**

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/get-invoice-details/index.ts` | Ao sync, descarregar PDF via fetch, fazer upload para bucket `invoices`, guardar caminho relativo (nao URL S3) |
| `src/components/finance/InvoicesContent.tsx` | Adicionar sub-tabs (Faturas / Notas de Credito), corrigir logica de download para usar signed URLs do storage |
| `src/components/finance/CreditNotesContent.tsx` | Novo componente - tabela de notas de credito com acoes |
| `src/hooks/useAllPayments.ts` | Adicionar `credit_note_id`, `credit_note_reference` ao mapeamento |
| `src/hooks/useCreditNotes.ts` | Novo hook - query dedicada para buscar vendas/pagamentos com notas de credito |
| `src/components/finance/InvoiceActionsMenu.tsx` | Corrigir download para usar caminho do storage em vez de URL direto |
| `src/types/finance.ts` | Adicionar `credit_note_id`, `credit_note_reference` ao tipo `PaymentWithSale` |

**Edge Function - Fluxo de Sync corrigido:**

```text
1. Chamar InvoiceXpress PDF API -> obter URL temporario do PDF
2. Fetch do PDF (binario) usando esse URL
3. Upload para bucket 'invoices' com path: {org_id}/{document_type}_{document_id}.pdf
4. Guardar o PATH (nao URL) no campo invoice_file_url / invoice_pdf_url
5. Quando o frontend pede download -> gerar signed URL a partir do path guardado
```

**Hook useCreditNotes:**

```text
Query 1: sale_payments com credit_note_id IS NOT NULL
Query 2: sales com credit_note_id IS NOT NULL (notas de credito a nivel da venda)
Combinar resultados numa lista unica
```

**Sub-tabs no InvoicesContent:**

```text
<Tabs defaultValue="faturas">
  <TabsList>
    <TabsTrigger value="faturas">Faturas</TabsTrigger>
    <TabsTrigger value="notas-credito">Notas de Credito</TabsTrigger>
  </TabsList>
  <TabsContent value="faturas">  -> tabela actual melhorada
  <TabsContent value="notas-credito"> -> CreditNotesContent
</Tabs>
```

**Migracao BD**: Nao necessaria - os campos `credit_note_id` e `credit_note_reference` ja existem em ambas as tabelas. Apenas e necessario corrigir o formato dos dados guardados em `invoice_file_url` e `invoice_pdf_url` (caminho relativo em vez de URL completo).

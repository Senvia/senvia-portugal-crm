

## Importar Notas de Credito do InvoiceXpress

### Problema

As notas de credito foram emitidas diretamente no InvoiceXpress (fora do Senvia OS). O hook `useCreditNotes` consulta os campos `credit_note_id` e `credit_note_reference` na base de dados local, mas estes estao todos vazios (NULL). Logo, a tab Notas de Credito aparece vazia.

### Solucao

Criar uma edge function que consulta a API do InvoiceXpress para listar notas de credito, e um botao "Sincronizar" na tab que importa esses documentos para a base de dados local.

---

### Passo 1: Nova Edge Function `sync-credit-notes`

Cria uma edge function que:
1. Chama `GET /credit_notes.json?api_key=...&page=1&per_page=50` no InvoiceXpress
2. Para cada nota de credito encontrada, tenta associar ao documento original (fatura) atraves do campo `related_document` ou `observations`
3. Procura na tabela `sales` ou `sale_payments` o registo com o `invoicexpress_id` correspondente ao documento original
4. Atualiza os campos `credit_note_id` e `credit_note_reference` nesses registos
5. Opcionalmente descarrega o PDF e guarda no bucket `invoices`

### Passo 2: Hook `useSyncCreditNotes`

Mutation hook que chama a edge function e invalida as queries relevantes apos sucesso.

### Passo 3: Atualizar `CreditNotesContent.tsx`

Adicionar um botao "Sincronizar com InvoiceXpress" no topo da tab Notas de Credito. Quando clicado, chama o hook de sync e recarrega a lista.

### Passo 4: Melhorar o hook `useCreditNotes` (fallback)

Caso a sincronizacao nao consiga associar automaticamente todas as notas de credito, adicionar uma tabela auxiliar `credit_notes_cache` para guardar notas de credito importadas que nao foram associadas a vendas locais.

---

### Seccao Tecnica

**Ficheiros a criar:**

| Ficheiro | Descricao |
|---|---|
| `supabase/functions/sync-credit-notes/index.ts` | Edge function que lista notas de credito da API InvoiceXpress e atualiza a BD local |

**Ficheiros a modificar:**

| Ficheiro | Alteracao |
|---|---|
| `src/components/finance/CreditNotesContent.tsx` | Adicionar botao "Sincronizar" e estado de loading |
| `src/hooks/useCreditNotes.ts` | Adicionar mutation `useSyncCreditNotes` |

**Fluxo da Edge Function:**

```text
1. GET /credit_notes.json (InvoiceXpress API)
2. Para cada nota de credito:
   a. Extrair o ID do documento original (fatura/fatura-recibo relacionada)
   b. Procurar na tabela 'sales' por invoicexpress_id = documento_original_id
   c. Se encontrar -> UPDATE sales SET credit_note_id = NC.id, credit_note_reference = NC.sequence_number
   d. Se nao encontrar na sales -> procurar em sale_payments por invoicexpress_id
   e. Se encontrar -> UPDATE sale_payments SET credit_note_id, credit_note_reference
   f. Descarregar PDF da NC e guardar no bucket invoices
3. Retornar contagem de NCs sincronizadas
```

**API InvoiceXpress - Endpoint usado:**

```text
GET https://{account}.app.invoicexpress.com/credit_notes.json?api_key={key}&page=1&per_page=50
Response: { credit_notes: [{ id, status, sequence_number, date, client, total, ... }] }
```

**Migracao BD:** Nao necessaria - os campos ja existem. Apenas precisamos de preenche-los com dados do InvoiceXpress.


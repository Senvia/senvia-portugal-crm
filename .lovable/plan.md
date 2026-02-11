
## Auditoria Completa: O que Falta na Integracao InvoiceXpress

Apos analise detalhada de todos os componentes, hooks, e edge functions, aqui esta tudo o que falta ou esta incompleto.

---

### PROBLEMA 1: Tab "Faturas" no Financeiro e Apenas Uma Tabela Basica

**Situacao atual**: A tab Faturas (`InvoicesContent.tsx`) mostra uma tabela simples com referencia, data, venda, cliente, valor e um botao de download. Mas:

- O download via InvoiceXpress (`handleDownloadInvoiceXpress`) constroi um URL direto para o PDF que requer autenticacao no InvoiceXpress - nao funciona para o utilizador
- Nao ha botao para **ver detalhes** do documento (o `InvoiceDetailsModal` existe mas nao e usado aqui)
- Nao ha botao para **anular** faturas a partir desta tab
- Nao ha botao para **enviar por email** a partir desta tab
- Nao ha botao para **sincronizar PDF** para download local
- Nao mostra faturas emitidas a nivel da venda (apenas pagamentos com referencia)

**Solucao**: Enriquecer a tabela de faturas com acoes completas:
- Botao "Ver Detalhes" que abre o `InvoiceDetailsModal`
- Botao "Sincronizar PDF" usando `useSyncInvoice` (busca o PDF e guarda no storage)
- Botao "Download" que funciona com signed URL do storage (apos sync)
- Botao "Enviar Email" usando `SendInvoiceEmailModal`
- Botao "Anular" usando `CancelInvoiceDialog` + `useCancelInvoice`
- Incluir tambem faturas a nivel da venda (campo `invoicexpress_id` na tabela `sales`)

---

### PROBLEMA 2: Nota de Credito NAO Existe

**Situacao atual**: O sistema permite "anular" documentos (mudar estado para "canceled" no InvoiceXpress), mas **nota de credito** e um documento fiscal diferente. Anular != Nota de Credito.

- Anular: Cancela o documento original (so possivel se nao tiver sido enviado ao cliente/AT)
- Nota de Credito: Documento legal que reverte/corrige uma fatura ja emitida e comunicada

**O que falta**:
- Nova edge function `create-credit-note` que chama `POST /credit_notes.json` na API InvoiceXpress
- Hook `useCreateCreditNote` no frontend
- Modal `CreateCreditNoteModal` para o utilizador preencher motivo e valor
- Botao "Emitir Nota de Credito" na lista de pagamentos e na tab Faturas
- Campos na BD para guardar referencia da nota de credito

---

### PROBLEMA 3: Cancelar Faturas So Acessivel Dentro do Detalhe da Venda

**Situacao atual**: O botao "Anular" so aparece no `SalePaymentsList` (dentro do modal de detalhes de uma venda). O utilizador precisa:
1. Ir a Vendas
2. Abrir uma venda
3. Encontrar a fatura nos pagamentos
4. Clicar "Anular"

Nao ha forma de anular diretamente a partir da tab "Faturas" no Financeiro.

**Solucao**: Adicionar acao "Anular" na tab Faturas com o mesmo `CancelInvoiceDialog` ja existente.

---

### PROBLEMA 4: Download de PDFs Nao Funciona Corretamente

**Situacao atual**: Na tab Faturas:
- Se `invoice_file_url` existe (PDF ja sincronizado) -> funciona via signed URL
- Se nao existe mas tem `invoicexpress_id` -> tenta abrir URL direto do InvoiceXpress que requer autenticacao -> **NAO FUNCIONA**

**Solucao**: Substituir o link direto por um fluxo de sync:
1. Se nao tem PDF local, mostrar botao "Sincronizar" que chama `useSyncInvoice`
2. Apos sync, o PDF fica disponivel no storage e pode ser baixado com signed URL

---

### PROBLEMA 5: Emissao de Fatura-Recibo por Pagamento Individual

**Situacao atual**: Na `SalePaymentsList`, o botao "Gerar Recibo" so aparece quando:
- `payment.status === 'paid'`
- `hasInvoice` (a venda ja tem uma fatura global)
- `hasInvoiceXpress` ativo
- O pagamento nao tem `invoice_reference`

Isto significa que para gerar um recibo, PRIMEIRO tem de existir uma fatura da venda. Mas em muitos casos, o utilizador quer emitir uma **Fatura-Recibo (FR)** diretamente por pagamento, sem fatura global primeiro.

**Solucao**: Adicionar botao "Emitir Fatura-Recibo" nos pagamentos com status "paid" que nao tenham `invoicexpress_id`, independentemente de existir fatura global.

---

### RESUMO: Plano de Implementacao

| Prioridade | Tarefa | Tipo | Ficheiros |
|---|---|---|---|
| 1 | Enriquecer tab Faturas com acoes (detalhes, sync, download, anular, email) | Frontend | `InvoicesContent.tsx` |
| 2 | Corrigir download de PDF (sync antes de download) | Frontend | `InvoicesContent.tsx` |
| 3 | Incluir faturas da venda (nao so pagamentos) na tab Faturas | Frontend + Hook | `InvoicesContent.tsx`, `useAllPayments.ts` |
| 4 | Emitir Fatura-Recibo por pagamento sem fatura global | Frontend | `SalePaymentsList.tsx` |
| 5 | Criar Nota de Credito (novo fluxo completo) | Full Stack | Nova edge function, novo hook, novo modal, migracao BD |

### Secao Tecnica Detalhada

**Prioridade 1-2-3: Tab Faturas Completa**

Modificar `InvoicesContent.tsx` para:
- Adicionar coluna "Acoes" com menu dropdown (ou botoes inline)
- Importar e usar `InvoiceDetailsModal`, `CancelInvoiceDialog`, `SendInvoiceEmailModal`, `useSyncInvoice`, `useCancelInvoice`
- Alterar `useAllPayments` para tambem trazer `invoicexpress_type` da venda
- Criar query separada ou modificar existente para incluir faturas emitidas a nivel da venda (registos em `sales` com `invoicexpress_id` que nao tenham pagamento associado)
- Substituir `handleDownloadInvoiceXpress` por fluxo de sync + download

**Prioridade 4: Fatura-Recibo por Pagamento**

Modificar condicao na `SalePaymentsList.tsx` linha 344:
- De: `payment.status === 'paid' && hasInvoice && hasInvoiceXpress && !payment.invoice_reference`
- Para: `payment.status === 'paid' && hasInvoiceXpress && !payment.invoicexpress_id`
- Ajustar o label do botao para "Emitir Fatura-Recibo" quando nao ha fatura global

**Prioridade 5: Nota de Credito**

Nova edge function `create-credit-note`:
- Endpoint InvoiceXpress: `POST /credit_notes.json`
- Body similar a uma fatura mas com referencia ao documento original
- Apos criar, mudar estado para "final" com `PUT /credit_notes/:id/change-state.json`

Novo hook `useCreateCreditNote.ts`

Novo modal `CreateCreditNoteModal.tsx` com campos:
- Documento original (pre-preenchido)
- Motivo
- Valor (parcial ou total)
- Itens a creditar

Migracao BD:
- Adicionar campos `credit_note_reference`, `credit_note_id` em `sale_payments` e/ou `sales`

Registar em `supabase/config.toml`

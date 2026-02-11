

## Replicar a Vista de Fatura do InvoiceXpress no Senvia OS

### O que muda

Quando clicares numa fatura na tabela, o modal vai mostrar exactamente o que ves no InvoiceXpress: dados do emitente, dados do cliente com morada, tabela de itens completa (com IVA, desconto, total iliquido), bloco de impostos discriminados, sumario financeiro, observacoes, dados bancarios, QR code, e botoes de accao (Download PDF, Enviar por Email, Nota de Credito, Anular).

### Alteracoes

**1. Tornar as linhas da tabela de faturas clicaveis**

Na `InvoicesContent.tsx`, cada linha da tabela passa a ter um `onClick` que abre o modal de detalhes. Precisa de guardar o estado da fatura seleccionada e passar o `invoicexpress_id`, `document_type` e `organization_id` ao modal.

**2. Capturar mais dados na Edge Function `get-invoice-details`**

A API do InvoiceXpress devolve campos que actualmente ignoramos. Vamos passar a incluir na resposta:

- `owner` (dados do emitente: nome, morada, email, NIF)
- `client` expandido (morada completa, codigo postal, cidade, pais)
- `observations` (observacoes do documento)
- `mb_reference` (referencia multibanco, se existir)
- `cancel_reason` (razao de cancelamento, no print aparece "Razao de cancelamento")
- `tax_exemption` e `tax_exemption_reason`
- QR code URL (obter via endpoint `/api/qr_codes/{id}.json` sempre, nao so no sync)

**3. Redesenhar o `InvoiceDetailsModal`**

O modal actual e simples. O novo layout replica o InvoiceXpress:

```text
+------------------------------------------+
| Factura n.o FT 2026/3        [Cancelado] |
| Cliente Name                              |
+------------------------------------------+
|                                          |
| EMITENTE               CLIENTE           |
| Nome empresa           Nome cliente      |
| Morada                 Morada            |
| CP, Cidade             CP, Cidade        |
| Email / NIF            Pais              |
|                                          |
| Factura n.o FT 2026/3                    |
| Data | Vencimento | Contribuinte | Ref  |
|------|------------|--------------|------|
| ...  | ...        | ...          | ...  |
|                                          |
| Item | Descricao | Preco | Qtd | IVA |  |
|      |           |       |     | Dsc |  |
|      |           |       |     |Total |  |
|------|-----------|-------|-----|------|  |
| ...  | ...       | ...   | ... | ...  |  |
|                                          |
| Imposto | Incidencia | Valor            |
| IVA23   | 50,00      | 11,50            |
|                                          |
|              Sumario                     |
|              Soma:      50,00            |
|              Desconto:   0,00            |
|              Retencao:   0,00            |
|              S/IVA:     50,00            |
|              IVA:       11,50            |
|              Total:     61,50            |
|                                          |
| Observacoes: IVA - regime de isencao    |
| Razao cancelamento: era um teste        |
|                                          |
| Dados Bancarios     |   QR Code         |
| IBAN: PT50...       |   [imagem QR]     |
|                                          |
+------------------------------------------+
| [Download PDF] [Enviar] [Nota Credito]  |
| [Anular]                                 |
+------------------------------------------+
```

**4. Botoes de accao no footer do modal**

- **Download PDF**: Gera signed URL do storage ou faz sync primeiro
- **Enviar por Email**: Abre o `SendInvoiceEmailModal`
- **Nota de Credito**: Abre o `CreateCreditNoteModal`
- **Anular**: Abre o `CancelInvoiceDialog`

---

### Seccao Tecnica

**Ficheiros a editar:**

1. **`supabase/functions/get-invoice-details/index.ts`**
   - Expandir o objecto `result` para incluir: `owner` (de `doc.owner`), `client.address`, `client.postal_code`, `client.city`, `observations` (de `doc.observations`), `mb_reference` (de `doc.mb_reference`), `cancel_reason`
   - Obter QR code URL sempre (nao apenas quando `sync=true`), via endpoint `/api/qr_codes/{id}.json`
   - Actualizar o `InvoiceDetailsData` type no hook

2. **`src/hooks/useInvoiceDetails.ts`**
   - Expandir a interface `InvoiceDetailsData` com os novos campos: `owner`, `observations`, `mb_reference`, `cancel_reason`, `client.address`, `client.postal_code`, `client.city`

3. **`src/components/sales/InvoiceDetailsModal.tsx`**
   - Redesenho completo do layout para replicar o visual do InvoiceXpress
   - Adicionar seccao de emitente e cliente lado a lado
   - Tabela de itens com colunas Item, Descricao, Preco, Qtd, IVA, Dsc, Total Iliquido
   - Bloco de impostos discriminados
   - Sumario financeiro (Soma, Desconto, Retencao, S/IVA, IVA, Total)
   - Seccao de observacoes e razao de cancelamento
   - Dados bancarios + QR code lado a lado
   - Footer com botoes de accao: Download PDF, Enviar, Nota de Credito, Anular
   - Integrar `SendInvoiceEmailModal`, `CreateCreditNoteModal`, `CancelInvoiceDialog` dentro do modal

4. **`src/components/finance/InvoicesContent.tsx`**
   - Adicionar estado para fatura seleccionada
   - `onClick` na `TableRow` para abrir o `InvoiceDetailsModal`
   - Cursor pointer nas linhas
   - Passar os dados necessarios ao modal (invoicexpress_id, document_type, organization_id)

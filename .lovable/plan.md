

## Adaptar o Sistema de Vendas ao InvoiceXpress

### Como o InvoiceXpress Realmente Funciona

Existem 3 tipos de documentos fiscais relevantes:

```text
+------------------+--------+------------------------------------------+
| Documento        | Prefixo| Quando usar                              |
+------------------+--------+------------------------------------------+
| Fatura           | FT     | Cobrar agora, receber depois (credito)   |
| Fatura-Recibo    | FR     | Cobrar e receber no mesmo momento        |
| Recibo           | RC     | Comprovar pagamento de uma FT existente  |
+------------------+--------+------------------------------------------+
```

Regras fiscais:
- O RC (Recibo) so pode ser criado se ja existir uma FT (Fatura) emitida
- A FR (Fatura-Recibo) e um documento unico que substitui FT + RC
- Para pagamentos parcelados, o caminho correcto e: FT primeiro, depois RC por cada pagamento

### O Que Esta Errado Hoje

1. **Nao existe criacao de FR (Fatura-Recibo)**: O botao "Emitir Fatura-Recibo" na verdade chama `generate-receipt` que cria um RC - mas isso so funciona se ja existir uma FT, o que causa erro
2. **O botao "Gerar Recibo" aparece quando nao devia**: Mostra a opcao de RC mesmo sem FT emitida
3. **Falta logica condicional nos botoes**: O sistema nao distingue entre os cenarios de uso

### Os 2 Fluxos Correctos Para o Utilizador

**Fluxo A - "Faturar antes de receber"** (venda a credito/parcelada)
1. Utilizador cria a venda
2. Clica "Emitir Fatura (FT)" - emite FT pelo total da venda
3. A medida que recebe pagamentos, marca cada um como "Pago"
4. Para cada pagamento pago, clica "Gerar Recibo (RC)" - cria RC associado a FT

**Fluxo B - "Receber e faturar ao mesmo tempo"** (pagamento imediato total)
1. Utilizador cria a venda
2. Regista pagamento total e marca como "Pago"
3. Clica "Emitir Fatura-Recibo (FR)" - cria FR num unico documento
4. Nao precisa de RC porque o FR ja comprova o pagamento

### Alteracoes Tecnicas

**1. Nova Edge Function: `issue-invoice-receipt`**
- Endpoint: `POST /invoice_receipts.json` (InvoiceXpress)
- Recebe: `sale_id`, `payment_id`, `organization_id`
- Cria uma FR (Fatura-Recibo) pelo valor do pagamento
- Finaliza automaticamente (`change-state: finalized`)
- Guarda o PDF no storage e a referencia no `sale_payments`
- Logica similar ao `issue-invoice` mas usando o endpoint `/invoice_receipts.json`

**2. Novo Hook: `useIssueInvoiceReceipt`**
- Semelhante ao `useIssueInvoice` mas chama a nova edge function
- Guarda referencia no pagamento (nao na venda)

**3. Actualizar `InvoiceDraftModal.tsx`**
- Adicionar modo `"invoice_receipt"` com label "Fatura-Recibo (FR)"
- Mostrar dados do pagamento especifico (valor, data, metodo)

**4. Actualizar `SalePaymentsList.tsx` - Logica dos Botoes**

A logica condicional dos botoes passa a ser:

```text
Botao global (nivel da venda):
  - Se NAO tem FT emitida e cliente tem NIF:
      Mostrar "Emitir Fatura (FT)" pelo total da venda
  - Se JA tem FT emitida:
      Mostrar referencia da FT com acoes (PDF, Email, NC, Anular)

Botao por pagamento (nivel do pagamento individual):
  - Se pagamento esta "Pago" e NAO tem documento associado:
      - Se JA existe FT na venda:
          Mostrar "Gerar Recibo (RC)" → chama generate-receipt
      - Se NAO existe FT na venda:
          Mostrar "Emitir Fatura-Recibo (FR)" → chama issue-invoice-receipt
  - Se pagamento ja tem documento:
      Mostrar referencia com acoes (PDF, Email, Anular)
```

**5. Actualizar `generate-receipt` (Edge Function existente)**
- Manter como esta - ja funciona correctamente para criar RC a partir de FT
- Apenas melhorar a mensagem de erro quando nao existe FT

**6. Actualizar tipos e labels**
- Adicionar `"invoice_receipt"` ao `documentType` onde necessario
- Labels: FT = "Fatura", FR = "Fatura-Recibo", RC = "Recibo"

**7. Actualizar `supabase/config.toml`**
- Adicionar configuracao para a nova edge function `issue-invoice-receipt`

### Resultado Final

- Utilizador que quer faturar antes de receber: usa FT + RC (fluxo actual corrigido)
- Utilizador que recebe e factura ao mesmo tempo: usa FR (novo)
- Botoes adaptativos que mostram a opcao correcta automaticamente
- Sem confusao entre tipos de documentos fiscais
- Totalmente conforme com a API do InvoiceXpress




## Problemas Encontrados no Fluxo de Vendas e Faturacao

### 1. O Rascunho da Fatura NAO mostra os itens da venda

O `InvoiceDraftModal` mostra apenas o valor total e os dados do cliente. O utilizador nao consegue ver **quais produtos/servicos** vao aparecer na fatura antes de confirmar. Isto e critico porque:
- A fatura emitida pelo InvoiceXpress vai listar os itens com IVA
- O utilizador precisa validar se os itens estao correctos antes de emitir um documento fiscal irreversivel

**Solucao**: Adicionar a lista de itens da venda ao modal de rascunho, com o IVA de cada item visivel.

### 2. A Fatura (FT) NAO guarda o PDF localmente

A edge function `issue-invoice` guarda o URL directo do InvoiceXpress (S3 da AWS) no campo `invoice_pdf_url`. Esse link expira passadas algumas horas. A edge function `issue-invoice-receipt` ja corrige isto (faz download e guarda no Storage local). A `issue-invoice` precisa do mesmo tratamento.

**Solucao**: Adicionar download e upload do PDF para o bucket `invoices` na edge function `issue-invoice`.

### 3. O utilizador nao entende o que acontece com pagamentos parcelados

Quando uma venda tem 3 parcelas e o utilizador quer faturar:
- **Opcao A (FT)**: Emite 1 fatura pelo total. Depois, por cada pagamento pago, gera 1 recibo (RC). A fatura cobre tudo, os recibos comprovam cada pagamento.
- **Opcao B (FR)**: Emite 1 fatura-recibo por cada pagamento individualmente. Os itens da venda sao escalados proporcionalmente ao valor do pagamento.

O sistema ja faz isto correctamente, mas o utilizador nao tem indicacao visual de qual caminho esta a seguir. Nao existe nenhuma mensagem explicativa.

**Solucao**: Adicionar texto explicativo no rascunho e no botao:
- FT: "Esta fatura cobre o valor total da venda (X euros). Apos emissao, gere um Recibo por cada pagamento recebido."
- FR: "Esta fatura-recibo cobre apenas este pagamento de X euros."

### 4. O modal de adicionar pagamento mostra campo de referencia manual quando InvoiceXpress esta activo

O `AddPaymentModal` mostra sempre o campo "Referencia da Fatura" e "Anexar Fatura" manualmente. Quando o InvoiceXpress esta activo, estes campos nao fazem sentido porque os documentos sao gerados automaticamente pelo sistema.

**Solucao**: Ocultar os campos de referencia manual e upload de fatura quando InvoiceXpress esta activo (mesma logica ja usada noutros sitios).

### Alteracoes Tecnicas

**1. `src/components/sales/InvoiceDraftModal.tsx`**
- Aceitar nova prop `saleItems` (lista de itens da venda com nome, quantidade, preco, IVA)
- Mostrar tabela de itens com badge de IVA no rascunho
- Adicionar texto explicativo por modo (FT vs FR vs RC)
- Para FR com parcelas: indicar que os valores sao proporcionais ao pagamento

**2. `src/components/sales/SalePaymentsList.tsx`**
- Passar `saleItems` e `products` ao `InvoiceDraftModal`
- Buscar `saleItems` e `products` (ja existem no contexto da pagina)

**3. `supabase/functions/issue-invoice/index.ts`**
- Adicionar download do PDF binario e upload para o bucket `invoices` (copiar logica do `issue-invoice-receipt`)
- Guardar o path local em vez do URL do S3

**4. `src/components/sales/AddPaymentModal.tsx`**
- Aceitar nova prop `hasInvoiceXpress`
- Ocultar campos "Referencia da Fatura" e "Anexar Fatura" quando InvoiceXpress esta activo

**5. `src/components/sales/SalePaymentsList.tsx`**
- Passar `hasInvoiceXpress` ao `AddPaymentModal`




## Gerar PDF apos emissao de fatura (InvoiceXpress)

### O que muda
Apos criar e finalizar a fatura no InvoiceXpress, a edge function vai automaticamente pedir a geracao do PDF e guardar o URL. O utilizador podera fazer download direto do PDF a partir da listagem de pagamentos e da aba de faturas.

### Alteracoes

**1. Edge function `issue-invoice`**
- Apos finalizar o documento (passo 2 atual), adicionar um passo 3: chamar `GET /api/pdf/:invoiceId.json?api_key=...`
- Como a API e assincrona (pode devolver 202 antes do PDF estar pronto), fazer polling com retry (maximo 3 tentativas, intervalo de 2 segundos)
- Se o PDF estiver pronto (status 200), guardar o `pdfUrl` no campo `invoice_file_url` do pagamento ou da venda
- Se nao ficar pronto a tempo, nao bloquear -- a fatura ja foi emitida com sucesso, o PDF pode ser obtido depois

Logica:
```text
Apos finalizacao:
  1. GET /api/pdf/{invoiceId}.json?api_key=...
  2. Se 200 -> extrair output.pdfUrl -> guardar em invoice_file_url
  3. Se 202 -> esperar 2s e tentar novamente (max 3x)
  4. Se falhar -> ignorar (fatura emitida, PDF indisponivel temporariamente)
```

**2. Guardar o PDF URL na base de dados**
- No fluxo per-payment: guardar `pdfUrl` no campo `invoice_file_url` do `sale_payments`
- No fluxo legacy (venda completa): guardar no campo da `sales` (se existir)
- O campo `invoice_file_url` ja existe na tabela `sale_payments` -- sera reutilizado para guardar o URL do InvoiceXpress

**3. UI - Download direto do PDF**
- Na `SalePaymentsList`, quando o pagamento tem `invoice_file_url` de um documento InvoiceXpress, mostrar botao de download que abre o URL diretamente
- Na `InvoicesContent`, o download ja funciona para ficheiros no storage; para URLs externos (InvoiceXpress PDF), abrir diretamente

### Resumo tecnico

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/issue-invoice/index.ts` | Adicionar passo de geracao de PDF com polling apos finalizacao |
| `src/components/sales/SalePaymentsList.tsx` | Mostrar botao download PDF quando `invoice_file_url` existe |

### Notas
- Nao e necessaria migracao de base de dados -- o campo `invoice_file_url` ja existe
- O PDF URL do InvoiceXpress e temporario (expira), por isso o sistema vai guardar o URL e regenerar se necessario
- Se o PDF nao estiver pronto nos 3 retries, a fatura continua emitida normalmente -- o utilizador pode aceder ao PDF mais tarde pelo link do InvoiceXpress


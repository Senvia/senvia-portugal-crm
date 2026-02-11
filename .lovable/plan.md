

## Integrar QR Code do InvoiceXpress

### Objetivo
Apos emitir uma Fatura ou gerar um Recibo, obter o URL do QR Code via `GET /api/qr_codes/:document-id.json` e guardar/exibir na interface.

### Alteracoes

**1. Edge Function `issue-invoice`**

Apos finalizar a fatura e obter o PDF, adicionar polling do QR Code (mesmo padrao do PDF - ate 3 tentativas com 2s de intervalo, status 202 = retry):

```text
GET /api/qr_codes/:invoiceId.json?api_key=...
Resposta 200: { "qr_code": { "url": "https://..." } }
Resposta 202: Retry
```

Guardar o `qr_code_url` na tabela `sales` (novo campo).

**2. Edge Function `generate-receipt`**

Mesmo padrao: apos criar o recibo parcial, obter o QR Code do recibo e guardar no `sale_payments` (novo campo).

**3. Migracao de Base de Dados**

Adicionar coluna `qr_code_url` a ambas as tabelas:

```text
ALTER TABLE public.sales ADD COLUMN qr_code_url text DEFAULT NULL;
ALTER TABLE public.sale_payments ADD COLUMN qr_code_url text DEFAULT NULL;
```

**4. Frontend - SalePaymentsList**

- Ao lado do botao de download PDF, mostrar um botao/icone para abrir o QR Code (da fatura global e dos recibos individuais)
- Ao clicar, abre o URL do PNG numa nova tab ou mostra num popover/dialog pequeno

**5. Atualizar Tipos**

Em `src/types/sales.ts`, adicionar `qr_code_url` a `Sale` e `SalePayment`.

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| Migracao SQL | Criar | Adicionar `qr_code_url` a `sales` e `sale_payments` |
| `supabase/functions/issue-invoice/index.ts` | Editar | Polling QR Code apos finalizacao, guardar em `sales` |
| `supabase/functions/generate-receipt/index.ts` | Editar | Polling QR Code apos recibo, guardar em `sale_payments` |
| `src/types/sales.ts` | Editar | Adicionar campo `qr_code_url` |
| `src/components/sales/SalePaymentsList.tsx` | Editar | Botao para ver QR Code da fatura e dos recibos |

### Notas
- O endpoint retorna 202 enquanto o QR Code esta a ser gerado (polling necessario, tal como o PDF)
- O endpoint retorna 422 se o documento ainda esta em rascunho (nao se aplica porque finalizamos antes)
- O QR Code e obrigatoriamente exigido pela AT em documentos fiscais portugueses, por isso e importante te-lo disponivel


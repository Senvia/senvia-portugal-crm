

## Modal de Rascunho antes de Emitir Fatura

### Fluxo Atual
Clicar "Fatura" ou "Fatura-Recibo" -> Chama edge function -> Cria rascunho no InvoiceXpress -> Finaliza automaticamente -> Fatura emitida.

### Novo Fluxo
Clicar "Fatura" ou "Fatura-Recibo" -> Abre modal com preview do rascunho -> Utilizador revê os dados -> Clica "Emitir" -> Chama edge function -> Fatura emitida.

### Alteracoes

**1. Novo componente: `src/components/sales/InvoiceDraftModal.tsx`**

Modal que mostra um resumo/preview da fatura antes de emitir:
- Nome do cliente e NIF
- Tipo de documento (Fatura ou Fatura-Recibo)
- Data de emissao (hoje)
- Valor do pagamento
- Metodo de pagamento (se disponivel)
- Configuracao de IVA atual (taxa ou isento + motivo)
- Botao "Cancelar" e botao "Emitir Fatura" (com loading state)

**2. Alteracao: `src/components/sales/SalePaymentsList.tsx`**

Em vez de chamar `issueInvoice.mutate()` diretamente nos botoes "Fatura" e "Fatura-Recibo":
- Adicionar estado `draftPayment` para guardar o pagamento selecionado e o tipo de documento
- Ao clicar no botao, guardar os dados e abrir o `InvoiceDraftModal`
- O modal recebe os dados e, ao confirmar, chama `issueInvoice.mutate()`

**3. Dados para o preview**

O modal precisa de:
- `clientName`, `clientNif` (ja disponiveis via props ou contexto)
- `documentType` ("invoice" ou "invoice_receipt")
- `paymentAmount`, `paymentDate`, `paymentMethod` (do pagamento selecionado)
- `taxConfig` (sera buscado da organizacao via query existente ou passado como prop)

Para obter o `tax_config`, sera adicionada uma query simples no componente ou passado como prop a partir do `SaleDetailsModal` que ja tem acesso a organizacao.

### Detalhe tecnico

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/InvoiceDraftModal.tsx` | Novo componente - modal de preview com dados da fatura |
| `src/components/sales/SalePaymentsList.tsx` | Substituir chamada direta por abertura do modal de rascunho |
| `src/hooks/useOrganization.ts` (se necessario) | Verificar se ja expoe `tax_config`; se nao, adicionar |

### Layout do Modal (mobile-first)

```text
+----------------------------------+
|  Rascunho de Fatura              |
+----------------------------------+
|                                  |
|  Tipo: Fatura-Recibo             |
|  Data: 10/02/2026                |
|                                  |
|  Cliente: Joao Silva             |
|  NIF: 123456789                  |
|                                  |
|  Valor: 500,00 EUR               |
|  IVA: Isento (Art. 53.o)         |
|                                  |
|  Total: 500,00 EUR               |
|                                  |
+----------------------------------+
|  [Cancelar]     [Emitir Fatura]  |
+----------------------------------+
```

### Edge function

Nenhuma alteracao necessaria - a edge function ja funciona corretamente. Toda a logica nova e no frontend.

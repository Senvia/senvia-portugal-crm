

# Reorganizar Layout do Modal de Detalhes da Venda

## Resumo

Reestruturar o cabecalho e layout do modal de detalhes da venda para melhorar a legibilidade, mover o progresso de pagamento para a coluna direita e simplificar os botoes de faturacao.

---

## Alteracoes no `SaleDetailsModal.tsx`

### 1. Novo cabecalho compacto

O cabecalho do dialogo passa a ter apenas o titulo "Detalhes da Venda" (sem badges).

Abaixo do cabecalho, antes do grid de colunas, adicionar uma barra de contexto com:
- **Codigo da venda** (badge mono) - esquerda
- **Data da venda** (texto) - centro
- **Estado da venda** (Select com cores) - direita

Isto substitui o codigo e estado que estavam no DialogHeader e o card "Estado da Venda" que estava na coluna direita.

```text
[V-00012]     12 Fev 2026     [Em Progresso v]
```

### 2. Remover card "Estado da Venda" da coluna direita

O select de estado move-se para a barra de contexto acima, libertando espaco na coluna direita.

### 3. Mover progresso de pagamento para a coluna direita

O bloco de resumo de pagamentos (barra de progresso + total pago + em falta) que atualmente esta dentro do `SalePaymentsList` na coluna esquerda sera replicado na coluna direita, entre o bloco "Valor Total" e a "Proposta Associada".

Na coluna direita, adicionar um card "Pagamento" com:
- Barra de progresso (Progress component)
- Total Pago / Em Falta (grid 2 cols)
- Percentagem

Os dados vem do hook `useSalePayments` + `calculatePaymentSummary` que ja esta importado no `SaleDetailsModal`.

### 4. Remover "Ver Rascunho de Fatura" dos pagamentos

No `SalePaymentsList.tsx`, remover o bloco "Global Invoice Button" (linhas 200-335) que contem o botao "Ver Rascunho de Fatura/Fatura-Recibo" e toda a UI de fatura global. Essa funcionalidade passa para o footer do modal principal.

Manter os botoes de recibo (RC) individuais por pagamento quando ja existe FT.

### 5. Botao "Emitir Fatura" dinamico no footer

No footer do `SaleDetailsModal`, ao lado do botao "Editar Venda", adicionar um botao dinamico que:

- Se **todos os pagamentos estao pagos**: label = "Emitir Fatura-Recibo", abre `InvoiceDraftModal` em modo `invoice_receipt`
- Se **ha pagamentos agendados/pendentes**: label = "Emitir Fatura", abre `InvoiceDraftModal` em modo `invoice`
- Condicoes de visibilidade: InvoiceXpress ativo, sem fatura existente, cliente com NIF

Este botao substitui o antigo "Ver Rascunho de Fatura" que estava no footer.

---

## Ficheiros a alterar

### `src/components/sales/SaleDetailsModal.tsx`
- Simplificar DialogHeader (remover badges de codigo/estado/data)
- Adicionar barra de contexto com codigo + data + select de estado logo apos o header
- Remover card "Estado da Venda" da coluna direita
- Adicionar card "Pagamento" com progresso na coluna direita (entre valor total e proposta)
- Alterar botao do footer: de "Ver Rascunho" para "Emitir Fatura" / "Emitir Fatura-Recibo" (dinamico)

### `src/components/sales/SalePaymentsList.tsx`
- Remover o bloco "Global Invoice Button" (linhas 200-335) que contem o botao "Ver Rascunho" e toda a UI de fatura ja emitida a nivel global
- Manter os botoes individuais de recibo (RC) por pagamento
- Manter o bloco de resumo (progresso) no final dos pagamentos na coluna esquerda (duplicado na direita para desktop)

---

## Detalhes tecnicos

### Barra de contexto (novo componente inline)
```text
<div className="px-4 sm:px-6 py-3 border-b border-border/50 flex items-center justify-between gap-3">
  <!-- Codigo -->
  <Badge variant="outline" className="font-mono text-xs">{sale.code}</Badge>
  <!-- Data -->
  <span className="text-sm text-muted-foreground">{date}</span>
  <!-- Estado Select -->
  <Select value={status} onValueChange={handleStatusChange} disabled={isDeliveredAndLocked}>
    ...
  </Select>
</div>
```

### Card de progresso na coluna direita
```text
Card "Pagamento"
  Progress bar (h-2)
  Grid 2 cols:
    Total Pago: formatCurrency(summary.totalPaid)
    Em Falta: formatCurrency(summary.remaining)
  Percentagem: {Math.round(summary.percentage)}%
```

Os dados `summary` ja estao disponiveis via `useSalePayments` + `calculatePaymentSummary` no componente pai.

### Botao footer dinamico
A logica existente no footer (linhas 632-648) muda apenas o label:
- De "Ver Rascunho de Fatura" para "Emitir Fatura"
- De "Ver Rascunho de Fatura-Recibo" para "Emitir Fatura-Recibo"
- O icone muda de `Eye` para `FileText`

### O que se remove do SalePaymentsList
- Bloco `{hasInvoiceXpress && !readonly && (...)}` (linhas 200-335) com toda a UI de fatura global (botao rascunho, referencia de fatura existente, acoes PDF/email/NC/anular)
- Os `InvoiceDraftModal` de invoice e invoice_receipt dentro do SalePaymentsList (linhas 628-697)
- Os estados `draftMode` para invoice/invoice_receipt no SalePaymentsList
- Manter apenas o draft de receipt (RC) individual por pagamento


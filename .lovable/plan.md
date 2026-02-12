

# Corrigir Footer e Remover Progresso de Pagamento

## O que muda

### 1. Remover card "Pagamento" da coluna direita
Eliminar o bloco de progresso de pagamento (linhas 559-590) que mostra a barra de progresso, total pago e em falta na coluna direita. Esse resumo ja existe dentro do `SalePaymentsList` na coluna esquerda.

### 2. Footer com 3 botoes

O footer passa a ter 3 botoes:

```text
[ Editar Venda ]  [ Ver Rascunho Fatura ]  [ Emitir Fatura / Emitir Fatura-Recibo ]
```

- **Editar Venda** (ja existe): Abre o modal de edicao
- **Ver Rascunho Fatura** (novo): Abre o `InvoiceDraftModal` em modo preview para o utilizador rever os dados antes de emitir. Visivel quando: InvoiceXpress ativo, cliente com NIF, sem fatura existente
- **Emitir Fatura / Emitir Fatura-Recibo** (ja existe, muda label): Botao dinamico que emite diretamente. Label "Emitir Fatura-Recibo" se todos os pagamentos estao pagos, senao "Emitir Fatura"

## Ficheiro a alterar

### `src/components/sales/SaleDetailsModal.tsx`

1. **Remover** linhas 559-590 (card "Pagamento" com Progress bar na coluna direita)
2. **Alterar** o footer (linhas 654-688) para incluir 3 botoes:
   - Botao 1: "Editar Venda" (sem alteracao)
   - Botao 2: "Ver Rascunho Fatura" -- abre `InvoiceDraftModal` em modo correspondente (preview), icone `Eye`
   - Botao 3: "Emitir Fatura" ou "Emitir Fatura-Recibo" -- emite diretamente, icone `FileText`

O botao "Ver Rascunho" e o "Emitir" partilham as mesmas condicoes de visibilidade (InvoiceXpress ativo, NIF, sem fatura existente). A diferenca e que o "Ver Rascunho" abre o modal para revisao, e o "Emitir" confirma a emissao apos o modal.

Na pratica, o botao atual "Emitir Fatura" ja abre o `InvoiceDraftModal` que funciona como rascunho+confirmacao. Portanto:
- "Ver Rascunho Fatura" abrira o mesmo `InvoiceDraftModal` (que mostra o rascunho e permite confirmar)
- "Emitir Fatura" sera o mesmo botao renomeado

Para ter 3 botoes distintos, vou separar a logica:
- "Ver Rascunho" abre o modal com `draftMode` = preview (abre para ver sem confirmar)
- "Emitir Fatura" abre o modal com `draftMode` = invoice/invoice_receipt (abre para confirmar e emitir)

Como o `InvoiceDraftModal` ja serve ambos os propositos (ver + confirmar), ambos os botoes abrem o mesmo modal. O "Ver Rascunho" usa o icone `Eye` e o "Emitir" usa `FileText`.


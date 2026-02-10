

## Mover "Emitir Fatura-Recibo" para cada linha de pagamento individual

### Problema

O botão está no bloco de resumo, separado dos pagamentos. O utilizador quer que o botão fique **na linha de cada pagamento com status "paid"**, porque a fatura está associada àquele pagamento específico.

### Alteração em `SalePaymentsList.tsx`

Dentro do `.map()` de cada pagamento (linha 119-183), adicionar o botão/badge de faturação **na mesma linha** do pagamento, junto aos botões de ação (editar/eliminar), mas apenas quando `payment.status === 'paid'`.

**Layout atual de cada linha:**
```text
[20,00 EUR] [Pago] [MB Way]              [Editar] [Eliminar]
 1 jan 2025
```

**Novo layout:**
```text
[20,00 EUR] [Pago] [MB Way]              [Emitir Fatura-Recibo] [Editar] [Eliminar]
 1 jan 2025 • Fatura: FR/123
```

- Se `payment.status === 'paid'` e `hasInvoiceXpress` e **não tem** `payment.invoice_reference`: mostrar botão pequeno `variant="outline" size="sm"` com "Emitir Fatura-Recibo"
- Se `payment.status === 'paid'` e **já tem** `payment.invoice_reference`: já aparece a badge da fatura na segunda linha (comportamento existente)
- Remover a secção separada "Invoice Action" (linhas 241-267) que está fora do grid

### Lógica do botão

Na zona de ações de cada pagamento (linha 162-180), alterar a condição: em vez de mostrar editar/eliminar apenas quando `status !== 'paid'`, adicionar também o botão de fatura quando `status === 'paid'`:

```text
Se status !== 'paid': [Editar] [Eliminar]
Se status === 'paid' e hasInvoiceXpress e sem invoice_reference: [Emitir Fatura-Recibo]
Se status === 'paid' e já tem invoice_reference: (nada, já mostra na linha de baixo)
```

### Secção separada removida

Remover completamente o bloco "Invoice Action" standalone (o `div` com `hasInvoiceXpress && hasPaidPayments`) que está depois do Summary.

| Ficheiro | Alteração |
|---|---|
| `SalePaymentsList.tsx` | Adicionar botão fatura na linha de cada pagamento `paid`, remover secção separada |


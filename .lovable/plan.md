

# Formatacao dos Pagamentos nas Observacoes da Fatura

## Problema
Os pagamentos nas observacoes da fatura estao a ser separados por `\n` (newline simples), mas podem nao estar a aparecer com quebra de linha visivel no documento final. O utilizador quer cada pagamento claramente separado por uma linha.

## Alteracao

### `supabase/functions/issue-invoice/index.ts`

Alterar os dois blocos de geracao de observacoes (KeyInvoice ~linha 351 e InvoiceXpress ~linha 774) para usar `\r\n` (quebra de linha compativel com mais sistemas) ou `\n\n` (linha em branco entre cada pagamento) como separador.

**KeyInvoice (linha 351-356):**
```
Pagamento em 3 parcelas:

1. 15/02/2026 - 400.00€

2. 15/03/2026 - 400.00€

3. 15/04/2026 - 400.00€
```

**InvoiceXpress (linha 774-779):**
```
Pagamento em 3 parcelas:

- 1.ª parcela: 400.00 EUR - 15/02/2026

- 2.ª parcela: 400.00 EUR - 15/03/2026

- 3.ª parcela: 400.00 EUR - 15/04/2026
```

Alteracao tecnica: substituir `.join('\n')` por `.join('\n\n')` e adicionar `\n\n` apos a linha de titulo em ambos os caminhos (KeyInvoice e InvoiceXpress).


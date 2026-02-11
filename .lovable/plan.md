

## Alterar Botoes de Faturacao para "Ver Rascunho"

### Problema

Os botoes de faturacao dizem "Emitir Fatura" e "Fatura-Recibo (FR)", o que da a impressao de que a emissao e imediata. Na realidade, esses botoes ja abrem o modal de rascunho onde o utilizador revisa e confirma. O texto dos botoes nao reflete esse comportamento.

### Alteracao

**Ficheiro:** `src/components/sales/SalePaymentsList.tsx`

1. **Botao global de Fatura (linha ~306):**
   - De: `Emitir Fatura (valor)`
   - Para: `Ver Rascunho de Fatura`
   - Icone: trocar `FileText` por `Eye`

2. **Botao por pagamento (linha ~395):**
   - De: `Gerar Recibo (RC)` / `Fatura-Recibo (FR)`
   - Para: `Ver Rascunho de Recibo` / `Ver Rascunho de FR`
   - Icone: trocar `Receipt` por `Eye`

Nenhuma logica muda -- os botoes ja abrem o `InvoiceDraftModal` onde o utilizador revisa os dados e confirma a emissao. Apenas os labels ficam mais claros.


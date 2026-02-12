

# Corrigir: IVA mostra "M10" em vez do valor

## Problema

No modal de rascunho da fatura (`InvoiceDraftModal`), quando o IVA e 0%, a linha de IVA mostra o codigo de isencao da AT (ex: "M10") em vez do valor formatado "0,00 EUR". O codigo de isencao e informacao tecnica fiscal que nao faz sentido para o utilizador neste contexto.

## Alteracao

**Ficheiro: `src/components/sales/InvoiceDraftModal.tsx`** (linhas 256-266)

Substituir a logica condicional que mostra `exemptionReason` quando o IVA e 0 por simplesmente mostrar o valor formatado (`formatCurrency(0)`), mantendo a indicacao "(Isento)" na label da linha.

Antes:
```
IVA (Isento)          M10
```

Depois:
```
IVA (Isento)          0,00 €
```

Alteracao de apenas uma linha: remover o branch que renderiza `exemptionReason` e usar sempre `formatCurrency(fallbackTax)`.




# Corrigir PaymentTypeSelector (Seletor Único/Parcelado) que não aparece

## Problema

O seletor "Pagamento Total vs Parcelado" usa um componente `Dialog` que está **aninhado dentro** do modal de detalhes da venda (que também é um `Dialog`). Dialogs aninhados no Radix UI causam conflitos de foco e portal -- o seletor abre atrás do modal pai ou fecha imediatamente.

## Solucao

Converter o `PaymentTypeSelector` de `Dialog` para `AlertDialog` (que funciona melhor quando aninhado dentro de outro Dialog), ou em alternativa, substituir por um bloco inline dentro do proprio componente `SalePaymentsList` em vez de abrir um modal separado.

A abordagem mais simples e robusta: substituir o Dialog por AlertDialog no `PaymentTypeSelector.tsx`.

## Detalhes Tecnicos

**Ficheiro:** `src/components/sales/PaymentTypeSelector.tsx`

- Trocar os imports de `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` para `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`
- Manter toda a logica e layout interno identicos
- O `AlertDialog` funciona correctamente quando aninhado dentro de um `Dialog` porque usa um portal separado e nao conflitua com o focus trap do Dialog pai

Nenhum outro ficheiro precisa de ser alterado.


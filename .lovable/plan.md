

# Fix: Modais de Vendas Full-Page nao estao a funcionar

## Problema

O componente `DialogContent` base (em `dialog.tsx`) tem classes CSS hardcoded como `left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-lg grid` que conflitam com as classes full-screen passadas pelos modais de vendas. O `tailwind-merge` nao consegue resolver todos os conflitos (por exemplo, `inset-0` nao anula `left-[50%]` e `top-[50%]` separadamente), resultando no modal a aparecer pequeno e centrado.

## Solucao

Criar uma variante `fullScreen` no componente `DialogContent` que substitui completamente as classes de posicionamento. Isto evita conflitos de merge e mantem o componente base intacto para os outros modais do sistema.

## Alteracoes

### 1. `src/components/ui/dialog.tsx`

Adicionar uma prop `variant` ao `DialogContent` que aceita `"default"` ou `"fullScreen"`. Quando `fullScreen`:
- Usa `inset-0 w-full h-full max-w-none` sem `left-[50%]`, `top-[50%]`, `translate`, `max-w-lg` ou `grid`
- Remove animacoes de zoom/slide centradas
- Mantem o overlay e o botao de fechar

### 2. `src/components/sales/CreateSaleModal.tsx`

Simplificar: trocar as classes longas por `variant="fullScreen"` no `DialogContent`, mantendo apenas as classes adicionais de layout (`flex flex-col p-0 gap-0`).

### 3. `src/components/sales/EditSaleModal.tsx`

Mesma simplificacao: usar `variant="fullScreen"`.

### 4. `src/components/sales/SaleDetailsModal.tsx`

Mesma simplificacao: usar `variant="fullScreen"`.

## Notas tecnicas

- A variante `fullScreen` aplica um conjunto de classes base completamente diferente, eliminando qualquer conflito de `tailwind-merge`
- Os restantes modais do sistema (leads, clientes, propostas, etc.) continuam inalterados pois usam a variante `default` implicita
- Os modais aninhados (AlertDialog, PaymentTypeSelector) nao sao afetados


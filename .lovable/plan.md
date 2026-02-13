
# Importacao Full-Page (Correcao)

## Problema
O importador de contactos usa um `Sheet` (painel lateral) que fica no canto da tela. O plano original pedia full-page mas foi implementado como side-sheet.

## Solucao
Substituir o `Sheet` por um `Dialog` com `variant="fullScreen"` -- que ja existe no projeto e e o mesmo padrao usado nos modais de Vendas e Clientes.

## Alteracoes

### `src/components/marketing/ImportContactsModal.tsx`

1. Trocar os imports de `Sheet/SheetContent/SheetHeader/SheetTitle/SheetDescription` por `Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription`
2. No JSX:
   - `<Sheet>` -> `<Dialog>`
   - `<SheetContent side="right" className="w-full sm:max-w-[700px] ...">` -> `<DialogContent variant="fullScreen">`
   - `<SheetHeader>` -> `<DialogHeader>`
   - `<SheetTitle>` -> `<DialogTitle>`
   - `<SheetDescription>` -> `<DialogDescription>`
3. Manter o layout interno com `ScrollArea` e os 4 passos do stepper -- apenas o contentor exterior muda
4. Dentro do fullScreen, centrar o conteudo com `max-w-3xl mx-auto` para nao ficar esticado em ecras grandes

Apenas 1 ficheiro a editar. Toda a logica de importacao, steps e sub-componentes permanecem iguais.

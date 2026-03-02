

## Correção do scroll na lista de contactos (Email Marketing)

### Problema
Na `CreateCampaignModal.tsx`, a lista de contactos (tab "Lista") usa um `ScrollArea` aninhado dentro de outro `ScrollArea` pai (o container do step 3). O Radix ScrollArea não lida bem com scroll aninhado — o scroll interno é "engolido" pelo pai.

### Solução
Substituir o `ScrollArea` interno (linha 522) por um `div` com `overflow-y-auto` e `max-h-[200px]`. Isto permite scroll nativo no browser que funciona correctamente mesmo dentro de outro ScrollArea.

Mesma correção para o ScrollArea da tab "individual" (linha 516) que pode ter o mesmo problema.

### Ficheiro: `src/components/marketing/CreateCampaignModal.tsx`
- Linha 522: trocar `<ScrollArea className="border rounded-md max-h-[200px]">` por `<div className="border rounded-md max-h-[200px] overflow-y-auto">`
- Fechar com `</div>` em vez de `</ScrollArea>`
- Aplicar o mesmo padrão à lista de clientes individuais se também usar ScrollArea aninhado


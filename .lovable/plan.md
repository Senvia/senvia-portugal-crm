

## Bloquear edição da percentagem de comissão

### Problema
O campo "Comissão (%)" nos produtos do catálogo é editável — um comercial pode alterar a percentagem à vontade.

### Solução
Tornar o campo "Comissão (%)" **read-only** no `CatalogProducts` (dentro de `ServicosSection.tsx`). A percentagem vem do catálogo definido pelo admin e não deve ser alterável pelo utilizador. O valor da comissão em € continua a ser recalculado automaticamente com base no preço × percentagem fixa.

### Alteração

**`src/components/proposals/ServicosSection.tsx`** (linhas 227-244):
- Adicionar `readOnly` ao `<Input>` da comissão (%)
- Adicionar classes visuais de read-only (`bg-muted cursor-not-allowed opacity-70`)
- Remover o `onChange` handler desse input


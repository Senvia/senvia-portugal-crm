

## Corrigir alinhamento dos campos CPE e converter Editar Proposta para Dialog centrado

### Problema 1: Campos desalinhados no CPE
Na imagem, os campos de energia do CPE (Consumo Anual, Duracao, DBL, Margem) e a linha inferior (Comissao, Inicio Contrato, Fim Contrato) nao estao alinhados correctamente. O problema esta no grid layout que usa `grid-cols-2 sm:grid-cols-4` na primeira linha e `grid-cols-2 sm:grid-cols-3` na segunda, causando desalinhamento visual.

### Problema 2: Editar Proposta abre na lateral (Sheet)
O `EditProposalModal` usa `Sheet` (painel lateral), enquanto o `CreateProposalModal` ja usa `Dialog` (centrado). O utilizador prefere que abra centrado, como uma pagina completa.

### Alteracoes

**1. `src/components/proposals/ProposalCpeSelector.tsx`**
- Corrigir grids dos campos de energia nos CPEs adicionados (linhas 233-315):
  - Primeira linha (Consumo, Duracao, DBL, Margem): manter `grid-cols-2 sm:grid-cols-4` mas uniformizar alturas dos inputs
  - Segunda linha (Comissao, Inicio, Fim): usar `grid-cols-3` para alinhar correctamente
- Corrigir grids dos campos do formulario de adicao (linhas 417-498):
  - Mesma logica de alinhamento uniforme
- Garantir que todos os inputs tem a mesma altura (`h-8`) e labels com `text-xs` consistente

**2. `src/components/proposals/EditProposalModal.tsx`**
- Substituir `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle` por `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`
- Usar `DialogContent` com largura maxima generosa (`sm:max-w-2xl` ou `sm:max-w-3xl`) para acomodar os campos
- Manter o `ScrollArea` interno para conteudo longo
- Mover o botao "Guardar" para `DialogFooter`
- Remover imports de Sheet, adicionar imports de Dialog

### Secao Tecnica

**EditProposalModal - de Sheet para Dialog:**
```tsx
// Antes:
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="right" className="w-full sm:max-w-md ...">

// Depois:
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
```

**ProposalCpeSelector - grids uniformes:**
```tsx
// Linha energia: 4 colunas alinhadas
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">

// Linha comissao/datas: 3 colunas alinhadas
<div className="grid grid-cols-3 gap-2">
```

### Ficheiros a editar
- `src/components/proposals/EditProposalModal.tsx` (Sheet -> Dialog)
- `src/components/proposals/ProposalCpeSelector.tsx` (alinhamento grids)


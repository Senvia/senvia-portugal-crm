

## Corrigir scroll nos dropdowns SearchableCombobox

### Problema
O `SearchableCombobox` usa um `Popover` (Radix) dentro de um `Dialog` (Radix). Quando o Dialog é modal, ele captura eventos de pointer/touch/wheel, impedindo o scroll na lista do dropdown. Este problema afeta **todos os modais** que usam `SearchableCombobox` (CreateSaleModal, EditSaleModal, CreateProposalModal, EditProposalModal, CreateEventModal, CreateAutomationModal).

### Solução

**`src/components/ui/searchable-combobox.tsx`** — 2 alterações:

1. Adicionar `modal={true}` ao `Popover` para que ele crie o seu próprio layer modal, permitindo interação correta com scroll
2. Adicionar handlers de eventos no `PopoverContent` para prevenir propagação de scroll/touch para o Dialog pai:

```typescript
<PopoverContent 
  className="w-[--radix-popover-trigger-width] p-0" 
  align="start"
  onWheel={(e) => e.stopPropagation()}
  onTouchMove={(e) => e.stopPropagation()}
>
```

Estas alterações corrigem o scroll em **todas as instâncias** do componente ao longo do projeto, sem necessidade de alterar cada modal individualmente.


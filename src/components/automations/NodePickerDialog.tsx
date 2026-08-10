import { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ACTION_TYPES, CATEGORY_LABELS, NODE_CATEGORY_STYLES, NODE_DEFINITIONS,
} from '@/lib/automation-nodes';
import type { AutomationNodeCategory, AutomationNodeType } from '@/types/automations';

interface NodePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: AutomationNodeType) => void;
}

/** Action node types grouped into the picker's sections. */
const CATEGORY_ORDER: AutomationNodeCategory[] = ['whatsapp', 'email', 'timing', 'logic', 'crm', 'end'];

export function NodePickerDialog({ open, onOpenChange, onSelect }: NodePickerDialogProps) {
  const grouped = useMemo(() => {
    const groups = new Map<AutomationNodeCategory, AutomationNodeType[]>();
    for (const type of ACTION_TYPES) {
      const category = NODE_DEFINITIONS[type].category;
      groups.set(category, [...(groups.get(category) ?? []), type]);
    }
    return CATEGORY_ORDER
      .filter((category) => groups.has(category))
      .map((category) => ({ category, types: groups.get(category) as AutomationNodeType[] }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar passo</DialogTitle>
          <DialogDescription>
            Escolha a ação que a automação deve executar neste ponto do fluxo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-5">
            {grouped.map(({ category, types }) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {types.map((type) => {
                    const definition = NODE_DEFINITIONS[type];
                    const style = NODE_CATEGORY_STYLES[definition.category];
                    const Icon = definition.icon;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onSelect(type);
                          onOpenChange(false);
                        }}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left',
                          'transition-all hover:border-primary/50 hover:shadow-card-hover',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[2.5px]',
                            style.bg,
                            style.ring,
                          )}
                        >
                          <Icon className={cn('h-5 w-5', style.icon)} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">
                            {definition.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {definition.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

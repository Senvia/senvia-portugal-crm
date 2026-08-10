import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { NODE_CATEGORY_STYLES, NODE_DEFINITIONS, TRIGGER_TYPES } from '@/lib/automation-nodes';
import { useCreateAutomationFlow } from '@/hooks/useAutomationFlows';
import type { AutomationTriggerType } from '@/types/automations';

interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFlowDialog({ open, onOpenChange }: CreateFlowDialogProps) {
  const navigate = useNavigate();
  const createFlow = useCreateAutomationFlow();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<AutomationTriggerType>('lead_created');

  const reset = () => {
    setName('');
    setDescription('');
    setTrigger('lead_created');
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const flow = await createFlow.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: trigger,
    });
    reset();
    onOpenChange(false);
    if (flow?.id) navigate(`/automacoes/${flow.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova automação</DialogTitle>
          <DialogDescription>
            Dê um nome ao fluxo e escolha o gatilho que o faz arrancar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="flow-name">Nome</Label>
            <Input
              id="flow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Seguimento de leads novas"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flow-description">Descrição (opcional)</Label>
            <Textarea
              id="flow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que faz esta automação?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Gatilho</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TRIGGER_TYPES.map((type) => {
                const definition = NODE_DEFINITIONS[type];
                const style = NODE_CATEGORY_STYLES.trigger;
                const Icon = definition.icon;
                const selected = trigger === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTrigger(type)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2',
                        style.bg,
                        style.ring,
                      )}
                    >
                      <Icon className={cn('h-4 w-4', style.icon)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-foreground">{definition.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {definition.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createFlow.isPending}>
            {createFlow.isPending ? 'A criar…' : 'Criar automação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

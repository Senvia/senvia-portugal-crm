import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ChevronRight, PencilRuler, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NODE_CATEGORY_STYLES, NODE_DEFINITIONS, TRIGGER_TYPES } from '@/lib/automation-nodes';
import { AUTOMATION_RECIPES, type AutomationRecipe } from '@/lib/automation-recipes';
import { useCreateAutomationFlow } from '@/hooks/useAutomationFlows';
import type { AutomationTriggerType } from '@/types/automations';

interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Stepped wizard: 1) recipe or blank → 2) recipe list / trigger picker →
 * 3) name + description (blank path only). One decision per screen, instead of
 * the old everything-in-one-scroll dialog.
 */
type WizardStep = 'mode' | 'recipes' | 'trigger' | 'details';

const STEP_META: Record<WizardStep, { number: number; total: number; title: string; description: string }> = {
  mode: {
    number: 1,
    total: 3,
    title: 'Nova automação',
    description: 'Como quer começar?',
  },
  recipes: {
    number: 2,
    total: 2,
    title: 'Escolher receita',
    description: 'Fluxos completos e prontos a usar — depois é só ajustar os textos.',
  },
  trigger: {
    number: 2,
    total: 3,
    title: 'Escolher gatilho',
    description: 'O que faz esta automação arrancar?',
  },
  details: {
    number: 3,
    total: 3,
    title: 'Dar um nome',
    description: 'Como se vai chamar esta automação?',
  },
};

export function CreateFlowDialog({ open, onOpenChange }: CreateFlowDialogProps) {
  const navigate = useNavigate();
  const createFlow = useCreateAutomationFlow();

  const [step, setStep] = useState<WizardStep>('mode');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<AutomationTriggerType>('lead_created');
  // Tracks the auto-suggested name so a user edit is never overwritten.
  const [suggestedName, setSuggestedName] = useState('');

  const reset = () => {
    setStep('mode');
    setName('');
    setDescription('');
    setTrigger('lead_created');
    setSuggestedName('');
  };

  const goToDetails = () => {
    const suggestion = `Fluxo: ${NODE_DEFINITIONS[trigger].label}`;
    // Prefill (or refresh) the suggestion unless the user typed a name.
    if (!name.trim() || name === suggestedName) {
      setName(suggestion);
      setSuggestedName(suggestion);
    }
    setStep('details');
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

  // A recipe arrives with its whole graph already built, so it lands straight
  // in the editor as a draft with the texts ready to edit.
  const handleCreateFromRecipe = async (recipe: AutomationRecipe) => {
    const flow = await createFlow.mutateAsync({
      name: recipe.name,
      description: recipe.editHint,
      trigger_type: recipe.trigger_type,
      trigger_config: recipe.trigger_config,
      graph: recipe.graph,
      entry_node_id: recipe.entry_node_id,
    });
    reset();
    onOpenChange(false);
    if (flow?.id) navigate(`/automacoes/${flow.id}`);
  };

  const meta = STEP_META[step];

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-6">
            {meta.title}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {meta.number}/{meta.total}
            </span>
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        {/* Fixed minimum height so the dialog doesn't jump between steps. */}
        <div className="min-h-[380px] flex-1 overflow-y-auto pr-1">
          {step === 'mode' && (
            <div className="grid gap-3 pt-1">
              <ModeCard
                icon={Sparkles}
                title="Usar receita pronta"
                badge="Recomendado"
                description="Fluxos completos para os casos mais comuns. Escolhe um, ajustas os textos e ativas."
                onClick={() => setStep('recipes')}
              />
              <ModeCard
                icon={PencilRuler}
                title="Começar do zero"
                description="Escolhes o gatilho e montas o fluxo passo a passo, à tua maneira."
                onClick={() => setStep('trigger')}
              />
            </div>
          )}

          {step === 'recipes' && (
            <div className="grid gap-2 pt-1">
              {AUTOMATION_RECIPES.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => handleCreateFromRecipe(recipe)}
                  disabled={createFlow.isPending}
                  className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{recipe.name}</span>
                    {recipe.conversational && (
                      <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                        Conversa
                      </span>
                    )}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{recipe.summary}</span>
                  <span className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    {recipe.outline.map((outlineStep, i) => (
                      <span key={outlineStep} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="h-2.5 w-2.5" />}
                        <span className="rounded bg-muted px-1.5 py-0.5">{outlineStep}</span>
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 'trigger' && (
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
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
          )}

          {step === 'details' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="flow-name">Nome</Label>
                <Input
                  id="flow-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Seguimento de leads novas"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="flow-description">Descrição (opcional)</Label>
                <Textarea
                  id="flow-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que faz esta automação?"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step !== 'mode' && (
              <Button
                variant="ghost"
                onClick={() => setStep(step === 'details' ? 'trigger' : 'mode')}
                disabled={createFlow.isPending}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 'mode' && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            )}
            {step === 'trigger' && (
              <Button onClick={goToDetails}>
                Continuar
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 'details' && (
              <Button onClick={handleCreate} disabled={!name.trim() || createFlow.isPending}>
                {createFlow.isPending ? 'A criar…' : 'Criar automação'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  icon: Icon, title, description, badge, onClick,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 text-left',
        'transition-all hover:border-primary/50 hover:shadow-md',
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-[22px] w-[22px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}

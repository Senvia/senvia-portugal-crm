import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Copy, MoreVertical, Pause, Play, Plus, Trash2, Workflow, Zap,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import { NODE_CATEGORY_STYLES, getNodeDefinition } from '@/lib/automation-nodes';
import { FlowStatusPill } from '@/components/automations/FlowStatusPill';
import { CreateFlowDialog } from '@/components/automations/CreateFlowDialog';
import {
  useAutomationFlows, useAutomationRunCounts, useDeleteAutomationFlow,
  useDuplicateAutomationFlow, useSetAutomationFlowStatus,
} from '@/hooks/useAutomationFlows';
import type { AutomationFlow } from '@/types/automations';

export default function Automations() {
  const { data: flows, isLoading } = useAutomationFlows();
  const { data: runCounts } = useAutomationRunCounts();
  const duplicateFlow = useDuplicateAutomationFlow();
  const deleteFlow = useDeleteAutomationFlow();
  const setStatus = useSetAutomationFlowStatus();

  const [createOpen, setCreateOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<AutomationFlow | null>(null);

  return (
    <div className="space-y-6 p-4 pb-nav-safe md:p-6 md:pb-6">
      <PageHeader
        icon={Workflow}
        title="Automações"
        subtitle="Fluxos automáticos de WhatsApp, email e ações no CRM"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova automação
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, index) => <Skeleton key={index} className="h-44 rounded-2xl" />)}
        </div>
      ) : !flows?.length ? (
        <EmptyState
          icon={Zap}
          title="Ainda não tem automações"
          description="Crie um fluxo para responder a leads no WhatsApp, enviar emails de seguimento ou mover etapas sem intervenção manual."
        >
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira automação
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              counts={runCounts?.[flow.id]}
              onDuplicate={() => duplicateFlow.mutate(flow.id)}
              onDelete={() => setFlowToDelete(flow)}
              onToggleStatus={() =>
                setStatus.mutate({
                  id: flow.id,
                  status: flow.status === 'active' ? 'paused' : 'active',
                  version: flow.version,
                })
              }
            />
          ))}
        </div>
      )}

      <CreateFlowDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={!!flowToDelete} onOpenChange={(open) => !open && setFlowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar automação?</AlertDialogTitle>
            <AlertDialogDescription>
              A automação <strong>{flowToDelete?.name}</strong> e o respetivo histórico de execuções
              serão eliminados. Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (flowToDelete) deleteFlow.mutate(flowToDelete.id);
                setFlowToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FlowCardProps {
  flow: AutomationFlow;
  counts?: { active: number; failed: number; completed: number; total: number };
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

function FlowCard({ flow, counts, onDuplicate, onDelete, onToggleStatus }: FlowCardProps) {
  const triggerDefinition = getNodeDefinition(flow.trigger_type ?? '');
  const TriggerIcon = triggerDefinition?.icon ?? Zap;
  const triggerStyle = NODE_CATEGORY_STYLES.trigger;
  const stepCount = flow.graph?.nodes?.length ?? 0;
  const isActive = flow.status === 'active';

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <Link to={`/automacoes/${flow.id}`} className="flex-1 p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[2.5px]',
              triggerStyle.bg,
              triggerStyle.ring,
            )}
          >
            <TriggerIcon className={cn('h-5 w-5', triggerStyle.icon)} />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-foreground">{flow.name}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {triggerDefinition?.label ?? 'Sem gatilho'}
            </p>
          </div>

          <FlowStatusPill status={flow.status} />
        </div>

        {flow.description && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {flow.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <strong className="font-semibold text-foreground tabular-nums">{stepCount}</strong>{' '}
            {stepCount === 1 ? 'passo' : 'passos'}
          </span>
          <span>
            <strong className="font-semibold text-primary tabular-nums">{counts?.active ?? 0}</strong>{' '}
            em curso
          </span>
          {(counts?.failed ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {counts?.failed} {counts?.failed === 1 ? 'falha' : 'falhas'}
            </span>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
        <span className="truncate text-[11px] text-muted-foreground">
          {flow.updated_at ? `Editada ${formatRelativeTime(flow.updated_at)}` : ''}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 text-xs', isActive ? 'text-warning' : 'text-success')}
            onClick={onToggleStatus}
          >
            {isActive ? (
              <><Pause className="mr-1 h-3.5 w-3.5" /> Pausar</>
            ) : (
              <><Play className="mr-1 h-3.5 w-3.5" /> Ativar</>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

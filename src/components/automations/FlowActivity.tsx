import { useState } from 'react';
import {
  AlertCircle, Ban, CheckCircle2, ChevronDown, ChevronRight, Clock,
  Loader2, MessagesSquare, Activity as ActivityIcon, SkipForward,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { getNodeLabel } from '@/lib/automation-nodes';
import { findNode } from '@/lib/automation-graph';
import { useAutomationRunSteps, useCancelAutomationRun, useAutomationRuns } from '@/hooks/useAutomationFlows';
import type {
  AutomationGraph, AutomationRun, AutomationRunStatus, AutomationRunStepStatus,
} from '@/types/automations';

const RUN_STATUS_META: Record<AutomationRunStatus, { label: string; className: string; icon: typeof Clock }> = {
  running: { label: 'A correr', className: 'bg-primary/10 text-primary', icon: Loader2 },
  waiting: { label: 'Em espera', className: 'bg-warning/10 text-warning', icon: Clock },
  awaiting_reply: {
    label: 'Aguarda resposta',
    className: 'bg-kanban-conversation/10 text-kanban-conversation',
    icon: MessagesSquare,
  },
  completed: { label: 'Concluída', className: 'bg-success/10 text-success', icon: CheckCircle2 },
  failed: { label: 'Falhou', className: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelada', className: 'bg-muted text-muted-foreground', icon: Ban },
};

const STEP_STATUS_META: Record<AutomationRunStepStatus, { label: string; className: string; dot: string; icon: typeof Clock }> = {
  ok: { label: 'OK', className: 'text-success', dot: 'bg-success', icon: CheckCircle2 },
  skipped: { label: 'Ignorado', className: 'text-muted-foreground', dot: 'bg-muted-foreground', icon: SkipForward },
  failed: { label: 'Falhou', className: 'text-destructive', dot: 'bg-destructive', icon: AlertCircle },
  waiting: { label: 'Em espera', className: 'text-warning', dot: 'bg-warning', icon: Clock },
};

const ACTIVE_STATUSES: AutomationRunStatus[] = ['running', 'waiting', 'awaiting_reply'];

export function RunStatusPill({ status }: { status: AutomationRunStatus }) {
  const meta = RUN_STATUS_META[status] ?? RUN_STATUS_META.running;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        meta.className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', status === 'running' && 'animate-spin')} />
      {meta.label}
    </span>
  );
}

interface FlowActivityProps {
  flowId: string;
  graph: AutomationGraph;
}

/** Recent runs of this flow, with a per-run step timeline. */
export function FlowActivity({ flowId, graph }: FlowActivityProps) {
  const { data: runs, isLoading } = useAutomationRuns(flowId);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!runs?.length) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="Ainda sem execuções"
        description="Quando esta automação for ativada e um contacto entrar no fluxo, as execuções aparecem aqui."
      />
    );
  }

  const failedCount = runs.filter((run) => run.status === 'failed').length;
  const activeCount = runs.filter((run) => ACTIVE_STATUSES.includes(run.status)).length;
  const completedCount = runs.filter((run) => run.status === 'completed').length;

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Em curso" value={activeCount} className="text-primary" />
        <StatCard label="Concluídas" value={completedCount} className="text-success" />
        <StatCard
          label="Falhadas"
          value={failedCount}
          className={failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}
          highlight={failedCount > 0}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Passo atual</TableHead>
                <TableHead>Início</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  graph={graph}
                  expanded={expandedRunId === run.id}
                  onToggle={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, className, highlight,
}: {
  label: string;
  value: number;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-3',
        highlight ? 'border-destructive/40 bg-destructive/5' : 'border-border',
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', className)}>{value}</p>
    </div>
  );
}

function RunRow({
  run, graph, expanded, onToggle,
}: {
  run: AutomationRun;
  graph: AutomationGraph;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cancelRun = useCancelAutomationRun();
  const failed = run.status === 'failed';
  const currentNode = findNode(graph, run.current_node_id);
  const canCancel = ACTIVE_STATUSES.includes(run.status);

  return (
    <>
      <TableRow
        onClick={onToggle}
        className={cn(
          'cursor-pointer',
          // Failures must be impossible to miss when scanning the table.
          failed && 'bg-destructive/5 hover:bg-destructive/10',
        )}
      >
        <TableCell className={cn('relative', failed && 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-destructive')}>
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </TableCell>

        <TableCell>
          <p className="text-sm font-medium text-foreground">
            {run.contact_name || run.contact_phone || run.contact_email || 'Contacto sem nome'}
          </p>
          {(run.contact_phone || run.contact_email) && run.contact_name && (
            <p className="text-xs text-muted-foreground">{run.contact_phone || run.contact_email}</p>
          )}
        </TableCell>

        <TableCell>
          <RunStatusPill status={run.status} />
          {failed && run.last_error && (
            <p className="mt-1 max-w-[280px] truncate text-xs font-medium text-destructive" title={run.last_error}>
              {run.last_error}
            </p>
          )}
        </TableCell>

        <TableCell>
          <span className="text-sm text-muted-foreground">
            {currentNode ? getNodeLabel(currentNode.type) : run.current_node_id ? '—' : 'Terminado'}
          </span>
          {run.wake_at && ACTIVE_STATUSES.includes(run.status) && (
            <p className="text-xs text-muted-foreground">Retoma {formatDateTime(run.wake_at)}</p>
          )}
        </TableCell>

        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
          {run.started_at ? formatDateTime(run.started_at) : '—'}
        </TableCell>

        <TableCell className="text-right">
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              disabled={cancelRun.isPending}
              onClick={(event) => {
                event.stopPropagation();
                cancelRun.mutate(run.id);
              }}
            >
              Cancelar
            </Button>
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="bg-muted/30 p-0">
            <RunStepsTimeline run={run} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function RunStepsTimeline({ run }: { run: AutomationRun }) {
  const { data: steps, isLoading } = useAutomationRunSteps(run.id);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(3)].map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-4">
      {run.last_error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-destructive">Último erro</p>
            <p className="mt-0.5 break-words text-xs text-destructive/90">{run.last_error}</p>
          </div>
        </div>
      )}

      {!steps?.length ? (
        <p className="text-xs text-muted-foreground">Sem passos registados para esta execução.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-5">
          {steps.map((step) => {
            const meta = STEP_STATUS_META[step.status] ?? STEP_STATUS_META.ok;
            const StepIcon = meta.icon;
            const detail = step.detail && Object.keys(step.detail).length ? step.detail : null;

            return (
              <li key={step.id} className="relative">
                <span className={cn('absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background', meta.dot)} />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <StepIcon className={cn('h-3.5 w-3.5 shrink-0', meta.className)} />
                  <span className="text-xs font-semibold text-foreground">
                    {step.node_type ? getNodeLabel(step.node_type) : 'Passo'}
                  </span>
                  <span className={cn('text-[11px] font-medium', meta.className)}>{meta.label}</span>
                  <span className="text-[11px] text-muted-foreground">{formatDateTime(step.created_at)}</span>
                </div>
                {detail && (
                  <pre
                    className={cn(
                      'mt-1 max-h-32 overflow-auto rounded-md border p-2 text-[11px] leading-snug',
                      step.status === 'failed'
                        ? 'border-destructive/30 bg-destructive/5 text-destructive'
                        : 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {JSON.stringify(detail, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

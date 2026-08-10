import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { AlertTriangle, HelpCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getNodeDefinition, getNodeStyle, getNodeSubtitle, humanizeNodeType,
  type NodeCategoryStyle,
} from '@/lib/automation-nodes';
import { GHOST_BOX_HEIGHT, NODE_BOX_HEIGHT, NODE_BOX_WIDTH } from '@/lib/automation-graph';
import type { AutomationGraphNode, AutomationNodeStats } from '@/types/automations';

/**
 * Unknown node types (e.g. written by a newer engine) must still render as a
 * proper circle — a distinct slate ring with a help icon, never an empty disc.
 * Slate is theme-neutral, matching how the email category uses sky directly.
 */
const UNKNOWN_NODE_STYLE: NodeCategoryStyle = {
  ring: 'ring-slate-400',
  bg: 'bg-slate-400/10',
  icon: 'text-slate-500 dark:text-slate-400',
  chip: 'bg-slate-400/10 text-slate-500 dark:text-slate-400',
  stroke: 'hsl(var(--muted-foreground) / 0.5)',
};

// Circle geometry — handles are pinned to the circle's edge rather than the
// bounding box, so edges meet the node exactly where it is drawn. The explicit
// transform overrides React Flow's per-side default (which offsets right-hand
// handles the other way) and makes both sides land on the exact coordinate.
const CIRCLE = 66;
const CIRCLE_LEFT = (NODE_BOX_WIDTH - CIRCLE) / 2;
const CIRCLE_MID_Y = CIRCLE / 2;
const HANDLE_CLASS = '!h-2 !w-2 !min-h-0 !min-w-0 !border-0 !bg-transparent';
/** Ghost button size — kept in step with GHOST_BOX_* so dagre centres it truly. */
const GHOST_BUTTON = GHOST_BOX_HEIGHT;
const centreOn = (x: number, y: number) => ({
  left: x,
  top: y,
  right: 'auto' as const,
  transform: 'translate(-50%, -50%)',
});

export interface AutomationNodeData extends Record<string, unknown> {
  graphNode: AutomationGraphNode;
  step: number;
  hasIssue: boolean;
  /** Run counters for this step. Only drawn when `showStats` is set. */
  stats?: AutomationNodeStats;
  /** False for a flow that has never run — the canvas stays clean. */
  showStats?: boolean;
}

export type AutomationFlowNodeType = Node<AutomationNodeData, 'automation'>;

/**
 * A Make-style step: a colour-ringed circle with the node icon, a numbered
 * badge, and the title + one-line summary underneath.
 */
export const AutomationFlowNode = memo(({ data, selected }: NodeProps<AutomationFlowNodeType>) => {
  const { graphNode, step, hasIssue, stats, showStats } = data;
  const definition = getNodeDefinition(graphNode.type);
  // Defensive: an unknown type still gets a styled circle, an icon and a
  // readable label — never an empty grey disc labelled "trial_expired".
  const style = definition ? getNodeStyle(graphNode.type) : UNKNOWN_NODE_STYLE;
  const Icon = definition?.icon ?? HelpCircle;
  const subtitle = getNodeSubtitle(graphNode);
  const isTrigger = definition?.isTrigger;

  return (
    <div
      className="group relative flex cursor-pointer flex-col items-center"
      style={{ width: NODE_BOX_WIDTH, height: NODE_BOX_HEIGHT }}
    >
      {/* Triggers have no inbound edge. */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className={HANDLE_CLASS}
          style={centreOn(CIRCLE_LEFT, CIRCLE_MID_Y)}
        />
      )}

      <div className="relative" style={{ width: CIRCLE, height: CIRCLE }}>
        {/* Opaque card base keeps the tint consistent over the dotted canvas. */}
        <div
          className={cn(
            'flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-card ring-[2.5px] transition-all duration-150',
            style.ring,
            selected
              ? 'shadow-card-hover ring-offset-2 ring-offset-background'
              : 'shadow-card group-hover:ring-offset-2 group-hover:ring-offset-background',
          )}
        >
          <div className={cn('flex h-full w-full items-center justify-center rounded-full', style.bg)}>
            <Icon className={cn('h-7 w-7', style.icon)} />
          </div>
        </div>

        {/* Step number */}
        <span
          className={cn(
            'absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1',
            'border border-border bg-card text-[10px] font-bold tabular-nums text-muted-foreground shadow-sm',
          )}
        >
          {step}
        </span>

        {/* Incomplete config warning */}
        {hasIssue && (
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-warning text-warning-foreground shadow-sm"
            title="Configuração incompleta"
          >
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}

        {showStats && stats && <NodeStatsBadges stats={stats} />}
      </div>

      <div className="mt-2 w-full px-2 text-center">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {definition?.label ?? humanizeNodeType(graphNode.type)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {graphNode.type !== 'end' && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          className={HANDLE_CLASS}
          style={centreOn(CIRCLE_LEFT + CIRCLE, CIRCLE_MID_Y)}
        />
      )}
    </div>
  );
});

AutomationFlowNode.displayName = 'AutomationFlowNode';

/**
 * Run counters hanging off the bottom-right of the disc: how many contacts
 * cleared this step, how many are parked on it, how many failed. Absolutely
 * positioned inside the circle wrapper, so the node's box and hit area are
 * untouched.
 */
function NodeStatsBadges({ stats }: { stats: AutomationNodeStats }) {
  const parts = [`${stats.passed} ${stats.passed === 1 ? 'passou' : 'passaram'}`];
  if (stats.waiting > 0) parts.push(`${stats.waiting} à espera`);
  if (stats.failed > 0) parts.push(`${stats.failed} ${stats.failed === 1 ? 'falhou' : 'falharam'}`);
  const summary = parts.join(' · ');

  return (
    <span
      className="absolute -bottom-1 -right-1 flex items-center gap-0.5"
      title={summary}
      aria-label={summary}
    >
      <StatChip className="border-border bg-card text-muted-foreground">{stats.passed}</StatChip>
      {stats.waiting > 0 && (
        <StatChip className="border-background bg-warning text-warning-foreground">
          {stats.waiting}
        </StatChip>
      )}
      {stats.failed > 0 && (
        <StatChip className="border-background bg-destructive text-destructive-foreground">
          {stats.failed}
        </StatChip>
      )}
    </span>
  );
}

function StatChip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex h-4 min-w-4 items-center justify-center rounded-full border px-1',
        'text-[10px] font-bold leading-none tabular-nums shadow-sm',
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Ghost "add step" node ───────────────────────────────────────────────────

export interface GhostNodeData extends Record<string, unknown> {
  sourceId: string;
  branch: string | null;
  branchLabel: string | null;
  onAdd: (sourceId: string, branch: string | null) => void;
}

export type GhostFlowNodeType = Node<GhostNodeData, 'ghost'>;

/** The dashed "+" that terminates every open branch. */
export const GhostFlowNode = memo(({ data }: NodeProps<GhostFlowNodeType>) => (
  <div className="relative flex flex-col items-center">
    <Handle
      type="target"
      position={Position.Left}
      isConnectable={false}
      className={HANDLE_CLASS}
      style={centreOn(0, GHOST_BUTTON / 2)}
    />
    <button
      type="button"
      onClick={() => data.onAdd(data.sourceId, data.branch)}
      title="Adicionar passo"
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-border bg-card',
        'text-muted-foreground transition-all hover:border-primary hover:text-primary hover:shadow-card-hover',
      )}
    >
      <Plus className="h-5 w-5" />
    </button>
  </div>
));

GhostFlowNode.displayName = 'GhostFlowNode';

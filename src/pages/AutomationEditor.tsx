import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowLeft, Loader2, Pause, Play, Save, SlidersHorizontal, Workflow,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

import { AutomationCanvas } from '@/components/automations/AutomationCanvas';
import { NodeInspector } from '@/components/automations/NodeInspector';
import { NodePickerDialog } from '@/components/automations/NodePickerDialog';
import { FlowActivity } from '@/components/automations/FlowActivity';
import { FlowStatusPill } from '@/components/automations/FlowStatusPill';
import { FlowSettings } from '@/components/automations/FlowSettings';

import {
  appendNode, findNode, insertNodeOnEdge, pruneOrphanBranches, removeNode,
  updateNodeConfig, validateGraph,
} from '@/lib/automation-graph';
import {
  useAutomationFlow, useSetAutomationFlowStatus, useUpdateAutomationFlow,
} from '@/hooks/useAutomationFlows';
import type {
  AutomationGraph, AutomationNodeConfig, AutomationNodeType,
} from '@/types/automations';

type PickerTarget =
  | { kind: 'append'; sourceId: string; branch: string | null }
  | { kind: 'insert'; edgeId: string }
  | null;

export default function AutomationEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: flow, isLoading } = useAutomationFlow(id ?? null);
  const updateFlow = useUpdateAutomationFlow();
  const setStatus = useSetAutomationFlowStatus();

  const [graph, setGraph] = useState<AutomationGraph>({ nodes: [], edges: [] });
  const [name, setName] = useState('');
  const [dirty, setDirty] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [tab, setTab] = useState<'canvas' | 'activity' | 'settings'>('canvas');

  // Hydrate local editing state once per flow. The ref guard means a background
  // refetch can never clobber edits the user has not saved yet.
  const hydratedFlowId = useRef<string | null>(null);
  useEffect(() => {
    if (!flow || hydratedFlowId.current === flow.id) return;
    hydratedFlowId.current = flow.id;
    setGraph(flow.graph);
    setName(flow.name);
    setDirty(false);
    setSelectedNodeId(null);
  }, [flow]);

  const issues = useMemo(
    () => validateGraph(graph, flow?.entry_node_id ?? null),
    [graph, flow?.entry_node_id],
  );

  const selectedNode = findNode(graph, selectedNodeId);

  const mutateGraph = useCallback((next: AutomationGraph) => {
    setGraph(next);
    setDirty(true);
  }, []);

  const handleAddAfter = useCallback((sourceId: string, branch: string | null) => {
    setPickerTarget({ kind: 'append', sourceId, branch });
  }, []);

  const handleInsertOnEdge = useCallback((edgeId: string) => {
    setPickerTarget({ kind: 'insert', edgeId });
  }, []);

  const handlePickNodeType = (type: AutomationNodeType) => {
    if (!pickerTarget) return;

    const result = pickerTarget.kind === 'append'
      ? appendNode(graph, pickerTarget.sourceId, pickerTarget.branch, type)
      : insertNodeOnEdge(graph, pickerTarget.edgeId, type);

    mutateGraph(result.graph);
    // Open the new node's config straight away — it always needs filling in.
    if (result.node) setSelectedNodeId(result.node.id);
    setPickerTarget(null);
  };

  const handleConfigChange = (config: AutomationNodeConfig) => {
    if (!selectedNodeId) return;
    // Editing wait_reply rules can orphan branch edges — prune them in the same pass.
    mutateGraph(pruneOrphanBranches(updateNodeConfig(graph, selectedNodeId, config)));
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    mutateGraph(removeNode(graph, selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleSave = async () => {
    if (!flow) return;
    await updateFlow.mutateAsync({
      id: flow.id,
      name: name.trim() || flow.name,
      graph,
      entry_node_id: flow.entry_node_id,
    });
    setDirty(false);
    toast.success('Automação guardada');
  };

  const handleToggleStatus = async () => {
    if (!flow) return;
    const nextStatus = flow.status === 'active' ? 'paused' : 'active';

    if (nextStatus === 'active' && issues.length) {
      toast.error('Não é possível ativar', { description: issues[0].message });
      return;
    }
    // Never activate a graph that differs from what is stored.
    if (dirty) await handleSave();
    setStatus.mutate({ id: flow.id, status: nextStatus, version: flow.version });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[60vh] w-full rounded-2xl" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={Workflow}
          title="Automação não encontrada"
          description="O fluxo que procura foi eliminado ou não pertence a esta organização."
        >
          <Button asChild variant="outline">
            <Link to="/automacoes">Voltar às automações</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  const isActive = flow.status === 'active';
  const isBusy = updateFlow.isPending || setStatus.isPending;

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[520px] flex-col overflow-hidden md:h-dvh">
      {/* Toolbar */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2.5 md:px-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Link to="/automacoes" title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          className="h-8 w-40 border-transparent bg-transparent px-2 text-sm font-semibold shadow-none hover:border-border focus-visible:border-border sm:w-64"
          placeholder="Nome da automação"
        />

        <FlowStatusPill status={flow.status} />

        {dirty && (
          <span className="text-xs font-medium text-muted-foreground">Alterações por guardar</span>
        )}

        {issues.length > 0 && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium text-warning"
            title={issues.map((issue) => issue.message).join('\n')}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {issues.length} {issues.length === 1 ? 'aviso' : 'avisos'}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!dirty || isBusy}>
            {updateFlow.isPending
              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Guardar
          </Button>

          <Button
            size="sm"
            variant={isActive ? 'outline' : 'default'}
            onClick={handleToggleStatus}
            disabled={isBusy}
            className={cn(isActive && 'text-warning')}
          >
            {isActive ? (
              <><Pause className="mr-1.5 h-3.5 w-3.5" /> Pausar</>
            ) : (
              <><Play className="mr-1.5 h-3.5 w-3.5" /> Ativar</>
            )}
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-card px-3 md:px-4">
        <TabButton active={tab === 'canvas'} onClick={() => setTab('canvas')} icon={Workflow}>
          Fluxo
        </TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={Activity}>
          Atividade
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={SlidersHorizontal}>
          Definições
        </TabButton>
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1">
        {tab === 'canvas' ? (
          <>
            <AutomationCanvas
              graph={graph}
              entryNodeId={flow.entry_node_id}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onAddAfter={handleAddAfter}
              onInsertOnEdge={handleInsertOnEdge}
            />

            {selectedNode && (
              <NodeInspector
                node={selectedNode}
                isEntry={selectedNode.id === flow.entry_node_id}
                onChange={handleConfigChange}
                onDelete={handleDeleteNode}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </>
        ) : tab === 'activity' ? (
          <div className="h-full overflow-y-auto">
            <FlowActivity flowId={flow.id} graph={graph} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <FlowSettings
              flow={flow}
              isSaving={isBusy}
              onSave={(patch) => updateFlow.mutate({ id: flow.id, ...patch })}
            />
          </div>
        )}
      </div>

      <NodePickerDialog
        open={!!pickerTarget}
        onOpenChange={(open) => !open && setPickerTarget(null)}
        onSelect={handlePickNodeType}
      />
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Workflow;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

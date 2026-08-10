import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { createInitialGraph, normalizeGraph } from '@/lib/automation-graph';
import type {
  AutomationFlow, AutomationFlowRunCounts, AutomationFlowStatus, AutomationGraph,
  AutomationNodeConfig, AutomationReentryPolicy, AutomationRun, AutomationRunStep,
  AutomationTriggerType, QuietHours,
} from '@/types/automations';

// The automation tables post-date the generated Supabase types, so table names
// are cast — same pattern as `useLeadIntakeWebhooks` / `useContactLists`.
const FLOWS = 'automation_flows';
const RUNS = 'automation_runs';
const RUN_STEPS = 'automation_run_steps';

interface CreateAutomationFlowData {
  name: string;
  description?: string;
  trigger_type: AutomationTriggerType;
  trigger_config?: AutomationNodeConfig;
  /**
   * Pre-built graph, used when starting from a recipe. Omitted for a blank
   * flow, which starts as its trigger node alone.
   */
  graph?: AutomationGraph;
  entry_node_id?: string;
}

interface UpdateAutomationFlowData {
  id: string;
  name?: string;
  description?: string | null;
  status?: AutomationFlowStatus;
  trigger_type?: AutomationTriggerType | null;
  trigger_config?: AutomationNodeConfig;
  graph?: AutomationGraph;
  entry_node_id?: string | null;
  reentry_policy?: AutomationReentryPolicy;
  quiet_hours?: QuietHours | null;
  max_steps_per_run?: number | null;
}

function hydrateFlow(row: Record<string, unknown>): AutomationFlow {
  return {
    ...(row as unknown as AutomationFlow),
    graph: normalizeGraph(row.graph),
    trigger_config: (row.trigger_config as AutomationNodeConfig) ?? {},
  };
}

// ── Flows ───────────────────────────────────────────────────────────────────

export function useAutomationFlows() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['automation-flows', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from(FLOWS)
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return ((data || []) as unknown as Record<string, unknown>[]).map(hydrateFlow);
    },
    enabled: !!organizationId,
  });
}

export function useAutomationFlow(id: string | null) {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['automation-flow', id],
    queryFn: async () => {
      if (!id || !organizationId) return null;

      const { data, error } = await supabase
        .from(FLOWS)
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      return hydrateFlow(data as unknown as Record<string, unknown>);
    },
    enabled: !!id && !!organizationId,
  });
}

export function useCreateAutomationFlow() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAutomationFlowData) => {
      if (!organization?.id) throw new Error('Sem organização');

      // A blank flow starts as its trigger node alone; a recipe arrives with
      // its whole graph already built.
      const initial = createInitialGraph(data.trigger_type);
      const graph = data.graph ?? initial.graph;
      const entryNodeId = data.entry_node_id ?? initial.entryNodeId;

      const { data: flow, error } = await supabase
        .from(FLOWS)
        .insert({
          organization_id: organization.id,
          name: data.name,
          description: data.description ?? null,
          status: 'draft',
          trigger_type: data.trigger_type,
          // The graph document is richer than the generated Json type can
          // express structurally — cast at the boundary, as the rest of the
          // file does for table names.
          trigger_config: (data.trigger_config ?? {}) as unknown as Json,
          graph: graph as unknown as Json,
          entry_node_id: entryNodeId,
          version: 1,
          reentry_policy: 'once',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return hydrateFlow(flow as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Automação criada');
    },
    onError: (error) => {
      console.error('Error creating automation flow:', error);
      toast.error('Erro ao criar automação');
    },
  });
}

export function useUpdateAutomationFlow() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAutomationFlowData) => {
      if (!organization?.id) throw new Error('Sem organização');

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.trigger_type !== undefined) updateData.trigger_type = data.trigger_type;
      if (data.trigger_config !== undefined) updateData.trigger_config = data.trigger_config;
      if (data.graph !== undefined) updateData.graph = data.graph;
      if (data.entry_node_id !== undefined) updateData.entry_node_id = data.entry_node_id;
      if (data.reentry_policy !== undefined) updateData.reentry_policy = data.reentry_policy;
      if (data.quiet_hours !== undefined) updateData.quiet_hours = data.quiet_hours;
      if (data.max_steps_per_run !== undefined) updateData.max_steps_per_run = data.max_steps_per_run;

      const { data: flow, error } = await supabase
        .from(FLOWS)
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) throw error;
      return hydrateFlow(flow as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-flow'] });
    },
    onError: (error) => {
      console.error('Error updating automation flow:', error);
      toast.error('Erro ao guardar automação');
    },
  });
}

/**
 * Status changes bump `version` when activating, so runs already in flight stay
 * pinned to the graph they started on.
 */
export function useSetAutomationFlowStatus() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      version,
    }: {
      id: string;
      status: AutomationFlowStatus;
      version?: number;
    }) => {
      if (!organization?.id) throw new Error('Sem organização');

      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === 'active' && typeof version === 'number') {
        updateData.version = version + 1;
      }

      const { error } = await supabase
        .from(FLOWS)
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-flow'] });
      if (status === 'active') toast.success('Automação ativada');
      else if (status === 'paused') toast.success('Automação em pausa');
      else toast.success('Automação guardada como rascunho');
    },
    onError: (error) => {
      console.error('Error changing automation status:', error);
      toast.error('Erro ao alterar o estado da automação');
    },
  });
}

export function useDeleteAutomationFlow() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) throw new Error('Sem organização');

      const { error } = await supabase
        .from(FLOWS)
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Automação eliminada');
    },
    onError: (error) => {
      console.error('Error deleting automation flow:', error);
      toast.error('Erro ao eliminar automação');
    },
  });
}

export function useDuplicateAutomationFlow() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string) => {
      if (!organization?.id) throw new Error('Sem organização');

      const { data: original, error: fetchError } = await supabase
        .from(FLOWS)
        .select('*')
        .eq('id', flowId)
        .eq('organization_id', organization.id)
        .single();

      if (fetchError) throw fetchError;

      const source = hydrateFlow(original as unknown as Record<string, unknown>);

      const { data: duplicate, error: createError } = await supabase
        .from(FLOWS)
        .insert({
          organization_id: organization.id,
          name: `${source.name} (cópia)`,
          description: source.description ?? null,
          // A copy is never live.
          status: 'draft',
          trigger_type: source.trigger_type,
          trigger_config: source.trigger_config as unknown as Json,
          graph: source.graph as unknown as Json,
          entry_node_id: source.entry_node_id ?? null,
          version: 1,
          reentry_policy: source.reentry_policy ?? 'once',
          quiet_hours: (source.quiet_hours ?? null) as unknown as Json,
          max_steps_per_run: source.max_steps_per_run ?? null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;
      return hydrateFlow(duplicate as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Automação duplicada');
    },
    onError: (error) => {
      console.error('Error duplicating automation flow:', error);
      toast.error('Erro ao duplicar automação');
    },
  });
}

// ── Runs (read-only: the engine owns these tables) ──────────────────────────

const ACTIVE_RUN_STATUSES = ['running', 'waiting', 'awaiting_reply'];

/** Per-flow run counters for the list page. */
export function useAutomationRunCounts() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['automation-run-counts', organizationId],
    queryFn: async () => {
      if (!organizationId) return {} as Record<string, AutomationFlowRunCounts>;

      const { data, error } = await supabase
        .from(RUNS)
        .select('flow_id, status')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const counts: Record<string, AutomationFlowRunCounts> = {};
      for (const row of (data || []) as unknown as { flow_id: string; status: string }[]) {
        const entry = counts[row.flow_id] ?? { active: 0, failed: 0, completed: 0, total: 0 };
        entry.total += 1;
        if (ACTIVE_RUN_STATUSES.includes(row.status)) entry.active += 1;
        else if (row.status === 'failed') entry.failed += 1;
        else if (row.status === 'completed') entry.completed += 1;
        counts[row.flow_id] = entry;
      }
      return counts;
    },
    enabled: !!organizationId,
  });
}

export function useAutomationRuns(flowId: string | null, limit = 100) {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['automation-runs', flowId, limit],
    queryFn: async () => {
      if (!flowId || !organizationId) return [];

      const { data, error } = await supabase
        .from(RUNS)
        .select('*')
        .eq('flow_id', flowId)
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as AutomationRun[];
    },
    enabled: !!flowId && !!organizationId,
    // Runs advance server-side; keep the observability view reasonably fresh.
    refetchInterval: 30000,
  });
}

export function useAutomationRunSteps(runId: string | null) {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['automation-run-steps', runId],
    queryFn: async () => {
      if (!runId || !organizationId) return [];

      const { data, error } = await supabase
        .from(RUN_STEPS)
        .select('*')
        .eq('run_id', runId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AutomationRunStep[];
    },
    enabled: !!runId && !!organizationId,
  });
}

/**
 * The one write the client is allowed on `automation_runs`: an admin stopping a
 * run in flight. Everything else on that table belongs to the engine.
 */
export function useCancelAutomationRun() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      if (!organization?.id) throw new Error('Sem organização');

      const { error } = await supabase
        .from(RUNS)
        .update({
          status: 'cancelled',
          wake_at: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId)
        .eq('organization_id', organization.id)
        .in('status', ACTIVE_RUN_STATUSES);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['automation-run-counts'] });
      toast.success('Execução cancelada');
    },
    onError: (error) => {
      console.error('Error cancelling automation run:', error);
      toast.error('Erro ao cancelar a execução');
    },
  });
}

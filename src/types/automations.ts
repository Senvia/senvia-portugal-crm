// Domain types for the "Automações" module.
//
// The engine (edge function) owns `automation_runs` / `automation_run_steps`;
// the client only reads them (plus cancelling a run). `automation_flows.graph`
// is a plain jsonb document with the shape described by `AutomationGraph`.

export type AutomationFlowStatus = 'draft' | 'active' | 'paused';

export type AutomationReentryPolicy = 'once' | 'after_completion' | 'always';

export type AutomationRunStatus =
  | 'running'
  | 'waiting'
  | 'awaiting_reply'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AutomationRunStepStatus = 'ok' | 'skipped' | 'failed' | 'waiting';

// ── Node types ──────────────────────────────────────────────────────────────

export type AutomationTriggerType =
  | 'lead_created'
  | 'lead_status_changed'
  | 'form_submitted'
  | 'whatsapp_keyword'
  | 'sale_status_changed'
  | 'list_joined';

export type AutomationActionType =
  | 'send_whatsapp'
  | 'send_email'
  | 'wait'
  | 'wait_reply'
  | 'condition'
  | 'move_stage'
  | 'assign_user'
  | 'add_to_list'
  | 'create_task'
  | 'webhook'
  | 'end';

export type AutomationNodeType = AutomationTriggerType | AutomationActionType;

/** Visual grouping — drives node colour and the picker's sections. */
export type AutomationNodeCategory =
  | 'trigger'
  | 'whatsapp'
  | 'email'
  | 'timing'
  | 'logic'
  | 'crm'
  | 'end';

// ── Node config ─────────────────────────────────────────────────────────────

export type AutomationWaitUnit = 'minutes' | 'hours' | 'days';

/** One outgoing branch of a `wait_reply` node, matched by keyword. */
export interface WaitReplyRule {
  id: string;
  label: string;
  keywords: string[];
}

export interface AutomationDuration {
  value: number;
  unit: AutomationWaitUnit;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than';

/**
 * Config is stored as free-form jsonb, so this is an open bag of the fields the
 * v1 node types actually use rather than a strict per-type union. Keeps the
 * inspector forms simple and tolerates configs written by a newer engine.
 */
export interface AutomationNodeConfig {
  // send_whatsapp
  message?: string;
  media_url?: string;
  // send_email
  template_id?: string;
  subject?: string;
  html?: string;
  // wait
  duration?: number;
  unit?: AutomationWaitUnit;
  // wait_reply
  timeout?: AutomationDuration;
  rules?: WaitReplyRule[];
  // condition
  field?: string;
  operator?: ConditionOperator;
  value?: string;
  // move_stage / assign_user / add_to_list
  stage_id?: string;
  user_id?: string;
  list_id?: string;
  // create_task
  title?: string;
  due_in_days?: number;
  assigned_to?: string;
  // webhook
  url?: string;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH';
  headers?: string;
  body?: string;
  // triggers
  from_stage_id?: string;
  to_stage_id?: string;
  to_status?: string;
  form_slug?: string;
  keywords?: string[];

  [key: string]: unknown;
}

// ── Graph ───────────────────────────────────────────────────────────────────

export interface AutomationGraphNode {
  id: string;
  type: AutomationNodeType;
  config: AutomationNodeConfig;
  /** Persisted for compatibility; the canvas always recomputes it with dagre. */
  position?: { x: number; y: number };
}

export interface AutomationGraphEdge {
  id: string;
  source: string;
  target: string;
  /**
   * `null` for a plain edge. For branching nodes it is the branch key:
   * `condition` → "yes" | "no"; `wait_reply` → a rule id, or "timeout".
   */
  branch: string | null;
}

export interface AutomationGraph {
  nodes: AutomationGraphNode[];
  edges: AutomationGraphEdge[];
}

// ── Rows ────────────────────────────────────────────────────────────────────

export interface QuietHours {
  enabled?: boolean;
  start?: string;
  end?: string;
}

export interface AutomationFlow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: AutomationFlowStatus;
  trigger_type: AutomationTriggerType | null;
  trigger_config: AutomationNodeConfig;
  graph: AutomationGraph;
  entry_node_id: string | null;
  version: number;
  reentry_policy: AutomationReentryPolicy;
  quiet_hours: QuietHours | null;
  max_steps_per_run: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_enrolled_at: string | null;
}

export interface AutomationRun {
  id: string;
  organization_id: string;
  flow_id: string;
  flow_version: number | null;
  subject_type: string | null;
  subject_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_phone_key: string | null;
  status: AutomationRunStatus;
  current_node_id: string | null;
  wake_at: string | null;
  context: Record<string, unknown> | null;
  steps_taken: number | null;
  last_error: string | null;
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

export interface AutomationRunStep {
  id: number;
  run_id: string;
  organization_id: string;
  node_id: string | null;
  node_type: string | null;
  status: AutomationRunStepStatus;
  detail: Record<string, unknown> | null;
  created_at: string;
}

/** Aggregated per-flow run counters shown on the list page. */
export interface AutomationFlowRunCounts {
  active: number;
  failed: number;
  completed: number;
  total: number;
}

export const EMPTY_GRAPH: AutomationGraph = { nodes: [], edges: [] };

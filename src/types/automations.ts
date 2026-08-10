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
  | 'list_joined'
  // Legacy triggers migrated from the old automation system. They are not
  // offered when creating a new flow, but existing flows still use them and
  // the canvas must render them properly.
  | 'client_created'
  | 'client_status_changed'
  | 'proposal_created'
  | 'proposal_status_changed'
  | 'sale_created'
  | 'trial_started'
  | 'trial_day_3'
  | 'trial_day_7'
  | 'trial_expiring_3d'
  | 'trial_expiring_1d'
  | 'trial_expired'
  | 'trial_inactive_48h'
  | 'stripe_subscription_created'
  | 'stripe_subscription_renewed'
  | 'stripe_subscription_past_due'
  | 'stripe_subscription_canceled'
  // Renewal triggers — fired daily by the engine, also offered for new flows.
  | 'sale_renewal_due_today'
  | 'sale_renewal_due_in_2_days';

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

/** Operators the engine actually evaluates (see automation-engine). */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'exists'
  | 'not_exists'
  | 'greater_than'
  | 'less_than';

export type AutomationMediaKind = 'image' | 'video' | 'document';

/** A file uploaded to the `automation-media` bucket, attached to a message. */
export interface AutomationMediaAttachment {
  url: string;
  /** Storage path inside the bucket — needed to delete the object later. */
  path?: string;
  mimetype?: string;
  filename?: string;
  kind?: AutomationMediaKind;
  /** Bytes, for the chip in the inspector. Not read by the engine. */
  size?: number;
}

/**
 * Config is stored as free-form jsonb, so this is an open bag of the fields the
 * v1 node types actually use rather than a strict per-type union. Keeps the
 * inspector forms simple and tolerates configs written by a newer engine.
 */
export interface AutomationNodeConfig {
  // send_whatsapp
  message?: string;
  /** Uploaded attachment. `media_url` is the legacy URL-only field. */
  media?: AutomationMediaAttachment;
  media_url?: string;
  // send_email
  template_id?: string;
  subject?: string;
  html?: string;
  // wait (the engine reads `amount ?? duration`)
  duration?: number;
  amount?: number;
  unit?: AutomationWaitUnit;
  // wait_reply — engine contract: question/use_buttons/timeout_amount/timeout_unit/rules
  question?: string;
  use_buttons?: boolean;
  timeout_amount?: number;
  timeout_unit?: AutomationWaitUnit;
  /** Legacy shape kept for graphs saved by older editors. */
  timeout?: AutomationDuration;
  rules?: WaitReplyRule[];
  // condition
  field?: string;
  operator?: ConditionOperator;
  value?: string;
  // move_stage (the engine reads `stage` — a pipeline stage KEY)
  stage?: string;
  stage_id?: string;
  // assign_user / add_to_list
  user_id?: string;
  list_id?: string;
  // create_task (the engine reads `user_id` for the assignee)
  title?: string;
  description?: string;
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
  /**
   * Canvas position. When every node holds a non-default position the canvas
   * uses them as-is (the user dragged things around); otherwise the layout is
   * recomputed with dagre.
   */
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

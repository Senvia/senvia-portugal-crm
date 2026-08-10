// Catalogue of every automation node type: label, icon, category, default
// config and the branches it emits. Single source of truth for the canvas, the
// node picker and the inspector.

import {
  UserPlus, Move, FileInput, MessageSquareText, ShoppingBag, ListChecks,
  MessageCircle, Mail, Clock, MessagesSquare, GitBranch, Columns3,
  UserCheck, ListPlus, CheckSquare, Webhook, CircleStop,
  type LucideIcon,
} from 'lucide-react';
import type {
  AutomationNodeCategory, AutomationNodeConfig, AutomationNodeType,
  AutomationTriggerType, AutomationGraphNode,
} from '@/types/automations';

/**
 * Tailwind classes per category. Everything resolves through the app's CSS
 * variables (or Tailwind's own palette) so both themes work — no raw hex.
 */
export interface NodeCategoryStyle {
  /** Ring around the circle. */
  ring: string;
  /** Circle fill. */
  bg: string;
  /** Icon colour. */
  icon: string;
  /** Soft chip background used by the picker. */
  chip: string;
  /** Edge stroke — a CSS colour string, since SVG strokes are set inline. */
  stroke: string;
}

export const NODE_CATEGORY_STYLES: Record<AutomationNodeCategory, NodeCategoryStyle> = {
  trigger: {
    ring: 'ring-primary',
    bg: 'bg-primary/10',
    icon: 'text-primary',
    chip: 'bg-primary/10 text-primary',
    stroke: 'hsl(var(--primary))',
  },
  whatsapp: {
    ring: 'ring-success',
    bg: 'bg-success/10',
    icon: 'text-success',
    chip: 'bg-success/10 text-success',
    stroke: 'hsl(var(--success))',
  },
  email: {
    ring: 'ring-sky-500',
    bg: 'bg-sky-500/10',
    icon: 'text-sky-500',
    chip: 'bg-sky-500/10 text-sky-500',
    stroke: 'hsl(199 89% 48%)',
  },
  timing: {
    ring: 'ring-warning',
    bg: 'bg-warning/10',
    icon: 'text-warning',
    chip: 'bg-warning/10 text-warning',
    stroke: 'hsl(var(--warning))',
  },
  logic: {
    ring: 'ring-kanban-conversation',
    bg: 'bg-kanban-conversation/10',
    icon: 'text-kanban-conversation',
    chip: 'bg-kanban-conversation/10 text-kanban-conversation',
    stroke: 'hsl(var(--kanban-conversation))',
  },
  crm: {
    ring: 'ring-muted-foreground/50',
    bg: 'bg-muted',
    icon: 'text-muted-foreground',
    chip: 'bg-muted text-muted-foreground',
    stroke: 'hsl(var(--muted-foreground) / 0.5)',
  },
  end: {
    ring: 'ring-destructive',
    bg: 'bg-destructive/10',
    icon: 'text-destructive',
    chip: 'bg-destructive/10 text-destructive',
    stroke: 'hsl(var(--destructive))',
  },
};

export const CATEGORY_LABELS: Record<AutomationNodeCategory, string> = {
  trigger: 'Gatilhos',
  whatsapp: 'WhatsApp',
  email: 'Email',
  timing: 'Tempo',
  logic: 'Lógica',
  crm: 'CRM',
  end: 'Fim',
};

export interface NodeDefinition {
  type: AutomationNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: AutomationNodeCategory;
  isTrigger: boolean;
  /** Branching nodes resolve their branches from config at runtime. */
  branching: boolean;
  defaultConfig: AutomationNodeConfig;
}

export const NODE_DEFINITIONS: Record<AutomationNodeType, NodeDefinition> = {
  // ── Triggers ──
  lead_created: {
    type: 'lead_created',
    label: 'Lead criada',
    description: 'Quando uma nova lead entra no CRM',
    icon: UserPlus,
    category: 'trigger',
    isTrigger: true,
    branching: false,
    defaultConfig: {},
  },
  lead_status_changed: {
    type: 'lead_status_changed',
    label: 'Estado da lead mudou',
    description: 'Quando uma lead muda de etapa no pipeline',
    icon: Move,
    category: 'trigger',
    isTrigger: true,
    branching: false,
    defaultConfig: {},
  },
  form_submitted: {
    type: 'form_submitted',
    label: 'Formulário submetido',
    description: 'Quando um formulário público é preenchido',
    icon: FileInput,
    category: 'trigger',
    isTrigger: true,
    branching: false,
    defaultConfig: {},
  },
  whatsapp_keyword: {
    type: 'whatsapp_keyword',
    label: 'Palavra-chave WhatsApp',
    description: 'Quando alguém envia uma mensagem com certas palavras',
    icon: MessageSquareText,
    category: 'trigger',
    isTrigger: true,
    branching: false,
    defaultConfig: { keywords: [] },
  },
  sale_status_changed: {
    type: 'sale_status_changed',
    label: 'Estado da venda mudou',
    description: 'Quando uma venda muda de estado',
    icon: ShoppingBag,
    category: 'trigger',
    isTrigger: true,
    branching: false,
    defaultConfig: {},
  },
  list_joined: {
    type: 'list_joined',
    label: 'Entrou numa lista',
    description: 'Quando um contacto é adicionado a uma lista',
    icon: ListChecks,
    category: 'trigger',
    isTrigger: true,
    branching: false,
    defaultConfig: {},
  },

  // ── Actions ──
  send_whatsapp: {
    type: 'send_whatsapp',
    label: 'Enviar WhatsApp',
    description: 'Envia uma mensagem de WhatsApp ao contacto',
    icon: MessageCircle,
    category: 'whatsapp',
    isTrigger: false,
    branching: false,
    defaultConfig: { message: '' },
  },
  send_email: {
    type: 'send_email',
    label: 'Enviar Email',
    description: 'Envia um email a partir de um template ou conteúdo próprio',
    icon: Mail,
    category: 'email',
    isTrigger: false,
    branching: false,
    defaultConfig: {},
  },
  wait: {
    type: 'wait',
    label: 'Esperar',
    description: 'Pausa o fluxo durante um período',
    icon: Clock,
    category: 'timing',
    isTrigger: false,
    branching: false,
    defaultConfig: { duration: 1, unit: 'hours' },
  },
  wait_reply: {
    type: 'wait_reply',
    label: 'Esperar resposta',
    description: 'Aguarda a resposta do contacto e ramifica por palavras-chave',
    icon: MessagesSquare,
    category: 'logic',
    isTrigger: false,
    branching: true,
    defaultConfig: {
      timeout: { value: 24, unit: 'hours' },
      rules: [],
    },
  },
  condition: {
    type: 'condition',
    label: 'Condição',
    description: 'Divide o fluxo consoante um campo do contacto',
    icon: GitBranch,
    category: 'logic',
    isTrigger: false,
    branching: true,
    defaultConfig: { field: 'status', operator: 'equals', value: '' },
  },
  move_stage: {
    type: 'move_stage',
    label: 'Mudar etapa',
    description: 'Move a lead para outra etapa do pipeline',
    icon: Columns3,
    category: 'crm',
    isTrigger: false,
    branching: false,
    defaultConfig: {},
  },
  assign_user: {
    type: 'assign_user',
    label: 'Atribuir a utilizador',
    description: 'Atribui o contacto a um membro da equipa',
    icon: UserCheck,
    category: 'crm',
    isTrigger: false,
    branching: false,
    defaultConfig: {},
  },
  add_to_list: {
    type: 'add_to_list',
    label: 'Adicionar a lista',
    description: 'Adiciona o contacto a uma lista de marketing',
    icon: ListPlus,
    category: 'crm',
    isTrigger: false,
    branching: false,
    defaultConfig: {},
  },
  create_task: {
    type: 'create_task',
    label: 'Criar tarefa',
    description: 'Cria uma tarefa de seguimento na agenda',
    icon: CheckSquare,
    category: 'crm',
    isTrigger: false,
    branching: false,
    defaultConfig: { title: '', due_in_days: 1 },
  },
  webhook: {
    type: 'webhook',
    label: 'Webhook',
    description: 'Chama um endpoint HTTP externo',
    icon: Webhook,
    category: 'crm',
    isTrigger: false,
    branching: false,
    defaultConfig: { method: 'POST' },
  },
  end: {
    type: 'end',
    label: 'Fim',
    description: 'Termina o fluxo para este contacto',
    icon: CircleStop,
    category: 'end',
    isTrigger: false,
    branching: false,
    defaultConfig: {},
  },
};

export const TRIGGER_TYPES: AutomationTriggerType[] = [
  'lead_created',
  'lead_status_changed',
  'form_submitted',
  'whatsapp_keyword',
  'sale_status_changed',
  'list_joined',
];

/** Action types offered by the picker, in the order they are shown. */
export const ACTION_TYPES: AutomationNodeType[] = [
  'send_whatsapp',
  'send_email',
  'wait',
  'wait_reply',
  'condition',
  'move_stage',
  'assign_user',
  'add_to_list',
  'create_task',
  'webhook',
  'end',
];

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return NODE_DEFINITIONS[type as AutomationNodeType];
}

export function getNodeStyle(type: string): NodeCategoryStyle {
  const def = getNodeDefinition(type);
  return NODE_CATEGORY_STYLES[def?.category ?? 'crm'];
}

export function getNodeLabel(type: string): string {
  return getNodeDefinition(type)?.label ?? type;
}

/** Branch keys a node emits, derived from its config. */
export interface NodeBranch {
  key: string;
  label: string;
}

export function getNodeBranches(node: AutomationGraphNode | undefined): NodeBranch[] {
  if (!node) return [];

  if (node.type === 'condition') {
    return [
      { key: 'yes', label: 'Sim' },
      { key: 'no', label: 'Não' },
    ];
  }

  if (node.type === 'wait_reply') {
    const rules = node.config?.rules ?? [];
    return [
      ...rules.map((rule, index) => ({
        key: rule.id,
        label: rule.label?.trim() || `Regra ${index + 1}`,
      })),
      { key: 'timeout', label: 'Sem resposta' },
    ];
  }

  return [];
}

/** Human label for a branch key on an edge leaving `node`. */
export function getBranchLabel(node: AutomationGraphNode | undefined, branch: string | null): string | null {
  if (!branch) return null;
  const found = getNodeBranches(node).find((b) => b.key === branch);
  return found?.label ?? branch;
}

const WAIT_UNIT_LABELS: Record<string, string> = {
  minutes: 'minuto(s)',
  hours: 'hora(s)',
  days: 'dia(s)',
};

export const WAIT_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutos' },
  { value: 'hours', label: 'Horas' },
  { value: 'days', label: 'Dias' },
];

export const CONDITION_FIELD_OPTIONS = [
  { value: 'status', label: 'Estado / Etapa' },
  { value: 'source', label: 'Origem' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'name', label: 'Nome' },
  { value: 'value', label: 'Valor' },
  { value: 'assigned_to', label: 'Responsável' },
  { value: 'tags', label: 'Etiquetas' },
];

export const CONDITION_OPERATOR_OPTIONS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'É diferente de' },
  { value: 'contains', label: 'Contém' },
  { value: 'is_empty', label: 'Está vazio' },
  { value: 'is_not_empty', label: 'Não está vazio' },
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
];

/** Operators that take no value input. */
export const VALUELESS_OPERATORS = ['is_empty', 'is_not_empty'];

export const SALE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'active', label: 'Ativa' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
];

function truncate(text: string, max = 46): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * One-line summary shown under the circle. For message nodes this previews the
 * actual message body, which is what makes the canvas readable at a glance.
 */
export function getNodeSubtitle(node: AutomationGraphNode): string {
  const config = node.config ?? {};

  switch (node.type) {
    case 'send_whatsapp':
      return config.message ? truncate(String(config.message)) : 'Sem mensagem definida';

    case 'send_email':
      if (config.template_id) return 'Template de email';
      return config.subject ? truncate(String(config.subject)) : 'Sem assunto definido';

    case 'wait': {
      const value = config.duration ?? 0;
      return `Espera ${value} ${WAIT_UNIT_LABELS[config.unit ?? 'hours'] ?? ''}`.trim();
    }

    case 'wait_reply': {
      const count = config.rules?.length ?? 0;
      const timeout = config.timeout;
      const timeoutText = timeout
        ? ` · ${timeout.value} ${WAIT_UNIT_LABELS[timeout.unit] ?? ''}`.trimEnd()
        : '';
      return `${count} ${count === 1 ? 'regra' : 'regras'}${timeoutText}`;
    }

    case 'condition': {
      const field = CONDITION_FIELD_OPTIONS.find((o) => o.value === config.field)?.label ?? config.field;
      const op = CONDITION_OPERATOR_OPTIONS.find((o) => o.value === config.operator)?.label ?? '';
      if (!field) return 'Condição por definir';
      if (VALUELESS_OPERATORS.includes(config.operator ?? '')) return truncate(`${field} ${op}`);
      return truncate(`${field} ${op} ${config.value ?? ''}`);
    }

    case 'webhook':
      return config.url ? truncate(String(config.url)) : 'Sem URL definido';

    case 'create_task':
      return config.title ? truncate(String(config.title)) : 'Sem título definido';

    case 'whatsapp_keyword': {
      const keywords = config.keywords ?? [];
      return keywords.length ? truncate(keywords.join(', ')) : 'Sem palavras-chave';
    }

    case 'form_submitted':
      return config.form_slug ? truncate(String(config.form_slug)) : 'Qualquer formulário';

    default:
      return getNodeDefinition(node.type)?.description ?? '';
  }
}

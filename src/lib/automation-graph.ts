// Graph helpers for the automation canvas.
//
// The user never drags nodes: positions are always recomputed with dagre in a
// left-to-right rank layout. All mutations here are pure — they take a graph
// and return a new one — so the editor can keep the whole document in state and
// mark it dirty.

import dagre from 'dagre';
import type {
  AutomationGraph, AutomationGraphEdge, AutomationGraphNode, AutomationNodeType,
} from '@/types/automations';
import { getNodeBranches, getNodeDefinition } from '@/lib/automation-nodes';

/** Layout box reserved per node: the 66px circle plus its label block. */
export const NODE_BOX_WIDTH = 190;
export const NODE_BOX_HEIGHT = 118;
/**
 * Ghost "add here" affordances are small, so they get a tighter box. Must match
 * the rendered button (h-11 w-11) exactly or dagre centres them off-axis.
 */
export const GHOST_BOX_WIDTH = 44;
export const GHOST_BOX_HEIGHT = 44;

export function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function createNode(type: AutomationNodeType): AutomationGraphNode {
  const definition = getNodeDefinition(type);
  return {
    id: createId('n'),
    type,
    // Deep-ish clone so two nodes never share a config object (rules arrays!).
    config: JSON.parse(JSON.stringify(definition?.defaultConfig ?? {})),
    position: { x: 0, y: 0 },
  };
}

/** A brand new flow is just its trigger node. */
export function createInitialGraph(triggerType: AutomationNodeType): {
  graph: AutomationGraph;
  entryNodeId: string;
} {
  const trigger = createNode(triggerType);
  return {
    graph: { nodes: [trigger], edges: [] },
    entryNodeId: trigger.id,
  };
}

/** Tolerates a null/malformed `graph` column. */
export function normalizeGraph(raw: unknown): AutomationGraph {
  const graph = (raw ?? {}) as Partial<AutomationGraph>;
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  };
}

export function findNode(graph: AutomationGraph, id: string | null): AutomationGraphNode | undefined {
  if (!id) return undefined;
  return graph.nodes.find((node) => node.id === id);
}

/** The trigger node — the flow's entry point. */
export function getEntryNode(
  graph: AutomationGraph,
  entryNodeId: string | null,
): AutomationGraphNode | undefined {
  return findNode(graph, entryNodeId) ?? graph.nodes.find((n) => getNodeDefinition(n.type)?.isTrigger);
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function updateNodeConfig(
  graph: AutomationGraph,
  nodeId: string,
  config: AutomationGraphNode['config'],
): AutomationGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, config } : node)),
  };
}

/**
 * Appends a node after `sourceId` on `branch` (which must currently be free).
 */
export function appendNode(
  graph: AutomationGraph,
  sourceId: string,
  branch: string | null,
  type: AutomationNodeType,
): { graph: AutomationGraph; node: AutomationGraphNode } {
  const node = createNode(type);
  const edge: AutomationGraphEdge = {
    id: createId('e'),
    source: sourceId,
    target: node.id,
    branch,
  };
  return {
    graph: { nodes: [...graph.nodes, node], edges: [...graph.edges, edge] },
    node,
  };
}

/**
 * Splices a node into an existing edge: A→B becomes A→N→B. The original
 * edge's branch stays on the upstream half, so branch semantics are preserved.
 */
export function insertNodeOnEdge(
  graph: AutomationGraph,
  edgeId: string,
  type: AutomationNodeType,
): { graph: AutomationGraph; node: AutomationGraphNode } {
  const target = graph.edges.find((edge) => edge.id === edgeId);
  if (!target) return { graph, node: null as unknown as AutomationGraphNode };

  const node = createNode(type);
  const upstream: AutomationGraphEdge = {
    id: createId('e'),
    source: target.source,
    target: node.id,
    branch: target.branch,
  };
  const downstream: AutomationGraphEdge = {
    id: createId('e'),
    source: node.id,
    target: target.target,
    branch: null,
  };

  return {
    graph: {
      nodes: [...graph.nodes, node],
      edges: [...graph.edges.filter((edge) => edge.id !== edgeId), upstream, downstream],
    },
    node,
  };
}

/**
 * Removes a node and heals the graph: every incoming edge is re-pointed at the
 * node's default (unbranched) successor, so a linear chain stays connected.
 * Branches hanging off the removed node are dropped along with their subtree
 * links — the nodes themselves survive as unreachable roots the user can see.
 */
export function removeNode(graph: AutomationGraph, nodeId: string): AutomationGraph {
  const incoming = graph.edges.filter((edge) => edge.target === nodeId);
  const outgoing = graph.edges.filter((edge) => edge.source === nodeId);
  // Prefer the plain successor; fall back to the first branch target.
  const successor = outgoing.find((edge) => !edge.branch) ?? outgoing[0];

  const healed: AutomationGraphEdge[] = successor
    ? incoming.map((edge) => ({
        id: createId('e'),
        source: edge.source,
        target: successor.target,
        branch: edge.branch,
      }))
    : [];

  return {
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    edges: [
      ...graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      ...healed,
    ],
  };
}

/**
 * Drops edges whose branch key no longer exists on the source node. Called
 * after editing `wait_reply` rules so deleting a rule also unhooks its branch.
 */
export function pruneOrphanBranches(graph: AutomationGraph): AutomationGraph {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => {
      if (!edge.branch) return true;
      const source = findNode(graph, edge.source);
      if (!source) return false;
      const branches = getNodeBranches(source);
      // Non-branching sources shouldn't carry branch keys at all.
      if (!branches.length) return false;
      return branches.some((branch) => branch.key === edge.branch);
    }),
  };
}

// ── Canvas projection ───────────────────────────────────────────────────────

export interface GhostSlot {
  id: string;
  sourceId: string;
  branch: string | null;
  branchLabel: string | null;
}

/**
 * Every free outgoing slot in the graph — a branch with no edge, or a terminal
 * node with no successor. Each becomes a "+" ghost node on the canvas.
 */
export function getGhostSlots(graph: AutomationGraph): GhostSlot[] {
  const slots: GhostSlot[] = [];

  for (const node of graph.nodes) {
    // `end` is terminal by definition.
    if (node.type === 'end') continue;

    const branches = getNodeBranches(node);
    const outgoing = graph.edges.filter((edge) => edge.source === node.id);

    if (branches.length) {
      for (const branch of branches) {
        const taken = outgoing.some((edge) => edge.branch === branch.key);
        if (!taken) {
          slots.push({
            id: `ghost_${node.id}_${branch.key}`,
            sourceId: node.id,
            branch: branch.key,
            branchLabel: branch.label,
          });
        }
      }
    } else if (!outgoing.length) {
      slots.push({
        id: `ghost_${node.id}`,
        sourceId: node.id,
        branch: null,
        branchLabel: null,
      });
    }
  }

  return slots;
}

export interface LayoutResult {
  positions: Record<string, { x: number; y: number }>;
}

/**
 * Runs dagre over the real nodes plus the ghost slots. Positions returned are
 * top-left corners (React Flow's origin), converted from dagre's centres.
 */
export function layoutGraph(graph: AutomationGraph, ghosts: GhostSlot[]): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    ranksep: 110,
    nodesep: 46,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: NODE_BOX_WIDTH, height: NODE_BOX_HEIGHT });
  }
  for (const ghost of ghosts) {
    g.setNode(ghost.id, { width: GHOST_BOX_WIDTH, height: GHOST_BOX_HEIGHT });
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  for (const edge of graph.edges) {
    // Guard against edges left dangling by a bad save.
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }
  for (const ghost of ghosts) {
    if (nodeIds.has(ghost.sourceId)) g.setEdge(ghost.sourceId, ghost.id);
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of g.nodes()) {
    const laid = g.node(id);
    if (!laid) continue;
    positions[id] = {
      x: laid.x - laid.width / 2,
      y: laid.y - laid.height / 2,
    };
  }

  return { positions };
}

/** Step numbers shown in the badge — BFS from the entry node. */
export function computeStepNumbers(graph: AutomationGraph, entryNodeId: string | null): Record<string, number> {
  const entry = getEntryNode(graph, entryNodeId);
  const numbers: Record<string, number> = {};
  if (!entry) return numbers;

  const queue: string[] = [entry.id];
  const seen = new Set<string>([entry.id]);
  let counter = 1;

  while (queue.length) {
    const current = queue.shift() as string;
    numbers[current] = counter++;
    const next = graph.edges
      .filter((edge) => edge.source === current)
      .map((edge) => edge.target);
    for (const id of next) {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push(id);
      }
    }
  }

  // Unreachable nodes still need a badge so they don't look broken.
  for (const node of graph.nodes) {
    if (numbers[node.id] === undefined) numbers[node.id] = counter++;
  }

  return numbers;
}

// ── Validation ──────────────────────────────────────────────────────────────

export interface GraphIssue {
  nodeId: string | null;
  message: string;
}

/** Blocking problems that should stop a flow from being activated. */
export function validateGraph(graph: AutomationGraph, entryNodeId: string | null): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const entry = getEntryNode(graph, entryNodeId);

  if (!entry) {
    issues.push({ nodeId: null, message: 'O fluxo não tem gatilho de entrada.' });
  }
  if (graph.nodes.length < 2) {
    issues.push({ nodeId: null, message: 'Adicione pelo menos uma ação depois do gatilho.' });
  }

  for (const node of graph.nodes) {
    switch (node.type) {
      case 'send_whatsapp':
        if (!node.config?.message?.trim()) {
          issues.push({ nodeId: node.id, message: 'Mensagem de WhatsApp por preencher.' });
        }
        break;
      case 'send_email':
        if (!node.config?.template_id && !node.config?.subject?.trim()) {
          issues.push({ nodeId: node.id, message: 'Email sem template nem assunto.' });
        }
        break;
      case 'webhook':
        if (!node.config?.url?.trim()) {
          issues.push({ nodeId: node.id, message: 'Webhook sem URL.' });
        }
        break;
      case 'wait_reply':
        if (!node.config?.rules?.length) {
          issues.push({ nodeId: node.id, message: 'Esperar resposta sem regras de palavras-chave.' });
        }
        break;
      default:
        break;
    }
  }

  return issues;
}

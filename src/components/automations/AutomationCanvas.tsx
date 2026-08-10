import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider,
  useReactFlow, type Edge, type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AutomationFlowNode, GhostFlowNode } from './AutomationFlowNode';
import { AutomationFlowEdge } from './AutomationFlowEdge';
import {
  computeStepNumbers, findNode, getGhostSlots, layoutGraph, validateGraph,
} from '@/lib/automation-graph';
import { getBranchLabel, getNodeStyle } from '@/lib/automation-nodes';
import type { AutomationGraph } from '@/types/automations';

// Defined once — React Flow warns (and re-renders hard) on new object identities.
const nodeTypes = { automation: AutomationFlowNode, ghost: GhostFlowNode };
const edgeTypes = { automation: AutomationFlowEdge };

interface AutomationCanvasProps {
  graph: AutomationGraph;
  entryNodeId: string | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  /** Append a step on a free branch of `sourceId`. */
  onAddAfter: (sourceId: string, branch: string | null) => void;
  /** Splice a step into an existing edge. */
  onInsertOnEdge: (edgeId: string) => void;
}

function CanvasInner({
  graph, entryNodeId, selectedNodeId, onSelectNode, onAddAfter, onInsertOnEdge,
}: AutomationCanvasProps) {
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const ghosts = getGhostSlots(graph);
    const { positions } = layoutGraph(graph, ghosts);
    const steps = computeStepNumbers(graph, entryNodeId);

    // Nodes flagged by validation get a warning badge on the circle.
    const issues = new Set(
      validateGraph(graph, entryNodeId)
        .map((issue) => issue.nodeId)
        .filter(Boolean) as string[],
    );

    const flowNodes: Node[] = [
      ...graph.nodes.map((node) => ({
        id: node.id,
        type: 'automation',
        position: positions[node.id] ?? { x: 0, y: 0 },
        draggable: false,
        selected: node.id === selectedNodeId,
        data: {
          graphNode: node,
          step: steps[node.id] ?? 0,
          hasIssue: issues.has(node.id),
        },
      })),
      ...ghosts.map((ghost) => ({
        id: ghost.id,
        type: 'ghost',
        position: positions[ghost.id] ?? { x: 0, y: 0 },
        draggable: false,
        selectable: false,
        data: {
          sourceId: ghost.sourceId,
          branch: ghost.branch,
          branchLabel: ghost.branchLabel,
          onAdd: onAddAfter,
        },
      })),
    ];

    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    const flowEdges: Edge[] = [
      ...graph.edges
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
        .map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'automation',
          data: {
            branchLabel: getBranchLabel(findNode(graph, edge.source), edge.branch),
            stroke: getNodeStyle(findNode(graph, edge.source)?.type ?? '').stroke,
            ghost: false,
            onInsert: onInsertOnEdge,
          },
        })),
      ...ghosts.map((ghost) => ({
        id: `edge_${ghost.id}`,
        source: ghost.sourceId,
        target: ghost.id,
        type: 'automation',
        selectable: false,
        data: {
          branchLabel: ghost.branchLabel,
          stroke: getNodeStyle(findNode(graph, ghost.sourceId)?.type ?? '').stroke,
          ghost: true,
        },
      })),
    ];

    return { nodes: flowNodes, edges: flowEdges };
  }, [graph, entryNodeId, selectedNodeId, onAddAfter, onInsertOnEdge]);

  // Re-fit when the shape of the graph changes (not on mere config edits).
  const shapeKey = `${graph.nodes.length}:${graph.edges.length}`;
  const lastShape = useRef<string>('');
  useEffect(() => {
    if (lastShape.current === shapeKey) return;
    lastShape.current = shapeKey;
    const timer = setTimeout(() => fitView({ padding: 0.2, duration: 300, maxZoom: 1 }), 60);
    return () => clearTimeout(timer);
  }, [shapeKey, fitView]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'ghost') return;
      onSelectNode(node.id);
    },
    [onSelectNode],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={handleNodeClick}
      onPaneClick={() => onSelectNode(null)}
      // Layout is computed by dagre; the user organises nothing by hand.
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnScroll
      selectionOnDrag={false}
      minZoom={0.2}
      maxZoom={1.5}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      proOptions={{ hideAttribution: false }}
      className="bg-background"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} className="!bg-background" color="hsl(var(--muted-foreground) / 0.25)" />
      <Controls showInteractive={false} position="bottom-right" />
    </ReactFlow>
  );
}

export function AutomationCanvas(props: AutomationCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

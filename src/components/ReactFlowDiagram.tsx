import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FlowGraph, FlowNodeData, FlowNodeKind } from "@/lib/flow-layouts";

const KIND_STYLES: Record<FlowNodeKind, { bg: string; border: string; text: string; ring?: string }> = {
  hub:     { bg: "bg-indigo-600",   border: "border-indigo-800",  text: "text-white",       ring: "ring-2 ring-indigo-300" },
  primary: { bg: "bg-indigo-50",    border: "border-indigo-500",  text: "text-indigo-950" },
  accent:  { bg: "bg-amber-50",     border: "border-amber-600",   text: "text-amber-950" },
  ok:      { bg: "bg-emerald-50",   border: "border-emerald-600", text: "text-emerald-950" },
  info:    { bg: "bg-sky-50",       border: "border-sky-600",     text: "text-sky-950" },
  warn:    { bg: "bg-rose-50",      border: "border-rose-600",    text: "text-rose-950" },
  group:   { bg: "bg-slate-100",    border: "border-slate-400",   text: "text-slate-900" },
};

function ConceptNode({ data }: NodeProps) {
  const d = data as FlowNodeData;
  const s = KIND_STYLES[d.kind] ?? KIND_STYLES.primary;
  const isHub = d.kind === "hub";
  return (
    <div
      className={`rounded-xl border-2 shadow-sm px-3 py-2 text-center leading-snug ${s.bg} ${s.border} ${s.text} ${s.ring ?? ""}`}
      style={{ width: isHub ? 200 : 170, fontSize: isHub ? 13 : 11, fontWeight: isHub ? 700 : 500 }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {typeof d.index === "number" ? (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/70 text-[10px] font-bold mr-1 border border-current">
          {d.index}
        </span>
      ) : null}
      <span className="align-middle break-words">{d.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const NODE_TYPES = { concept: ConceptNode };

function InnerDiagram({ graph }: { graph: FlowGraph }) {
  const { nodes, edges } = useMemo(() => ({ nodes: graph.nodes, edges: graph.edges }), [graph]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1.1, minZoom: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} color="rgba(99,102,241,0.12)" />
    </ReactFlow>
  );
}

export function ReactFlowDiagram({ graph, className }: { graph: FlowGraph; className?: string }) {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return (
      <div className={`grid place-items-center text-[10px] text-muted-foreground ${className ?? ""}`}>
        Diagram unavailable
      </div>
    );
  }
  return (
    <div className={`w-full h-full ${className ?? ""}`}>
      <ReactFlowProvider>
        <InnerDiagram graph={graph} />
      </ReactFlowProvider>
    </div>
  );
}

import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import { Download, FileImage, FileCode2 } from "lucide-react";
import type { FlowGraph, FlowNode, FlowNodeKind } from "@/lib/flow-layouts";

type ConceptData = { label: string; kind: FlowNodeKind; index?: number };

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
  const d = data as unknown as ConceptData;
  const s = KIND_STYLES[d.kind] ?? KIND_STYLES.primary;
  const isHub = d.kind === "hub";
  return (
    <div
      className={`rounded-xl border-2 shadow-sm px-3 py-2 text-center leading-snug ${s.bg} ${s.border} ${s.text} ${s.ring ?? ""}`}
      style={{ width: isHub ? 200 : 170, fontSize: isHub ? 13 : 11, fontWeight: isHub ? 700 : 500 }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {typeof d.index === "number" ? (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/70 text-[10px] font-bold mr-1 border border-current align-middle">
          {d.index}
        </span>
      ) : null}
      <span className="align-middle break-words">{d.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const NODE_TYPES = { concept: ConceptNode };

function toRfNode(n: FlowNode): Node {
  return {
    id: n.id,
    type: "concept",
    position: { x: n.x, y: n.y },
    data: { label: n.label, kind: n.kind, index: n.index } as unknown as Record<string, unknown>,
  };
}

function safeFilename(name: string) {
  return (name || "flow-graph").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "flow-graph";
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function InnerDiagram({
  graph,
  exportName,
  showExport,
  interactive,
}: {
  graph: FlowGraph;
  exportName: string;
  showExport: boolean;
  interactive: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const nodes = useMemo<Node[]>(() => graph.nodes.map(toRfNode), [graph]);
  const edges = useMemo<Edge[]>(
    () => graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: !!e.animated, type: "smoothstep" })),
    [graph],
  );

  const findViewport = useCallback((): HTMLElement | null => {
    return wrapRef.current?.querySelector<HTMLElement>(".react-flow__viewport") ?? null;
  }, []);

  const handleExportPng = useCallback(async () => {
    const target = findViewport();
    if (!target) return;
    const dataUrl = await toPng(target, { backgroundColor: "#ffffff", pixelRatio: 2, cacheBust: true });
    downloadDataUrl(dataUrl, `${safeFilename(exportName)}.png`);
  }, [exportName, findViewport]);

  const handleExportSvg = useCallback(async () => {
    const target = findViewport();
    if (!target) return;
    const dataUrl = await toSvg(target, { backgroundColor: "#ffffff", cacheBust: true });
    downloadDataUrl(dataUrl, `${safeFilename(exportName)}.svg`);
  }, [exportName, findViewport]);

  return (
    <div ref={wrapRef} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.4, minZoom: 0.2 }}
        minZoom={0.2}
        maxZoom={3}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={interactive}
        panOnScroll={false}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        zoomOnDoubleClick={interactive}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="rgba(99,102,241,0.12)" />
        {interactive ? <Controls showInteractive={false} position="bottom-left" /> : null}
      </ReactFlow>
      {showExport ? (
        <div className="absolute top-1.5 right-1.5 z-20 flex gap-1">
          <button
            type="button"
            onClick={handleExportPng}
            title="Download PNG"
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-border/70 bg-card/95 hover:bg-secondary text-foreground shadow-sm"
          >
            <FileImage className="h-3 w-3" /> PNG
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            title="Download SVG"
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-border/70 bg-card/95 hover:bg-secondary text-foreground shadow-sm"
          >
            <FileCode2 className="h-3 w-3" /> SVG
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReactFlowDiagram({
  graph,
  className,
  exportName = "flow-graph",
  showExport = true,
  interactive = true,
}: {
  graph: FlowGraph | undefined | null;
  className?: string;
  exportName?: string;
  showExport?: boolean;
  interactive?: boolean;
}) {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return (
      <div className={`grid place-items-center text-[10px] text-muted-foreground ${className ?? ""}`}>
        <Download className="h-3 w-3 mr-1 opacity-40" /> Diagram unavailable
      </div>
    );
  }
  return (
    <div className={`w-full h-full ${className ?? ""}`}>
      <ReactFlowProvider>
        <InnerDiagram graph={graph} exportName={exportName} showExport={showExport} interactive={interactive} />
      </ReactFlowProvider>
    </div>
  );
}

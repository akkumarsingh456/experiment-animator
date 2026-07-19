/**
 * React Flow graph builders — replaces Mermaid.js DSL.
 *
 * Types here are plain JSON (no `unknown`) so `FlowGraph` can cross the
 * TanStack Start server-function serialization boundary. The React Flow
 * component maps them to `Node<T>` / `Edge` at render time.
 */

export type FlowLayout =
  | "mindmap"
  | "pipeline"
  | "compare"
  | "cycle"
  | "hierarchy"
  | "story";

export type FlowNodeKind = "hub" | "primary" | "accent" | "ok" | "info" | "warn" | "group";

export type FlowNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: FlowNodeKind;
  index?: number;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
};

export type FlowGraph = {
  layout: FlowLayout;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

function cleanLabel(text: string, max = 60): string {
  const s = String(text || "")
    .replace(/[\uE000-\uF8FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "NCERT idea";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const KINDS: FlowNodeKind[] = ["primary", "accent", "ok", "info", "warn", "primary"];
const LAYOUTS: FlowLayout[] = ["mindmap", "pipeline", "compare", "cycle", "hierarchy", "story"];

const mkNode = (id: string, label: string, kind: FlowNodeKind, x: number, y: number, index?: number): FlowNode => ({
  id, label, kind, x, y, ...(typeof index === "number" ? { index } : {}),
});
const mkEdge = (source: string, target: string, animated = false): FlowEdge => ({
  id: `${source}->${target}`, source, target, animated,
});

/**
 * Deterministic per-slide graph. `slideIndex` chooses one of six layouts;
 * bullets become nodes, title becomes the hub.
 */
export function buildFlowGraph(title: string, bullets: string[], slideIndex: number): FlowGraph {
  const clean = (bullets || []).map((b) => cleanLabel(b, 56)).filter(Boolean).slice(0, 6);
  const T = cleanLabel(title, 44);
  const layout = LAYOUTS[((slideIndex % LAYOUTS.length) + LAYOUTS.length) % LAYOUTS.length];

  if (clean.length === 0) {
    return {
      layout,
      nodes: [mkNode("H", T, "hub", 260, 40), mkNode("A", "Refer the NCERT passage", "primary", 260, 220)],
      edges: [mkEdge("H", "A")],
    };
  }

  if (layout === "mindmap") {
    const nodes: FlowNode[] = [mkNode("H", T, "hub", 320, 260)];
    const edges: FlowEdge[] = [];
    const R = 240;
    clean.forEach((c, i) => {
      const a = (i / clean.length) * Math.PI * 2 - Math.PI / 2;
      nodes.push(mkNode(`N${i}`, c, KINDS[i % KINDS.length], 320 + Math.cos(a) * R, 260 + Math.sin(a) * R));
      edges.push(mkEdge("H", `N${i}`));
    });
    return { layout, nodes, edges };
  }

  if (layout === "pipeline") {
    const nodes: FlowNode[] = [mkNode("H", T, "hub", 20, 40)];
    const edges: FlowEdge[] = [];
    clean.forEach((c, i) => {
      nodes.push(mkNode(`S${i}`, c, i === 0 ? "primary" : i === clean.length - 1 ? "ok" : "info", 20 + i * 260, 220, i + 1));
      if (i === 0) edges.push(mkEdge("H", "S0"));
      if (i > 0) edges.push(mkEdge(`S${i - 1}`, `S${i}`, true));
    });
    return { layout, nodes, edges };
  }

  if (layout === "compare") {
    const half = Math.ceil(clean.length / 2);
    const L = clean.slice(0, half);
    const R = clean.slice(half).length ? clean.slice(half) : [clean[0]];
    const nodes: FlowNode[] = [mkNode("H", T, "hub", 260, 20)];
    const edges: FlowEdge[] = [];
    L.forEach((c, i) => { nodes.push(mkNode(`L${i}`, c, "primary", 40, 160 + i * 130)); edges.push(mkEdge("H", `L${i}`)); });
    R.forEach((c, i) => { nodes.push(mkNode(`R${i}`, c, "accent", 480, 160 + i * 130)); edges.push(mkEdge("H", `R${i}`)); });
    return { layout, nodes, edges };
  }

  if (layout === "cycle") {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const R = 220;
    clean.forEach((c, i) => {
      const a = (i / clean.length) * Math.PI * 2 - Math.PI / 2;
      nodes.push(mkNode(`C${i}`, c, KINDS[i % KINDS.length], 320 + Math.cos(a) * R, 260 + Math.sin(a) * R));
      edges.push(mkEdge(`C${i}`, `C${(i + 1) % clean.length}`, true));
    });
    nodes.unshift(mkNode("H", T, "hub", 260, 230));
    return { layout, nodes, edges };
  }

  if (layout === "hierarchy") {
    const [a, b, ...rest] = clean;
    const mid = Math.ceil(rest.length / 2);
    const left = rest.slice(0, mid);
    const right = rest.slice(mid);
    const nodes: FlowNode[] = [mkNode("H", T, "hub", 280, 20)];
    const edges: FlowEdge[] = [];
    if (a) {
      nodes.push(mkNode("A", a, "primary", 80, 180));
      edges.push(mkEdge("H", "A"));
      left.forEach((c, i) => { nodes.push(mkNode(`LA${i}`, c, "info", 40 + i * 200, 340)); edges.push(mkEdge("A", `LA${i}`)); });
    }
    if (b) {
      nodes.push(mkNode("B", b, "accent", 500, 180));
      edges.push(mkEdge("H", "B"));
      right.forEach((c, i) => { nodes.push(mkNode(`RB${i}`, c, "ok", 440 + i * 200, 340)); edges.push(mkEdge("B", `RB${i}`)); });
    }
    return { layout, nodes, edges };
  }

  // story
  const third = Math.max(1, Math.floor(clean.length / 3));
  const causes = clean.slice(0, third);
  const core = clean.slice(third, third * 2);
  const effects = clean.slice(third * 2);
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const colX = [40, 320, 620];
  const cols = [
    (causes.length ? causes : [clean[0]]).map((c, i) => mkNode(`CA${i}`, c, "accent", colX[0], 60 + i * 130)),
    (core.length ? core : [clean[Math.min(1, clean.length - 1)]]).map((c, i) => mkNode(`CO${i}`, c, "primary", colX[1], 60 + i * 130)),
    (effects.length ? effects : [clean[clean.length - 1]]).map((c, i) => mkNode(`EF${i}`, c, "ok", colX[2], 60 + i * 130)),
  ];
  cols.forEach((col) => nodes.push(...col));
  cols[0].forEach((s) => cols[1].forEach((t) => edges.push(mkEdge(s.id, t.id))));
  cols[1].forEach((s) => cols[2].forEach((t) => edges.push(mkEdge(s.id, t.id, true))));
  return { layout, nodes, edges };
}

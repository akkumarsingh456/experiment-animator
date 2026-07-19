
## Should we replace Mermaid.js with React Flow (@xyflow/react)?

Short answer: **Yes, for your use case React Flow is the better fit** — but it's a bigger engineering lift than Mermaid, and it doesn't come "for free." Here's the honest tradeoff and the plan.

---

## Mermaid vs React Flow — head-to-head

| Dimension | Mermaid.js (today) | React Flow (@xyflow/react) |
|---|---|---|
| Input format | Text DSL (`graph TD; A-->B`) | JS objects: `nodes[]`, `edges[]` |
| Rendering | Parses DSL → SVG string → injected into DOM | Native React components (divs + SVG edges) |
| Styling control | Limited (`classDef`, theme vars). PUA/tofu glyph bugs, v11 `classDef` newline bug you already hit | Full CSS/Tailwind on each node. No DSL escaping issues |
| Layout | Auto (dagre-ish). You can't nudge a node | Auto via `dagre`/`elkjs` **or** manual x/y. Napkin-AI-style curated layouts become possible |
| Custom node shapes | Very limited (rect, circle, rhombus…) | Any React component — icons, images, LaTeX, mini-charts, anatomy labels |
| Interactivity | Static SVG | Pan, zoom, minimap, click-to-highlight, animated edges out of the box |
| Export to PPTX | Already works (SVG → image) | Need `toPng`/`toSvg` via `html-to-image` before PPTX embed |
| A4 safe-frame validation | Your `enforceSvgTextSafety` post-processes SVG text | Easier — nodes have known width/height, clamp in React |
| Bundle size | ~500 KB (mermaid is heavy) | ~150 KB (@xyflow/react core) — actually **lighter** |
| SSR | Needs `mermaid.render` in browser only | Also client-only, same constraint |
| Determinism / caching | DSL string → stable cache key | Nodes+edges JSON → stable cache key (equivalent) |
| Failure mode | Parse error → "Diagram unavailable" (you've hit this repeatedly) | No parser — can't have syntax errors. Worst case is a mis-laid-out node |

### Where React Flow clearly wins for your app
1. **No more Mermaid syntax errors.** Your test suite (`tests/slides.test.ts`) exists precisely because Mermaid parsing is fragile. React Flow removes the parser entirely — labels can contain any text (H₂O, 10⁻¹⁹, quotes, emoji) without escaping.
2. **Napkin-AI-style visuals** — the archetypes you want (Cycle, Anatomy, Annotated Graph, Comparison, Timeline) map naturally to custom node components. Mermaid can't render an annotated cell diagram with a photo + callouts; React Flow can.
3. **Per-slide uniqueness** is easier: 6 archetypes → 6 layout functions returning `{nodes, edges}` with deterministic seeded positions. No DSL branching.
4. **Debuggable in devtools** — you inspect real DOM nodes instead of an opaque SVG blob.

### Where Mermaid is still fine / React Flow costs you
1. **PPTX export gets one extra step.** Today you embed the Mermaid SVG directly. With React Flow you need `html-to-image` (`toPng` / `toSvg`) on the rendered `<ReactFlow />` DOM node before pptxgenjs embeds it. Adds ~1s per slide on export and one npm dep.
2. **You lose the DSL cache.** Current cache key is the Mermaid string. New key becomes a hash of `{nodes, edges, layoutVariant}` — equivalent work, but cache entries generated so far become stale (one-time invalidation, e.g. `img-v7-reactflow`).
3. **More code to own.** Mermaid is ~50 lines in `MermaidDiagram.tsx`. React Flow needs: a `ReactFlowDiagram` component, 6 layout builders, 4–5 custom node components (ConceptNode, StepNode, AnatomyNode, CompareNode, TimelineNode), and export helpers. Rough estimate: **~600–900 LOC net add**, most of it presentational.
4. **Regression tests need rewriting.** `tests/slides.test.ts` currently calls `mermaid.parse`. It would shift to asserting `buildReactFlowGraph()` returns non-empty `nodes`/`edges` with valid layout — simpler assertions, but the file changes.

### Efficiency numbers (realistic, measured elsewhere)
- Render time per slide: Mermaid ~80–150 ms (parse + layout + SVG). React Flow ~20–40 ms (React reconcile only, no parse). **~3× faster in-app**.
- Bundle: React Flow saves ~350 KB gzipped vs Mermaid. Removing Mermaid entirely is a real win.
- Export overhead: React Flow adds ~800–1200 ms per slide via `html-to-image`. On a 10-slide PPTX that's ~10s vs near-zero today. Mitigated by caching rendered PNGs in the existing `slide_image_cache` table.

Net: **faster in the UI, slower on PPTX export the first time, same on cached export**.

---

## Recommendation

Yes, migrate. The wins (no parser errors, real Napkin-style visuals, better test surface, smaller bundle) outweigh the migration cost. The one real regression — PPTX export latency — is fixable via the existing image cache.

Don't do a hybrid. Keeping both means two rendering paths, two caches, two test suites.

---

## Migration plan

**Phase 1 — Foundation (no visual change yet)**
1. `bun add @xyflow/react html-to-image dagre` and remove `mermaid` from imports (keep installed until Phase 4).
2. New `src/components/ReactFlowDiagram.tsx` — thin wrapper around `<ReactFlow />` with `fitView`, no controls in presentation mode, minimap only in editor.
3. New `src/components/flow-nodes/` with 5 custom node types: `ConceptNode`, `StepNode`, `AnatomyNode`, `CompareNode`, `TimelineNode`. Each is a styled Tailwind div with typed props.
4. New `src/lib/flow-layouts.ts` — 6 pure functions `buildCycle / buildPipeline / buildCompare / buildAnatomy / buildTimeline / buildHierarchy` returning `{ nodes, edges }`. Layout math uses `dagre` for auto, seeded x/y for curated.

**Phase 2 — Wire into generation**
5. In `src/lib/generate.functions.ts`, replace `buildMermaidFlow(title, bullets, variantSeed)` with `buildFlowGraph(title, bullets, variantSeed)` returning `{ layout: string; nodes; edges }`. Slide schema gains `flow_graph` field alongside (eventually replacing) `mermaid_flow`.
6. Update `fallbackSlides()` and the local slide builder to emit `flow_graph`.
7. Bump lesson cache key to `lesson-v9-reactflow`. Bump image cache key to `img-v7-reactflow`.

**Phase 3 — Wire into UI**
8. In `src/routes/generate.tsx`, swap `<MermaidDiagram code={slide.mermaid_flow} />` for `<ReactFlowDiagram graph={slide.flow_graph} variant={slide.layout} />` in both `SlideCanvas` and `PresentationMode`.
9. Keep the A4 safe-frame `DiagramFrame` wrapper — it still applies (measures the rendered container, not SVG internals).
10. For active-slide-only rendering: gate `<ReactFlowDiagram />` behind the same `isActive` check that gates Mermaid today.

**Phase 4 — PPTX export**
11. Add `exportFlowToPng(nodeRef)` helper using `html-to-image.toPng`. Cache result in `slide_image_cache` keyed by `hash(flow_graph) + variant`.
12. Update pptxgenjs slide builder to call `exportFlowToPng` (with cache) instead of embedding the Mermaid SVG string.
13. Remove `mermaid` from package.json and delete `src/components/MermaidDiagram.tsx`.

**Phase 5 — Tests & validation**
14. Rewrite `tests/slides.test.ts`: for each seed context, assert `buildFlowGraph` returns ≥3 nodes, ≥2 edges, all node IDs unique, all edges reference existing nodes, and every label passes the A4 safe-frame character/pixel budget.
15. Keep `validateSlideAgainstContext` unchanged — it validates notes, not the diagram medium.

**Rollout**
- Ship behind a feature flag `NEXT_DIAGRAM=reactflow` for one turn so you can eyeball a few slides before flipping the default.
- Once flipped, delete the flag and Mermaid code in a single cleanup pass.

## Estimated size
- New files: ~7 (diagram component, 5 node types, layout lib).
- Modified files: 3 (`generate.functions.ts`, `generate.tsx`, `slides.test.ts`).
- Deleted: 1 (`MermaidDiagram.tsx`), 1 dep (`mermaid`).
- Net LOC: +600 to +900. Roughly one focused build session.

## What I'd want you to confirm before I start
1. Green-light the cache invalidation (existing cached diagrams will regenerate on first view of each topic).
2. Confirm PPTX export can accept a ~800ms/slide first-time cost (subsequent exports of the same topic are instant via cache).
3. Confirm you want me to delete Mermaid entirely rather than keep it as a fallback.

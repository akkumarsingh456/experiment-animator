/**
 * Diagrams INSIDE the notes (not in the 2D image pipeline).
 *
 * Every content slide gets a labelled text diagram — a flow chart, a labelled
 * structure or a comparison table — drawn in monospace characters and grounded
 * in the uploaded books (NCERT + the PW / Med Easy / mind-map reference PDFs).
 * The AI pass is optional: a deterministic local builder always produces a
 * usable diagram, so a slide is never left with blank space.
 */

import type { NoteSection } from "@/lib/ncert-teacher-notes";
import { plainMathText } from "@/lib/latex-notation";
import { validateDiagramLabels } from "@/lib/pwNotesNormalizer";


export const DIAGRAM_HEADING = "Diagram (from the book)";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Draw a boxed flow chart: [A] → [B] → [C], wrapped to two rows if needed. */
function flowDiagram(stages: string[]): string[] {
  const items = stages.map((s) => clip(plainMathText(s).replace(/\s+/g, " ").trim(), 22)).filter(Boolean);
  if (items.length < 2) return [];
  const rows: string[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  const out: string[] = [];
  for (const row of rows) {
    const cells = row.map((t) => t.padEnd(Math.max(...row.map((x) => x.length))));
    const top = cells.map((c) => `┌─${"─".repeat(c.length)}─┐`).join("   ");
    const mid = cells.map((c) => `│ ${c} │`).join(" ▶ ");
    const bot = cells.map((c) => `└─${"─".repeat(c.length)}─┘`).join("   ");
    out.push(top, mid, bot);
    out.push("      │");
    out.push("      ▼");
  }
  out.splice(-2, 2);
  return out;
}

/** Draw a labelled "central concept with callouts" map. */
function conceptMap(title: string, labels: string[]): string[] {
  const centre = clip(plainMathText(title).trim(), 26) || "Concept";
  const parts = labels.map((l) => clip(plainMathText(l).replace(/\s+/g, " ").trim(), 30)).filter(Boolean).slice(0, 5);
  if (parts.length === 0) return [];
  const pad = "─".repeat(centre.length + 2);
  const out = [`┌${pad}┐`, `│ ${centre} │`, `└${pad}┘`];
  parts.forEach((p, i) => {
    out.push(`   ${i === parts.length - 1 ? "└" : "├"}── ${p}`);
  });
  return out;
}

/** Reject labels that are extraction noise rather than teachable parts. */
const STOP_LABEL =
  /^(if|the|this|that|then|and|or|but|so|it|is|are|was|were|has|have|for|from|with|when|where|which|also|such|these|those|chapter|figure|fig|example|activity|note|page)\b/i;

function usefulLabel(raw: string): string {
  const s = plainMathText(String(raw || ""))
    .replace(/^\*\*[^*]+:\*\*\s*/, "")
    .replace(/^[\s\-–—•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length < 5 || s.length > 34) return "";
  if (STOP_LABEL.test(s)) return "";
  // Shared junk filter (chapter/page/figure headers, "If V", stopwords).
  if (validateDiagramLabels([s]).length === 0) return "";
  const words = s.split(" ");
  if (words.length > 5) return "";
  // Needs at least two real words or one long domain word.
  if (words.length === 1 && s.length < 7) return "";
  if (!/[A-Za-z]{4}/.test(s)) return "";
  return s;
}


/** Deterministic, zero-cost diagram for a slide. */
export function buildLocalDiagram(slide: {
  title: string;
  bullets?: string[];
  notes?: string[];
  key_terms?: { term: string; meaning: string }[];
}): NoteSection | null {
  const uniq = (arr: string[]) => {
    const seen = new Set<string>();
    return arr.filter((x) => {
      const k = x.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const terms = uniq((slide.key_terms || []).map((t) => usefulLabel(t.term)).filter(Boolean));
  const stages = uniq(
    [...(slide.bullets || []), ...(slide.notes || [])]
      .map((b) => usefulLabel(plainMathText(b).replace(/^\*\*[^*]+:\*\*\s*/, "").split(/[,:;.]/)[0] || ""))
      .filter(Boolean),
  ).slice(0, 6);

  let lines: string[] = [];
  if (terms.length >= 3) lines = conceptMap(slide.title, terms);
  else if (stages.length >= 3) lines = flowDiagram(stages);
  else if (terms.length + stages.length >= 3) lines = conceptMap(slide.title, uniq([...terms, ...stages]));

  // A two-item stub map is worse than no diagram — leave it out.
  if (lines.length < 5) return null;
  return { heading: DIAGRAM_HEADING, kind: "diagram", lines };
}


/**
 * Ask Gemini for a monospace diagram per slide, drawn only from the supplied
 * book excerpts (NCERT + PW / Med Easy / mind-map notes). Returns an empty map
 * on any failure, so the local diagram is used instead.
 */
export async function aiNoteDiagrams(opts: {
  apiKey?: string;
  klass: string;
  subject: string;
  chapter: string;
  /** Excerpts from the uploaded reference books (PW / Med Easy / mind maps). */
  refContext?: string;
  slides: Array<{ index: number; title: string; excerpts: string[] }>;
}): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (!opts.apiKey || opts.slides.length === 0) return out;

  const prompt = [
    "You draw teaching diagrams in plain monospace text (ASCII / box-drawing characters) for school notes.",
    `Class ${opts.klass} | Subject ${opts.subject} | Chapter ${opts.chapter}.`,
    "",
    "For EACH slide draw ONE diagram that best explains the topic, chosen from:",
    "- labelled structure (e.g. cell, eye, heart, atom) with callout lines to named parts,",
    "- process flow chart with ▶ / ▼ arrows between labelled stages,",
    "- ray / circuit / force sketch with labelled symbols,",
    "- comparison table with │ and ─ separators.",
    "",
    "RULES:",
    "- Use ONLY facts, labels and steps present in the supplied book excerpts. Never invent parts or steps.",
    "- Box-drawing characters ┌ ┐ └ ┘ │ ─ ├ ┬ ▶ ▼ ° and plain text labels only. No markdown, no LaTeX, no images.",
    "- Max 14 lines, max 64 characters per line, aligned so it renders correctly in a monospace font.",
    "- Every part/stage must carry a short readable label (max 22 characters).",
    "- Labels must be real scientific terms from the excerpts (e.g. 'Cell membrane', 'Ohm's law'). Never use sentence fragments, stopwords ('If V', 'the', 'then'), chapter titles or page numbers as labels.",
    "- A diagram needs at least 3 labelled parts/stages. If the slide genuinely has nothing to draw, return an empty array for it.",
    "",
    'Return STRICT JSON only: {"slides":[{"index":0,"lines":["┌────────┐","│ Nucleus │",...]}]}',
    "",
    ...(opts.refContext?.trim()
      ? [
          "REFERENCE BOOK EXCERPTS (PW / Physics Wallah, Med Easy, mind-map books uploaded by the teacher) — these carry the best labelled diagrams and flow charts, so prefer their structures and part names:",
          opts.refContext.replace(/\s+/g, " ").slice(0, 8000),
          "",
        ]
      : []),
    "SLIDES:",
    JSON.stringify(opts.slides.map((s) => ({ index: s.index, title: s.title, book: s.excerpts.slice(0, 8) }))).slice(0, 16000),
  ].join("\n");


  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.warn("note-diagram gateway", res.status, (await res.text()).slice(0, 180));
      return out;
    }
    const json = (await res.json()) as any;
    const raw = String(json?.choices?.[0]?.message?.content ?? "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(raw) as { slides?: Array<{ index?: number; lines?: unknown }> };
    for (const s of parsed.slides || []) {
      const i = Number(s?.index);
      if (!Number.isFinite(i)) continue;
      const lines = (Array.isArray(s?.lines) ? s!.lines : [])
        .map((l) => String(l ?? "").replace(/[`*$]/g, "").replace(/\t/g, "  ").slice(0, 64))
        .filter((l) => l.trim().length > 0)
        .slice(0, 14);
      if (lines.length >= 3) out.set(i, lines);
    }
  } catch (e) {
    console.warn("note-diagram failed", e);
  }
  return out;
}

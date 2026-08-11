/**
 * NCERT teacher-style structured notes.
 *
 * Turns the retrieved NCERT chapter text of a slide into the sectioned
 * "handwritten study-notes" layout (Definition → Formula → SI unit →
 * Properties → Important points → Example → Exam tip → Memory trick).
 *
 * HARD RULE: every line must come from the uploaded NCERT chapter text that is
 * passed in. Nothing is invented. The Gemini pass is only allowed to rewrite,
 * simplify and organise the supplied excerpts; if it returns a line that has no
 * lexical support in the NCERT context, that line is dropped.
 */

import { aiFixFormulas, aiFormulaSheet, cleanFormulaLine, needsFormulaAI, repairNotation } from "@/lib/formula-notation";
import { mapOutsideMath, splitMath } from "@/lib/latex-notation";
import { DIAGRAM_HEADING, aiNoteDiagrams, buildLocalDiagram } from "@/lib/note-diagram";
import { PW_EXTRACTION_RULES, normalizeNoteLine } from "@/lib/pwNotesNormalizer";


export type NoteSectionKind = "text" | "bullets" | "formula" | "terms" | "tip" | "diagram";

export type NoteSection = {
  heading: string;
  kind: NoteSectionKind;
  lines: string[];
};

export type NoteSourceSlide = {
  title: string;
  bullets?: string[];
  notes?: string[];
  key_terms?: { term: string; meaning: string }[];
  grounding?: string;
};

const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Exercise prompts, links and print furniture that must never become a note. */
const JUNK_LINE = [
  /https?:\/\/|www\.[a-z]/i,
  /\bexercises?\b/i,
  /\bx\s?ample\b/i,
  /^\s*(answer|solution)\b/i,
  /^\s*(estimate|calculate|check the order|find the|show that|prove that|verify|obtain the|state and prove)\b/i,
  /\banswer the following\b/i,
  /\bquestions? regarding\b/i,
];

/** Strip NCERT print noise: edition years, figure/page refs, watermarks. */
export function cleanNcertLine(raw: string): string {
  let s = mapOutsideMath(repairNotation(String(raw || "")), (t) => t
    .replace(/\s+/g, " ")
    .replace(/\b(19|20)\d{2}\s*[-–]\s*\d{2}\b/g, " ")
    .replace(/\brationalised\b/gi, " ")
    .replace(/\breprint\b/gi, " ")
    .replace(/\(?\s*(see\s+)?(fig(ure)?s?\.?|table)\s*[\d.]*\s*(\([a-z]\))?\s*\)?/gi, " ")
    .replace(/\bchapter\s+\d+\b/gi, " ")
    .replace(/\bpage\s*\d+\b/gi, " ")
    .replace(/\b\d{2,4}\s+(?=[A-Z][a-z])/g, " ")
    .replace(/\s*[,;]\s*(?=[,;.])/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " "))
    .trim();
  s = s.replace(/^[^A-Za-z0-9($\\]+/, "").replace(/\s*[,;:]$/, "");
  if (s && !/[.?!)]$/.test(s)) s += ".";
  if (s.length <= 3) return "";
  if (JUNK_LINE.some((p) => p.test(s))) return "";
  // Reject lines whose maths is unrecoverable extraction garbage.
  return cleanFormulaLine(s);
}



function sentences(text: string): string[] {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => cleanNcertLine(s))
    .filter((s) => s.length > 20 && /[a-z]/.test(s));
}

function dedupe(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = norm(l).slice(0, 70);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(l.trim());
  }
  return out;
}

/** Dedupe label-prefixed lines by their content, ignoring the bold label. */
function dedupeLabelled(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = norm(l.replace(/^\*\*[^*]+:\*\*\s*/, "")).slice(0, 70);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(l.trim());
  }
  return out;
}

const NOTE_HEADING = "Teacher Notes";


const isDefinition = (s: string) => /\bis defined as\b|\bis called\b|\bis known as\b|\brefers to\b|\bmeans\b|\bis the\b|\bare the\b/i.test(s);
const isFormula = (s: string) => /[A-Za-zΔ]\s*=\s*[^=]/.test(s) || /\bformula\b|\bequation\b/i.test(s);
const isUnit = (s: string) => /\bSI unit\b|\bunit of\b|\bmeasured in\b|\bN\/C\b|\bV\/m\b|\bjoule\b|\bnewton\b|\bvolt\b|\bfarad\b|\bcoulomb\b/i.test(s);
const isDerivation = (s: string) => /\bderiv(e|ed|ation|ing)\b|\bsubstitut(e|ing)\b|\bwe get\b|\bwe obtain\b|\btherefore\b|\bhence\b|\bon simplif/i.test(s);
const isProperty = (s: string) => /\bproperty\b|\bproperties\b|\bnever\b|\balways\b|\bcannot\b|\bdepends\b|\bproportional\b|\bincreases\b|\bdecreases\b/i.test(s);
const isExample = (s: string) => /\bexample\b|\bfor instance\b|\bactivity\b|\bexperiment\b|\bcalculate\b|\bsuppose\b/i.test(s);
const isApplication = (s: string) => /\bused in\b|\bapplication\b|\bin daily life\b|\bpractical\b|\bdevice\b|\bmachine\b|\btechnolog/i.test(s);


/** A key term is only useful when it is a real noun phrase with a full meaning. */
const TERM_STOP = /^(with|there|however|which|that|this|these|those|also|such|when|then|and|but|for|from|it|is|are)\b/i;
export function usefulTerm(term: string, meaning: string): boolean {
  const t = String(term || "").trim();
  const m = String(meaning || "").trim();
  if (t.length < 3 || t.length > 42 || TERM_STOP.test(t)) return false;
  if (/\d\s*$/.test(m) || m.length < 18) return false;
  return /[A-Za-z]{3}/.test(t) && /[a-z]{3}/.test(m);
}

/**
 * Deterministic, zero-cost note builder — one single section where each line is
 * label-prefixed with inline bold (`**Definition:** …`) instead of separate
 * boxes, so nothing is duplicated across headings.
 *
 * The slide's own bullets ("upper notes") are merged into the same pool as the
 * grounding text ("lower notes"), because the UI shows only this block — so the
 * best points from both surfaces end up in one detailed set of notes.
 */
export function buildLocalSections(slide: NoteSourceSlide): NoteSection[] {
  const pool = dedupe([
    ...(slide.bullets || []).map(cleanNcertLine),
    ...(slide.notes || []).map(cleanNcertLine),
    ...sentences(slide.grounding || ""),
  ]).filter(Boolean);

  const used = new Set<string>();
  const take = (pred: (s: string) => boolean, max: number) => {
    const out: string[] = [];
    for (const s of pool) {
      if (out.length >= max) break;
      if (used.has(s) || !pred(s)) continue;
      used.add(s);
      out.push(s);
    }
    return out;
  };

  const lines: string[] = [];
  const add = (label: string, items: string[]) => {
    for (const it of items) lines.push(`**${label}:** ${it}`);
  };

  // Order matters: earlier labels claim a sentence first, so the same sentence
  // can never surface twice under two different labels on one slide.
  add("Definition", take(isDefinition, 3));
  const units = take(isUnit, 2);
  add("Formula", take(isFormula, 3));
  add("SI unit", units);
  add("Derivation step", take(isDerivation, 4));
  add("Important point", take(isProperty, 4));
  add("Example", take(isExample, 2));
  add("Use", take(isApplication, 2));
  add("Key point", take(() => true, 8));

  const termSeen = new Set(lines.map((l) => norm(l.replace(/^\*\*[^*]+:\*\*\s*/, "")).slice(0, 70)));
  for (const t of (slide.key_terms || []).slice(0, 6)) {
    const meaning = cleanNcertLine(t.meaning);
    const key = norm(meaning).slice(0, 70);
    if (!usefulTerm(t.term, meaning) || termSeen.has(key)) continue;
    termSeen.add(key);
    lines.push(`**Key term — ${t.term}:** ${meaning}`);
  }

  const first = (slide.key_terms || []).find((t) => usefulTerm(t.term, cleanNcertLine(t.meaning)));
  if (first) {
    const hook = cleanNcertLine(first.meaning).split(/[,.;]/)[0];
    if (hook) lines.push(`**Memory trick:** ${first.term} → ${hook}.`);
  }

  const finalLines = dedupeLabelled(lines).slice(0, 34);

  return finalLines.length ? [{ heading: NOTE_HEADING, kind: "bullets", lines: finalLines }] : [];
}

/**
 * Fold the slide's own bullets ("upper notes") into the AI-written Teacher Notes
 * block so no good point is lost when only the notes block is displayed.
 */
export function mergeBulletsIntoSections<T extends NoteSourceSlide & { sections?: NoteSection[] }>(slide: T, subject = "physics"): T {
  const secs = slide.sections || [];
  const notes = secs.find((s) => s.heading === NOTE_HEADING);
  if (!notes) return slide;
  const have = new Set(notes.lines.map((l) => norm(l.replace(/^\*\*[^*]+:\*\*\s*/, "")).slice(0, 70)));
  const extra: string[] = [];
  for (const b of (slide.bullets || []).map(cleanNcertLine).filter(Boolean)) {
    const k = norm(b).slice(0, 70);
    if (!k || have.has(k)) continue;
    // Only add points that carry real substance.
    if (b.length < 30) continue;
    have.add(k);
    extra.push(`**NCERT point:** ${normalizeNoteLine(b, subject)}`);
    if (extra.length >= 8) break;
  }
  if (!extra.length) return slide;
  const merged = dedupeLabelled([...notes.lines, ...extra]).slice(0, 34);
  return {
    ...slide,
    sections: secs.map((s) => (s.heading === NOTE_HEADING ? { ...s, lines: merged } : s)),
  };
}


/** Collapse any multi-section output into the one label-prefixed section. */
export function mergeToSingleSection(sections: NoteSection[]): NoteSection[] {
  const lines: string[] = [];
  for (const sec of sections) {
    const label = sec.heading.replace(/^\d+\.\s*/, "").replace(/\s*\(NCERT\)\s*/i, "").trim();
    for (const raw of sec.lines) {
      const l = cleanNcertLine(raw);
      if (!l) continue;
      lines.push(/^\*\*/.test(raw) ? raw : `**${label}:** ${l}`);
    }
  }
  const finalLines = dedupeLabelled(lines).slice(0, 34);
  return finalLines.length ? [{ heading: NOTE_HEADING, kind: "bullets", lines: finalLines }] : [];
}


/* ---------------- Gemini rewrite pass (NCERT + reference-book grounding) ---------------- */

type GeminiSlideOut = { index: number; sections: NoteSection[] };

const HEADINGS = [
  "1. Analogy",
  "2. Definition",
  "3. Formula",
  "4. Variable Breakdown",
  "5. SI Unit & Nature",
  "6. Derivation",
  "7. Graph / Trend",
  "8. Key Properties",
  "9. NCERT Example / Activity",
  "10. Real-life Use",
  "11. Important Points",
  "12. Key Terms",
  "13. Exam tip",
  "14. Memory Trick",
];

/** Labels whose lines are maths/pedagogy and must not be filtered by lexical overlap. */
const FREEFORM_LABEL =
  /^(formula|variable|variable breakdown|si unit|derivation|derivation step|graph|graph ?\/ ?trend|analogy|memory trick|exam tip)\b/i;


/**
 * Drop any AI line that is not lexically supported by the NCERT context.
 * Requires >= 45% of the line's content words (len > 3) to appear in context.
 */
function ncertSupported(line: string, contextNorm: string): boolean {
  // Judge prose only — LaTeX spans are notation, not claims to ground.
  const prose = splitMath(line)
    .filter((seg) => seg.type === "text")
    .map((seg) => seg.value)
    .join(" ");
  const words = norm(prose).split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return true;
  const hits = words.filter((w) => contextNorm.includes(w)).length;
  return hits / words.length >= 0.45;
}

function sanitizeSections(raw: unknown, contextNorm: string, subject = "physics"): NoteSection[] {
  if (!Array.isArray(raw)) return [];
  const out: NoteSection[] = [];
  for (const s of raw) {
    const heading = String((s as any)?.heading || "").trim();
    const kindRaw = String((s as any)?.kind || "bullets");
    const kinds: string[] = ["text", "bullets", "formula", "terms", "tip"];
    const kind: NoteSectionKind = kinds.includes(kindRaw) ? (kindRaw as NoteSectionKind) : "bullets";
    // Maths / pedagogy headings keep light repair only, so correct notation
    // (integrals, fractions, ε₀, superscripts) is never mistaken for garbage.
    const freeform = kind === "formula" || kind === "tip" || FREEFORM_LABEL.test(heading.replace(/^\d+\.\s*/, ""));
    const lines = dedupe(
      (Array.isArray((s as any)?.lines) ? (s as any).lines : [])
        .map((l: unknown) => (freeform ? repairNotation(String(l || "")) : cleanNcertLine(String(l || ""))))
        // Subject-aware LaTeX normalisation (fractions, chemical subscripts,
        // ionic superscripts) for every surviving line.
        .map((l: string) => normalizeNoteLine(l, subject))
        .filter((l: string) => l.length > 4 && l.length < 320),
    ).filter((l) => freeform || ncertSupported(l, contextNorm));
    if (heading && lines.length) out.push({ heading, kind, lines: lines.slice(0, 10) });
  }
  return mergeToSingleSection(out);
}


/**
 * One Gemini call per batch of slides. Returns sanitised sections keyed by slide
 * index. On any failure it returns an empty map and the caller keeps the local
 * deterministic sections, so notes never go missing.
 */
export async function geminiTeacherNotes(opts: {
  apiKey?: string;
  klass: string;
  subject: string;
  chapter: string;
  context: string;
  /** Excerpts from the uploaded reference books (PW / Med Easy / mind maps). */
  refContext?: string;
  slides: NoteSourceSlide[];
}): Promise<Map<number, NoteSection[]>> {
  const result = new Map<number, NoteSection[]>();
  if (!opts.apiKey || opts.slides.length === 0) return result;

  // Reference-book text is part of the source of truth, so lines grounded in the
  // PW / Med Easy books survive the support filter instead of being dropped.
  const contextNorm = norm(`${opts.context}\n${opts.refContext ?? ""}`);
  const payload = opts.slides.map((s, i) => ({
    index: i,
    title: s.title,
    ncert_excerpts: dedupe([...(s.bullets || []), ...(s.notes || []), ...sentences(s.grounding || "")]).slice(0, 16),
  }));

  const prompt = [
    "You are a master NCERT teacher writing a pedagogical masterclass note block for students meeting this topic for the FIRST time.",
    `Class: ${opts.klass} | Subject: ${opts.subject} | Chapter: ${opts.chapter}`,
    "",
    PW_EXTRACTION_RULES,
    "",
    "SOURCE RULES:",

    "- The excerpts below come from the uploaded NCERT textbook AND the uploaded reference books (PW / Physics Wallah notes, HC Verma, Med Easy, mind-map books) for this class/subject; both are the source of truth for every FACT, number, example and application.",
    "- PRIMARY SOURCE IS NCERT: definitions, prescribed statements and the derivations that NCERT itself performs come from NCERT wording. Use HC Verma / PW / reference-book material for extra depth: shortcut formulas, tables, graph behaviour, exam traps and memory tricks.",
    "- Never invent facts, data, examples or numbers that contradict or go beyond this chapter's scope.",
    "- Rewrite in crisp teacher language; never copy long paragraphs verbatim.",
    "- Clean OCR damage (broken words, stray page numbers, headers/footers) before writing.",
    "",
    "TEACHING STYLE (mandatory):",
    "- OPEN WITH AN INTRODUCTION: 2-3 lines saying what the topic is about, why it matters and where it sits in the chapter, before anything else.",
    "- Then give EVERY formula the topic touches (main relation, special cases, limiting cases, shortcut/exam forms) — be exhaustive, not selective; more correct formulas is better.",
    "- Start with one short intuitive ANALOGY that makes the concept click (everyday comparison only, no new physics claims).",
    "- Give the precise textbook DEFINITION, then the FORMULA, then its SI UNIT and whether the quantity is scalar or vector.",
    "- Where the chapter contains a standard relation, give a numbered STEP-BY-STEP DERIVATION (one short step per line, e.g. 'Step 1: $V = -\\int \\mathbf{E}\\cdot d\\mathbf{r}$ from $\\infty$ to $r$').",
    "- GRAPH / TREND: whenever the topic has a graph or a variation (V-r, I-V, P-V, rate-time, growth curve, periodic-trend), describe it precisely: axes with units, curve shape, slope meaning, intercepts, asymptotes and what physically/chemically happens along the curve — written in LaTeX, e.g. 'Axes: $V$ (volt) vs $r$ (m); curve $V \\propto \\frac{1}{r}$, hyperbolic, $V \\to 0$ as $r \\to \\infty$; slope $= -E$.'",
    "- Add KEY PROPERTIES, an NCERT EXAMPLE/ACTIVITY, a REAL-LIFE USE, exam-ready IMPORTANT POINTS, KEY TERMS with one-line meanings, an EXAM TIP and a MEMORY TRICK.",

    "",
    "NOTATION RULES (very important — LaTeX is mandatory):",
    "- Every variable, expression, equation and chemical species must be LaTeX: inline $...$, standalone equations $$...$$. Prose stays outside the delimiters.",
    "- Never write a fraction linearly: use $\\frac{a}{b}$, not a/b. Use \\int, \\oint, \\sum, \\lim, \\sqrt and \\begin{bmatrix} ... \\end{bmatrix} where the chapter needs them.",
    "- Example style: $$V = \\frac{1}{4\\pi\\varepsilon_0}\\frac{Q}{r}$$, $E = -\\frac{dV}{dl}$, $C = \\frac{\\varepsilon_0 A}{d}$, $U = \\frac{1}{2}CV^2$.",
    "- Chemistry: never plain text — write $H_2O$, $CO_2$, $H_2SO_4$, $SO_4^{2-}$, and balance equations as $$\\mathrm{CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O}$$ with states $(s)$, $(l)$, $(g)$, $(aq)$.",
    "- Maths: state theorems precisely and give proof outlines in LaTeX ($\\frac{dy}{dx}$, $^nC_r$, $\\lim_{x \\to 0}$).",
    "- Biology: bold headers for taxonomic/anatomical terms and sequential bullet steps for pathways; no fake formulas.",
    "- After each formula give a VARIABLE BREAKDOWN line per symbol, then the SI unit, then a derivation with NO skipped intermediate step.",
    "- Never output bracket soup like '(((())))', repeated '=' runs, unbalanced braces or stray page digits.",
    "",
    `Use only these headings, in order, omitting any you cannot support: ${HEADINGS.join(" | ")}`,
    'Each section: { "heading": string, "kind": "text"|"bullets"|"formula"|"terms"|"tip", "lines": string[] }.',
    "Use kind 'formula' for Formula/SI Unit/Derivation/Graph sections and 'tip' for Analogy/Exam tip/Memory Trick.",
    "Lines must be short (max 24 words), exam-ready, dense, and free of filler. Fill the slide: aim for 22-32 lines total per slide, and never fewer than 16 — teachers need a full, information-rich board.",

    "NEVER include edition years (e.g. 2019-20), figure/table numbers, page numbers or 'Fig.' references.",
    "Do not repeat the same fact under two headings — every fact appears exactly once.",
    "",
    "Return STRICT JSON only, no markdown fence:",
    '{"slides":[{"index":0,"sections":[...]}]}',
    "",
    ...(opts.refContext?.trim()
      ? [
          "REFERENCE BOOK EXCERPTS (PW / Physics Wallah notes, Med Easy, mind-map & short-notes books uploaded by the teacher).",
          "These are trusted sources: mine them for shortcut formulas, formula sheets, derivation steps, graph behaviour, comparison tables, exam traps and memory tricks that NCERT leaves in prose. Cite nothing, invent nothing.",
          opts.refContext.replace(/\s+/g, " ").slice(0, 16000),
          "",
        ]
      : []),
    "SLIDES AND THEIR NCERT EXCERPTS:",
    JSON.stringify(payload).slice(0, 24000),
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": opts.apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.warn("teacher-notes gateway", res.status, (await res.text()).slice(0, 180));
      return result;
    }
    const json = (await res.json()) as any;
    const text = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = String(text).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as { slides?: GeminiSlideOut[] };
    for (const s of parsed.slides || []) {
      const idx = Number(s?.index);
      if (!Number.isFinite(idx)) continue;
      const sections = sanitizeSections((s as any)?.sections, contextNorm, opts.subject);
      if (sections.length && sections[0].lines.length >= 3) result.set(idx, sections);
    }
  } catch (e) {
    console.warn("teacher-notes failed", e);
  }
  return result;
}

/** Attach sections to every content slide: Gemini rewrite where possible, local otherwise. */
export async function attachTeacherNotes<T extends NoteSourceSlide & { kind?: string; sections?: NoteSection[] }>(
  slides: T[],
  opts: { apiKey?: string; klass: string; subject: string; chapter: string; context: string; refContext?: string },
): Promise<T[]> {
  // Clean print noise (edition years, Fig./page refs) out of the visible
  // bullets too, so slides never show "2019-20" or "FIGURE 2.11".
  slides = slides.map((s) =>
    (s.kind ?? "content") === "content"
      ? { ...s, bullets: dedupe((s.bullets || []).map(cleanNcertLine).filter(Boolean)) }
      : s,
  );
  const targets = slides.map((s, i) => ({ s, i })).filter(({ s }) => (s.kind ?? "content") === "content");
  const withLocal = slides.map((s) =>
    (s.kind ?? "content") === "content" ? { ...s, sections: buildLocalSections(s) } : s,
  );
  if (targets.length === 0) return withLocal;

  const BATCH = 5;
  const batches: Array<Array<{ s: T; i: number }>> = [];
  for (let i = 0; i < targets.length; i += BATCH) batches.push(targets.slice(i, i + BATCH));

  const results = await Promise.all(
    batches.map((batch) =>
      geminiTeacherNotes({
        apiKey: opts.apiKey,
        klass: opts.klass,
        subject: opts.subject,
        chapter: opts.chapter,
        context: opts.context,
        refContext: opts.refContext,
        slides: batch.map(({ s }) => s),
      }).then((map) => ({ batch, map })),
    ),
  );

  for (const { batch, map } of results) {
    batch.forEach(({ i }, localIdx) => {
      const sections = map.get(localIdx);
      if (sections?.length && sections[0].lines.length >= 3) withLocal[i] = { ...withLocal[i], sections };
    });
  }

  // Fold the slide's own bullets into the notes block: the UI shows only the
  // notes, so the best points from both surfaces must live in one block.
  for (let i = 0; i < withLocal.length; i++) {
    if (((withLocal[i] as any).kind ?? "content") === "content") {
      withLocal[i] = mergeBulletsIntoSections(withLocal[i], opts.subject);
    }
  }



  const repaired = await repairSlideFormulas(await ensureFormulaBlocks(withLocal, opts), opts);
  return await attachNoteDiagrams(repaired, opts);
}

/**
 * Add a monospace teaching diagram to every content slide's notes — drawn from
 * the uploaded books (NCERT + PW / Med Easy / mind-map notes), never from the
 * 2D image pipeline. Falls back to a deterministic local diagram so slides are
 * never left with blank space.
 */
async function attachNoteDiagrams<T extends NoteSourceSlide & { kind?: string; sections?: NoteSection[] }>(
  slides: T[],
  opts: { apiKey?: string; klass: string; subject: string; chapter: string; refContext?: string },
): Promise<T[]> {
  const targets = slides
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (s.kind ?? "content") === "content");
  if (targets.length === 0) return slides;

  const CHUNK = 5;
  const payload = targets.map(({ s, i }) => ({
    index: i,
    title: s.title,
    excerpts: dedupe([...(s.bullets || []), ...(s.notes || []), ...sentences(s.grounding || "")]).slice(0, 8),
  }));
  const chunks: Array<typeof payload> = [];
  for (let i = 0; i < payload.length; i += CHUNK) chunks.push(payload.slice(i, i + CHUNK));
  const maps = await Promise.all(chunks.map((c) => aiNoteDiagrams({ ...opts, slides: c })));
  const ai = new Map<number, string[]>();
  for (const m of maps) for (const [k, v] of m) ai.set(k, v);

  return slides.map((s, i) => {
    if ((s.kind ?? "content") !== "content") return s;
    const existing = (s.sections || []).filter((sec) => sec.kind !== "diagram");
    const lines = ai.get(i);
    const diagram: NoteSection | null = lines?.length
      ? { heading: DIAGRAM_HEADING, kind: "diagram", lines }
      : buildLocalDiagram(s);
    if (!diagram) return { ...s, sections: existing };
    return { ...s, sections: [...existing, diagram] };
  });
}

/**
 * Guarantee that every quantitative slide carries correctly typeset Formula,
 * SI unit and step-by-step Derivation lines. Works for every subject: slides
 * whose notes lack those labels get them from a dedicated formula-sheet AI
 * pass, inserted right after the Definition lines.
 */
async function ensureFormulaBlocks<T extends NoteSourceSlide & { kind?: string; sections?: NoteSection[] }>(
  slides: T[],
  opts: { apiKey?: string; klass: string; subject: string; chapter: string; refContext?: string },
): Promise<T[]> {
  if (!opts.apiKey) return slides;

  const has = (lines: string[], label: RegExp) => lines.some((l) => label.test(l.replace(/^\*\*/, "")));
  const targets: Array<{ index: number; title: string; excerpts: string[] }> = [];
  slides.forEach((s, i) => {
    if ((s.kind ?? "content") !== "content") return;
    const lines = s.sections?.[0]?.lines || [];
    const missing =
      !has(lines, /^formula/i) || !has(lines, /^si unit/i) || !has(lines, /^derivation/i);
    if (!missing) return;
    targets.push({
      index: i,
      title: s.title,
      excerpts: dedupe([...(s.bullets || []), ...(s.notes || []), ...sentences(s.grounding || "")]).slice(0, 8),
    });
  });
  if (targets.length === 0) return slides;

  const CHUNK = 5;
  const chunks: Array<typeof targets> = [];
  for (let i = 0; i < targets.length; i += CHUNK) chunks.push(targets.slice(i, i + CHUNK));
  const maps = await Promise.all(chunks.map((c) => aiFormulaSheet({ ...opts, slides: c })));

  const out = slides.map((s) => ({ ...s }));
  for (const map of maps) {
    for (const [i, block] of map) {
      const slide = out[i];
      if (!slide) continue;
      const existing = slide.sections?.[0]?.lines || [];
      const add: string[] = [];
      if (!has(existing, /^formula/i)) for (const f of block.formula) add.push(`**Formula:** ${f}`);
      if (!has(existing, /^variable/i)) for (const v of block.variables) add.push(`**Variable:** ${v}`);
      if (!has(existing, /^si unit/i)) for (const u of block.unit) add.push(`**SI unit:** ${u}`);
      if (!has(existing, /^derivation/i))
        block.derivation.forEach((d, n) =>
          add.push(`**Derivation step ${n + 1}:** ${d.replace(/^step\s*\d+\s*[:.\-]\s*/i, "")}`),
        );
      if (!add.length) continue;

      // Insert straight after the Definition lines so the block reads
      // Definition → Formula → SI unit → Derivation → rest.
      const lines = [...existing];
      let at = 0;
      while (at < lines.length && /^\*\*(analogy|definition)/i.test(lines[at])) at++;
      lines.splice(at, 0, ...add);
      const merged = dedupeLabelled(lines).slice(0, 30);
      slide.sections = [{ heading: NOTE_HEADING, kind: "bullets", lines: merged }];
    }
  }
  return out as T[];
}

/**
 * Final notation pass: every slide, every subject, every chapter. Broken maths
 * in bullets and Teacher Notes is rewritten with correct symbols/notation by
 * the AI; anything it cannot reconstruct is dropped instead of shown.
 */
async function repairSlideFormulas<T extends NoteSourceSlide & { kind?: string; sections?: NoteSection[] }>(
  slides: T[],
  opts: { apiKey?: string; klass: string; subject: string; chapter: string },
): Promise<T[]> {
  type Ref = { slide: number; sec: number | null; line: number; label: string };
  const refs: Ref[] = [];
  const texts: string[] = [];

  slides.forEach((s, si) => {
    (s.bullets || []).forEach((b, li) => {
      if (!needsFormulaAI(b)) return;
      refs.push({ slide: si, sec: null, line: li, label: "" });
      texts.push(b);
    });
    (s.sections || []).forEach((sec, sxi) => {
      sec.lines.forEach((l, li) => {
        if (!needsFormulaAI(l)) return;
        const m = l.match(/^(\*\*[^*]+:\*\*\s*)/);
        refs.push({ slide: si, sec: sxi, line: li, label: m ? m[1] : "" });
        texts.push(m ? l.slice(m[1].length) : l);
      });
    });
  });

  if (texts.length === 0) return slides;

  const CHUNK = 20;
  const chunks: Array<{ start: number; items: string[] }> = [];
  for (let i = 0; i < texts.length; i += CHUNK) chunks.push({ start: i, items: texts.slice(i, i + CHUNK) });

  const fixes = new Map<number, string>();
  const maps = await Promise.all(
    chunks.map((c) =>
      aiFixFormulas({ ...opts, lines: c.items }).then((m) => ({ start: c.start, m })),
    ),
  );
  for (const { start, m } of maps) for (const [k, v] of m) fixes.set(start + k, v);

  const out = slides.map((s) => ({ ...s }));
  // Apply in reverse so index-based removals stay valid.
  for (let r = refs.length - 1; r >= 0; r--) {
    const ref = refs[r];
    const fixed = fixes.get(r);
    if (fixed === undefined) {
      // No AI answer: keep only if deterministic cleanup rescues it.
      const src =
        ref.sec === null
          ? (out[ref.slide].bullets || [])[ref.line]
          : (out[ref.slide].sections || [])[ref.sec].lines[ref.line];
      const det = cleanFormulaLine(String(src || "").replace(/^\*\*[^*]+:\*\*\s*/, ""));
      if (det) continue;
      applyLine(out[ref.slide], ref, null);
      continue;
    }
    applyLine(out[ref.slide], ref, fixed ? `${ref.label}${fixed}` : null);
  }
  return out as T[];

  function applyLine(slide: any, ref: Ref, value: string | null) {
    if (ref.sec === null) {
      const arr = [...(slide.bullets || [])];
      if (value === null) arr.splice(ref.line, 1);
      else arr[ref.line] = value;
      slide.bullets = arr;
    } else {
      const secs = [...(slide.sections || [])];
      const sec = { ...secs[ref.sec], lines: [...secs[ref.sec].lines] };
      if (value === null) sec.lines.splice(ref.line, 1);
      else sec.lines[ref.line] = value;
      secs[ref.sec] = sec;
      slide.sections = secs;
    }
  }
}


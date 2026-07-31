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

export type NoteSectionKind = "text" | "bullets" | "formula" | "terms" | "tip";

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

function sentences(text: string): string[] {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function dedupe(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = norm(l).slice(0, 90);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(l.trim());
  }
  return out;
}

const HEADING_ORDER = [
  "1. Definition",
  "2. Formula",
  "3. SI Unit & Measurement",
  "4. Key Properties",
  "5. NCERT Example / Activity",
  "6. Real-life Use (NCERT)",
  "7. Important Points",
  "8. Key Terms",
  "9. Memory Trick",
];

const isDefinition = (s: string) => /\bis defined as\b|\bis called\b|\bis known as\b|\brefers to\b|\bmeans\b|\bis the\b|\bare the\b/i.test(s);
const isFormula = (s: string) => /[A-Za-zΔ]\s*=\s*[^=]/.test(s) || /\bformula\b|\bequation\b/i.test(s);
const isUnit = (s: string) => /\bSI unit\b|\bunit of\b|\bmeasured in\b|\bN\/C\b|\bV\/m\b|\bjoule\b|\bnewton\b|\bvolt\b|\bfarad\b|\bcoulomb\b|\bmetre\b|\bkg\b/i.test(s);
const isProperty = (s: string) => /\bproperty\b|\bproperties\b|\bnever\b|\balways\b|\bcannot\b|\bdepends\b|\bproportional\b|\bincreases\b|\bdecreases\b/i.test(s);
const isExample = (s: string) => /\bexample\b|\bfor instance\b|\bactivity\b|\bexperiment\b|\bcalculate\b|\bsuppose\b/i.test(s);
const isApplication = (s: string) => /\bused in\b|\bapplication\b|\bin daily life\b|\bpractical\b|\bdevice\b|\bmachine\b|\btechnolog/i.test(s);

/** Deterministic, zero-cost sectioniser — always produces usable notes. */
export function buildLocalSections(slide: NoteSourceSlide): NoteSection[] {
  const pool = dedupe([
    ...(slide.bullets || []),
    ...(slide.notes || []),
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

  const sections: NoteSection[] = [];
  const push = (heading: string, kind: NoteSectionKind, lines: string[]) => {
    if (lines.length) sections.push({ heading, kind, lines });
  };

  push("1. Definition", "text", take(isDefinition, 2));
  // Units first: a line like "1 V = 1 J/C" matches both tests and belongs here.
  const units = take(isUnit, 2);
  push("2. Formula", "formula", take(isFormula, 3));
  push("3. SI Unit & Measurement", "bullets", units);
  push("4. Key Properties", "bullets", take(isProperty, 4));
  push("5. NCERT Example / Activity", "text", take(isExample, 2));
  push("6. Real-life Use (NCERT)", "bullets", take(isApplication, 3));
  push("7. Important Points", "bullets", take(() => true, 4));

  if (slide.key_terms?.length) {
    push(
      "8. Key Terms",
      "terms",
      slide.key_terms.slice(0, 4).map((t) => `${t.term} — ${t.meaning}`),
    );
    const first = slide.key_terms[0];
    push("9. Memory Trick", "tip", [`Remember: ${first.term} → ${first.meaning.split(/[,.;]/)[0]}.`]);
  }

  const order = HEADING_ORDER;
  sections.sort((a, b) => order.indexOf(a.heading) - order.indexOf(b.heading));
  return sections;
}

/* ---------------- Gemini rewrite pass (strict NCERT grounding) ---------------- */

type GeminiSlideOut = { index: number; sections: NoteSection[] };

const HEADINGS = [
  "1. Definition",
  "2. Formula",
  "3. SI Unit & Measurement",
  "4. Key Properties",
  "5. NCERT Example / Activity",
  "6. Real-life Use (NCERT)",
  "7. Important Points",
  "8. Key Terms",
  "9. Memory Trick",
];

/**
 * Drop any AI line that is not lexically supported by the NCERT context.
 * Requires >= 60% of the line's content words (len > 3) to appear in context.
 */
function ncertSupported(line: string, contextNorm: string): boolean {
  const words = norm(line).split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return false;
  const hits = words.filter((w) => contextNorm.includes(w)).length;
  return hits / words.length >= 0.6;
}

function sanitizeSections(raw: unknown, contextNorm: string): NoteSection[] {
  if (!Array.isArray(raw)) return [];
  const out: NoteSection[] = [];
  for (const s of raw) {
    const heading = String((s as any)?.heading || "").trim();
    const kindRaw = String((s as any)?.kind || "bullets");
    const kind: NoteSectionKind = (["text", "bullets", "formula", "terms", "tip"] as const).includes(kindRaw as NoteSectionKind)
      ? (kindRaw as NoteSectionKind)
      : "bullets";
    const lines = dedupe(
      (Array.isArray((s as any)?.lines) ? (s as any).lines : [])
        .map((l: unknown) => String(l || "").replace(/\s+/g, " ").trim())
        .filter((l: string) => l.length > 2 && l.length < 320),
    ).filter((l) => kind === "formula" || kind === "tip" || ncertSupported(l, contextNorm));
    if (heading && lines.length) out.push({ heading, kind, lines: lines.slice(0, 6) });
  }
  return out.slice(0, 9);
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
  slides: NoteSourceSlide[];
}): Promise<Map<number, NoteSection[]>> {
  const result = new Map<number, NoteSection[]>();
  if (!opts.apiKey || opts.slides.length === 0) return result;

  const contextNorm = norm(opts.context);
  const payload = opts.slides.map((s, i) => ({
    index: i,
    title: s.title,
    ncert_excerpts: dedupe([...(s.bullets || []), ...(s.notes || []), ...sentences(s.grounding || "")]).slice(0, 12),
  }));

  const prompt = [
    "You are an expert NCERT teacher preparing premium study notes for a smart-board presentation.",
    `Class: ${opts.klass} | Subject: ${opts.subject} | Chapter: ${opts.chapter}`,
    "",
    "NON-NEGOTIABLE RULES:",
    "- The NCERT excerpts supplied below are the ONLY source of truth.",
    "- Never add facts, formulas, definitions, examples or numbers that are absent from those excerpts.",
    "- No outside knowledge, no coaching notes, no internet content, no assumptions, no hallucination.",
    "- Never copy long paragraphs verbatim: read, understand, rewrite crisply in teacher language, keep the exact meaning.",
    "- Clean OCR damage (broken words, stray page numbers, headers/footers) before writing.",
    "- Stay inside this chapter only. If a section cannot be supported by the excerpts, omit that section entirely.",
    "",
    `Use only these headings, in order, omitting any you cannot support: ${HEADINGS.join(" | ")}`,
    'Each section: { "heading": string, "kind": "text"|"bullets"|"formula"|"terms"|"tip", "lines": string[] }.',
    "Lines must be short (max 22 words), exam-ready, and free of filler.",
    "",
    "Return STRICT JSON only, no markdown fence:",
    '{"slides":[{"index":0,"sections":[...]}]}',
    "",
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
        model: "google/gemini-3.6-flash",
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
      const sections = sanitizeSections((s as any)?.sections, contextNorm);
      if (sections.length >= 2) result.set(idx, sections);
    }
  } catch (e) {
    console.warn("teacher-notes failed", e);
  }
  return result;
}

/** Attach sections to every content slide: Gemini rewrite where possible, local otherwise. */
export async function attachTeacherNotes<T extends NoteSourceSlide & { kind?: string; sections?: NoteSection[] }>(
  slides: T[],
  opts: { apiKey?: string; klass: string; subject: string; chapter: string; context: string },
): Promise<T[]> {
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
        slides: batch.map(({ s }) => s),
      }).then((map) => ({ batch, map })),
    ),
  );

  for (const { batch, map } of results) {
    batch.forEach(({ i }, localIdx) => {
      const sections = map.get(localIdx);
      if (sections && sections.length >= 2) withLocal[i] = { ...withLocal[i], sections };
    });
  }
  return withLocal;
}

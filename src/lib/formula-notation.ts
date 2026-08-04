/**
 * Formula / math-notation repair for NCERT PDF text.
 *
 * NCERT PDFs embed equations as vector glyphs, so raw text extraction produces
 * garbage like "( ( ( ( ) ) ) ) 1 – 1 2 1 2 s m 8.7 s 5 7 m 0 10 4 27 = = = =".
 * This module does two things:
 *   1. Deterministic, zero-cost repair + garbage detection (runs always).
 *   2. An AI pass (Gemini via Lovable AI Gateway) that rewrites the surviving
 *      broken math into correct notation and symbols, grounded in the NCERT
 *      sentence it came from. Works for every subject and every chapter.
 */

import { hasMath, mapOutsideMath } from "@/lib/latex-notation";

/* ---------------- deterministic layer ---------------- */

const SYMBOL_MAP: Array<[RegExp, string]> = [
  [/\s*<=>\s*/g, " ⇌ "],
  [/\s*-->?\s*/g, " → "],
  [/\s*<-\s*/g, " ← "],
  [/\balpha\b/gi, "α"],
  [/\bbeta\b/gi, "β"],
  [/\bgamma\b/gi, "γ"],
  [/\bdelta\s+(?=[a-zA-Z])/gi, "Δ"],
  [/\btheta\b/gi, "θ"],
  [/\blambda\b/gi, "λ"],
  [/\bomega\b/gi, "ω"],
  [/\bmu\b/g, "μ"],
  [/\bpi\b/g, "π"],
  [/\bsqrt\s*/gi, "√"],
  [/\bdegrees?\b/gi, "°"],
  [/\s*\*\s*/g, " × "],
  [/(\d)\s*x\s*10\s*\^?\s*(-?\d+)/gi, "$1 × 10^$2"],
  [/\s*<=\s*/g, " ≤ "],
  [/\s*>=\s*/g, " ≥ "],
  [/\s*!=\s*/g, " ≠ "],
  [/\s*~=\s*/g, " ≈ "],
  [/\bm\/s2\b/g, "m s⁻²"],
  [/\bm\/s\b/g, "m s⁻¹"],
  [/\bms-1\b/gi, "m s⁻¹"],
  [/\bms-2\b/gi, "m s⁻²"],
];

/** Light, always-safe cleanup of math punctuation and symbols. */
export function repairNotation(raw: string): string {
  // LaTeX spans ($...$ / $$...$$) are authored notation — never touch them.
  return mapOutsideMath(String(raw || ""), repairPlainNotation);
}

function repairPlainNotation(raw: string): string {
  let s = String(raw || "");

  // Kill empty bracket runs: "( ( ( ( ) ) ) )" and "()" leftovers.
  s = s.replace(/[([{]\s*[)\]}]/g, " ");
  for (let i = 0; i < 4; i++) s = s.replace(/[([{]\s*[([{]/g, "(").replace(/[)\]}]\s*[)\]}]/g, ")");
  s = s.replace(/\(\s*\)/g, " ");

  // Collapse repeated operators produced by glyph loss.
  s = s
    .replace(/([=+×÷])\s*(?:\1\s*){1,}/g, "$1 ")
    .replace(/[-–—]{2,}/g, " ")
    .replace(/(?:\s[-–—]\s){2,}/g, " ");

  // Re-join letters that were exploded one character apart ("d e m a n d").
  s = s.replace(/(?:\b[a-z]\s){2,}\b[a-z]\b/g, (m) => m.replace(/\s+/g, ""));

  for (const [re, rep] of SYMBOL_MAP) s = s.replace(re, rep);

  return s.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
}

/**
 * True when a line is unrecoverable extraction garbage: mostly symbols/digits,
 * stray bracket soup, or long runs of isolated characters.
 */
export function isGarbledMath(raw: string): boolean {
  const s = String(raw || "");
  if (!s) return false;
  // Properly authored LaTeX is never garbage — only its prose is inspected.
  if (hasMath(s)) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  const digitsSym = (s.match(/[0-9=+\-–—×÷^_/()[\]{}<>|]/g) || []).length;
  const words = s.split(/\s+/).filter(Boolean);
  const singles = words.filter((w) => w.length === 1).length;

  if (/[([{]\s*[([{]\s*[([{]/.test(s)) return true;
  if (/[=]\s*[=]\s*[=]/.test(s)) return true;
  if ((s.match(/[-–—]/g) || []).length >= 6) return true;
  if (words.length >= 6 && singles / words.length > 0.45) return true;
  if (digitsSym > letters && digitsSym > 8) return true;
  return false;
}

/**
 * Deterministic pipeline used everywhere: repair, then reject if still garbage.
 * Returns "" when the line should be dropped.
 */
export function cleanFormulaLine(raw: string): string {
  const fixed = repairNotation(raw);
  if (!fixed || isGarbledMath(fixed)) return "";
  return fixed;
}

/* ---------------- AI layer ---------------- */

const MATHY = /[=∝±×÷√Δ]|[A-Za-z]\s*=|\b(formula|equation|unit|per second|derivation)\b/i;

/** Lines worth sending to the formula AI. */
export function needsFormulaAI(line: string): boolean {
  const body = line.replace(/^\*\*[^*]+:\*\*\s*/, "");
  return MATHY.test(body) && (isGarbledMath(body) || /[([{]\s*[)\]}]/.test(body) || /\d\s\d\s\d/.test(body));
}

/**
 * Rewrite broken math lines into correct notation with proper symbols.
 * Grounded: the model may only re-typeset what the line already contains and
 * must return an empty string when the maths cannot be reconstructed.
 * Works for every subject / chapter — nothing is hardcoded per topic.
 */
export async function aiFixFormulas(opts: {
  apiKey?: string;
  klass: string;
  subject: string;
  chapter: string;
  lines: string[];
}): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (!opts.apiKey || opts.lines.length === 0) return out;

  const payload = opts.lines.map((text, index) => ({ index, text }));
  const prompt = [
    "You repair mathematical and scientific notation damaged by PDF text extraction.",
    `Class ${opts.klass} | Subject ${opts.subject} | Chapter ${opts.chapter}.`,
    "",
    "RULES:",
    "- Rewrite each line so every formula, equation and chemical species uses correct LaTeX notation.",
    "- Wrap ALL maths in LaTeX: inline as $...$, standalone equations as $$...$$. Prose stays outside the $ delimiters.",
    "- Never write a fraction linearly: use $\\frac{a}{b}$, not a/b. Use \\int, \\oint, \\sum, \\lim, \\sqrt, \\begin{bmatrix} where needed.",
    "- Chemistry: always subscript/superscript species — $H_2O$, $CO_2$, $H_2SO_4$, $SO_4^{2-}$ — and balance equations with \\rightarrow or \\rightleftharpoons plus states $(s)$, $(l)$, $(g)$, $(aq)$.",
    "- Keep the sentence's meaning and its numbers; never invent new physics, chemistry, biology or maths.",
    "- Delete bracket soup like '((((()))))', repeated '=' or '-' runs, and stray page digits.",
    "- Re-join words broken into single letters (e.g. 'd e m a n d' → 'demand').",
    "- Standard chapter formulas may be written correctly (e.g. $v = u + at$, $s = ut + \\frac{1}{2}at^2$, $PV = nRT$) ONLY if the damaged line clearly refers to that relation.",
    "- If the maths in a line is unrecoverable, return an empty string for that line so it can be dropped.",
    "- Return the line as plain text with LaTeX spans, max 30 words, no markdown fences.",
    "",
    'Return STRICT JSON: {"lines":[{"index":0,"text":"..."}]}',
    "",
    "DAMAGED LINES:",
    JSON.stringify(payload).slice(0, 12000),
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": opts.apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.warn("formula-ai gateway", res.status, (await res.text()).slice(0, 180));
      return out;
    }
    const json = (await res.json()) as any;
    const raw = String(json?.choices?.[0]?.message?.content ?? "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(raw) as { lines?: Array<{ index?: number; text?: string }> };
    for (const l of parsed.lines || []) {
      const i = Number(l?.index);
      if (!Number.isFinite(i)) continue;
      const fixed = repairNotation(String(l?.text || ""));
      out.set(i, isGarbledMath(fixed) ? "" : fixed);
    }
  } catch (e) {
    console.warn("formula-ai failed", e);
  }
  return out;
}

/* ---------------- guaranteed formula / SI unit / derivation sheet ---------------- */

export type FormulaBlock = {
  /** Correctly typeset LaTeX formulas, e.g. "$V = \\frac{1}{4\\pi\\varepsilon_0}\\frac{Q}{r}$". */
  formula: string[];
  /** Variable breakdown lines, e.g. "$\\varepsilon_0$: permittivity of free space". */
  variables: string[];
  /** SI unit lines, e.g. "Potential $V$ → volt (V) $= \\mathrm{J\\,C^{-1}}$, scalar." */
  unit: string[];
  /** Numbered derivation steps, one short step per line. */
  derivation: string[];
};

/**
 * Ask the AI for the formulas, variable definitions, SI units and step-by-step
 * derivations of a slide, written in correct LaTeX. Subject-agnostic: physics,
 * chemistry, biology, maths and economics all use the same call. Returns an
 * empty map on failure so the deck never breaks.
 */
export async function aiFormulaSheet(opts: {
  apiKey?: string;
  klass: string;
  subject: string;
  chapter: string;
  slides: Array<{ index: number; title: string; excerpts: string[] }>;
}): Promise<Map<number, FormulaBlock>> {
  const out = new Map<number, FormulaBlock>();
  if (!opts.apiKey || opts.slides.length === 0) return out;

  const prompt = [
    "You are a master teacher writing the formula sheet for NCERT slides.",
    `Class ${opts.klass} | Subject ${opts.subject} | Chapter ${opts.chapter}.`,
    "",
    "For EACH slide return, when the topic genuinely has quantitative content:",
    '- "formula": every relevant relation of that slide in LaTeX (max 4), each with a short name, e.g. "Gauss law: $$\\\\Phi_E = \\\\oint \\\\mathbf{E}\\\\cdot d\\\\mathbf{A} = \\\\frac{Q}{\\\\varepsilon_0}$$".',
    '- "variables": one line per symbol used, e.g. "$\\\\varepsilon_0$: permittivity of free space" (max 6).',
    '- "unit": the SI unit of each quantity with symbol, base-unit form and scalar/vector nature (max 3).',
    '- "derivation": a numbered step-by-step derivation of the main formula, one short step per line, no skipped intermediate step, starting from the defining relation and ending at the result (3-6 steps).',
    "",
    "NOTATION RULES (never break these):",
    "- ALL maths must be LaTeX: inline $...$, standalone equations $$...$$. Prose sits outside the delimiters.",
    "- Never write a fraction linearly: use $\\frac{a}{b}$. Use \\int, \\oint, \\sum, \\lim, \\sqrt, \\begin{bmatrix} ... \\end{bmatrix} as appropriate.",
    "- Real subscripts/superscripts: $x^2$, $r^3$, $\\mathrm{m\\,s^{-2}}$, $C_1$, $V_0$, $q_1q_2$, $H_2SO_4$, $CO_2$, $SO_4^{2-}$.",
    "- Chemistry: balanced equations with \\rightarrow or \\rightleftharpoons and states $(s)$, $(l)$, $(g)$, $(aq)$, e.g. $$\\mathrm{CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O}$$.",
    "- Maths/Biology/Economics: standard notation of that subject in LaTeX (e.g. $\\frac{dy}{dx}$, $^nC_r$, $E_d = \\frac{\\Delta Q/Q}{\\Delta P/P}$).",
    "- No markdown fences, no bracket soup, no repeated '=' runs, no unbalanced braces.",
    "- Every formula must be dimensionally correct and within this class's NCERT scope; if a slide has no formula, return empty arrays for it.",
    "",
    'Return STRICT JSON only: {"slides":[{"index":0,"formula":["..."],"variables":["..."],"unit":["..."],"derivation":["Step 1: ...","Step 2: ..."]}]}',
    "",
    "SLIDES:",
    JSON.stringify(opts.slides.map((s) => ({ index: s.index, title: s.title, ncert: s.excerpts.slice(0, 8) }))).slice(0, 16000),
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": opts.apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.warn("formula-sheet gateway", res.status, (await res.text()).slice(0, 180));
      return out;
    }
    const json = (await res.json()) as any;
    const raw = String(json?.choices?.[0]?.message?.content ?? "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(raw) as { slides?: Array<Record<string, unknown>> };
    const clean = (arr: unknown, max: number) =>
      (Array.isArray(arr) ? arr : [])
        .map((l) => repairNotation(String(l || "")))
        .filter((l) => l.length > 2 && l.length < 220)
        .slice(0, max);
    for (const s of parsed.slides || []) {
      const i = Number((s as any)?.index);
      if (!Number.isFinite(i)) continue;
      out.set(i, {
        formula: clean((s as any).formula, 4),
        variables: clean((s as any).variables, 6),
        unit: clean((s as any).unit, 3),
        derivation: clean((s as any).derivation, 6),
      });
    }
  } catch (e) {
    console.warn("formula-sheet failed", e);
  }
  return out;
}

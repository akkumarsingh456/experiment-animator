/**
 * Multi-subject PW / Med Easy reference-notes extraction & normalization.
 *
 * Cleans formula fragments, normalizes LaTeX structures (subject aware) and
 * filters diagram junk, so notes built from the uploaded Physics Wallah,
 * Med Easy and Shobhit Nirwan books render correctly for every subject.
 */

import katex from "katex";
import { normalizeLatex, splitMath, isValidLatex } from "@/lib/latex-notation";

export type NoteSubject = "physics" | "chemistry" | "mathematics" | "biology";

export interface ExtractedNoteChunk {
  subject: NoteSubject;
  rawText: string;
  normalizedFormula?: string;
  keyPoints: string[];
  diagramLabels: string[];
}

/** Map any free-form subject string onto the four supported pipelines. */
export function subjectKey(subject: string): NoteSubject {
  const s = String(subject || "").toLowerCase();
  if (/chem/.test(s)) return "chemistry";
  if (/bio|zoo|bot/.test(s)) return "biology";
  if (/math|maths/.test(s)) return "mathematics";
  return "physics";
}

/** H2SO4 → H_{2}SO_{4}; SO4 2- → SO_{4}^{2-}; Ca2+ → Ca^{2+}. */
function chemicalNotation(body: string): string {
  return body
    .replace(/([A-Z][a-z]?)(\d+)(?!\})/g, "$1_{$2}")
    .replace(/([A-Z][a-z]?(?:_\{\d+\})?)\s*(\d*)([+-])(?![\w}])/g, (_m, sp, n, sign) => `${sp}^{${n}${sign}}`);
}

/**
 * Normalize and validate a mathematical or chemical formula for any subject.
 * Returns display LaTeX (`$$...$$`) when KaTeX accepts it, otherwise a readable
 * linear fallback that never renders as red error text.
 */
export function normalizeFormula(rawText: string, subject: string): string {
  const raw = String(rawText || "").trim();
  if (!raw) return "";
  const key = subjectKey(subject);

  // Strip bracket soup / repeated operator runs left by PDF extraction.
  let cleaned = raw
    .replace(/\(\s*\)/g, "")
    .replace(/([=+\-*/])\s*\1{1,}/g, "$1")
    .replace(/[\^_]\s*$/g, "")
    .trim();

  if (key === "chemistry") cleaned = chemicalNotation(cleaned);

  const body = normalizeLatex(cleaned) || cleaned;
  try {
    katex.renderToString(body, { throwOnError: true, strict: false, output: "html" });
    return `$$${body}$$`;
  } catch {
    return body
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1 / $2")
      .replace(/_\{([^{}]+)\}/g, "_$1")
      .replace(/\^\{([^{}]+)\}/g, "^$1")
      .replace(/\\[a-zA-Z]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
}

/**
 * Normalize every math span inside a note line, subject aware. Prose outside
 * `$...$` is untouched.
 */
export function normalizeNoteLine(line: string, subject: string): string {
  const key = subjectKey(subject);
  return splitMath(String(line || ""))
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      let body = key === "chemistry" ? chemicalNotation(seg.value) : seg.value;
      body = normalizeLatex(body) || normalizeLatex(seg.value);
      if (!body || !isValidLatex(body)) return normalizeFormula(seg.value, subject);
      return seg.type === "block" ? `$$${body}$$` : `$${body}$`;
    })
    .join("");
}

const JUNK_PATTERNS: RegExp[] = [
  /chapter\s*\d*\s*:?/i,
  /^if\s+/i,
  /^voltage\b/i,
  /page\s*\d+/i,
  /figure\s*\d*/i,
  /^fig\.?\s*\d/i,
  /^(the|this|that|then|and|or|but|it|is|are|for|from|with|when|which|also|such|these|those|example|activity|note)\b/i,
  /^\d+[.)]?$/,
];

/**
 * Filter junk diagram fragments. Callers keep the block only when at least
 * three verified labels survive.
 */
export function validateDiagramLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels
    .map((l) => String(l || "").replace(/\s+/g, " ").trim())
    .filter((label) => {
      if (label.length <= 2 || label.length > 34) return false;
      if (!/[A-Za-z]{3}/.test(label)) return false;
      if (JUNK_PATTERNS.some((p) => p.test(label))) return false;
      const k = label.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** Main pipeline parser for an incoming PW reference-book chunk. */
export function processPWNotesChunk(rawContent: string, subject: NoteSubject | string): ExtractedNoteChunk {
  const key = subjectKey(String(subject));
  const lines = String(rawContent || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let extractedFormula = "";
  const keyPoints: string[] = [];
  const rawDiagramLabels: string[] = [];

  for (const line of lines) {
    if (/^(formula|eq)\s*:/i.test(line)) {
      extractedFormula = normalizeFormula(line.replace(/^(formula|eq)\s*:\s*/i, ""), key);
    } else if (/^(key point|note)\s*:/i.test(line)) {
      keyPoints.push(line.replace(/^(key point|note)\s*:\s*/i, ""));
    } else if (/^(diagram|label)\s*:/i.test(line)) {
      rawDiagramLabels.push(line.replace(/^(diagram|label)\s*:\s*/i, ""));
    }
  }

  const validDiagrams = validateDiagramLabels(rawDiagramLabels);
  return {
    subject: key,
    rawText: String(rawContent || ""),
    normalizedFormula: extractedFormula || undefined,
    keyPoints,
    diagramLabels: validDiagrams.length >= 3 ? validDiagrams : [],
  };
}

/** Universal multi-subject extraction rules injected into the Gemini prompt. */
export const PW_EXTRACTION_RULES = [
  "You are an advanced multi-subject curriculum parser specializing in Physics, Chemistry, Mathematics and Biology reference books (PW / Physics Wallah, Med Easy, Shobhit Nirwan).",
  "Extract high-yield structured notes from the REFERENCE BOOK EXCERPTS as well as the NCERT excerpts.",
  "STRICT OUTPUT RULES:",
  "1. SUBJECT-AGNOSTIC FORMULAS: Physics/Maths — every division becomes \\frac{numerator}{denominator}; Chemistry — proper subscripts and ionic superscripts ($H_{2}SO_{4}$, $PO_{4}^{3-}$); eliminate trailing digits, artifacts and unescaped symbols.",
  "2. STRUCTURED KEY POINTS: dense, high-yield lines (18-26 per slide); no conversational filler, introductions or redundant numbering.",
  "3. DIAGRAM CLEANING: drop fragments, headers, page numbers and generic tags (e.g. 'If V', chapter-title snippets); keep a diagram only when it has at least 3 verified structural components, otherwise omit it entirely.",
].join("\n");

/**
 * Pre-save verification for PW / NCERT derived teacher notes.
 *
 * Every note line is checked twice before a lesson is cached:
 *  1. LaTeX validity — every `$...$` / `$$...$$` span must render in KaTeX
 *     after normalisation, otherwise the line is quarantined (never shown as
 *     red error text or bracket soup).
 *  2. Grounding confidence — the line's content words must appear in the
 *     retrieved NCERT + reference-book (PW / Med Easy) context.
 *
 * Failing lines are dropped and the slide is flagged so the UI (and cache)
 * carry an explicit report instead of silently saving bad maths.
 */

import { splitMath, normalizeLatex, isValidLatex } from "@/lib/latex-notation";
import type { NoteSection } from "@/lib/ncert-teacher-notes";

export type NotesCheck = {
  /** Math spans inspected across all note lines. */
  math_spans: number;
  /** Math spans that KaTeX could not render even after normalisation. */
  math_invalid: number;
  /** Note lines dropped because their maths was unrecoverable. */
  dropped_latex: string[];
  /** Note lines dropped because the NCERT / PW context does not support them. */
  dropped_ungrounded: string[];
  /** 0-100 share of surviving lines supported by the retrieved context. */
  grounding_confidence: number;
  /** Note lines whose invalid LaTeX was rewritten into a valid equivalent. */
  latex_fixed?: number;
  /** Human-readable reasons, shown in the verification panel. */
  issues: string[];
  pass: boolean;
};

const STOP = new Set(
  ("the a an of and or to in on for with is are be as by from that this these those it its at into than then " +
    "definition formula example note key point si unit units important terms term derivation memory trick").split(" "),
);

const words = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/\$[^$]*\$/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));

/** Fraction of a line's content words present in the reference context. */
function groundingScore(line: string, contextNorm: string): number {
  const w = [...new Set(words(line))];
  if (w.length === 0) return 1;
  const hits = w.filter((t) => contextNorm.includes(t)).length;
  return hits / w.length;
}

/** True when every math span in the line renders in KaTeX after normalisation. */
export function latexLineValid(line: string): { spans: number; invalid: number } {
  let spans = 0;
  let invalid = 0;
  for (const seg of splitMath(String(line || ""))) {
    if (seg.type === "text") continue;
    spans += 1;
    const body = normalizeLatex(seg.value);
    if (!body || !isValidLatex(body)) invalid += 1;
  }
  return { spans, invalid };
}

export const normalizeForGrounding = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

/** Minimum share of content words that must be found in the context. */
const GROUND_MIN = 0.34;

/**
 * Verify (and clean) one slide's note sections. Returns the surviving sections
 * plus a report; `pass` is false when anything had to be quarantined.
 */
export function verifyNoteSections(
  sections: NoteSection[] | undefined,
  contextNorm: string,
): { sections: NoteSection[]; check: NotesCheck } {
  const dropped_latex: string[] = [];
  const dropped_ungrounded: string[] = [];
  let math_spans = 0;
  let math_invalid = 0;
  let kept = 0;
  let grounded = 0;

  const cleaned = (sections ?? []).map((sec) => {
    const lines = (sec.lines ?? []).filter((raw) => {
      const line = String(raw || "");
      if (!line.trim()) return false;
      const { spans, invalid } = latexLineValid(line);
      math_spans += spans;
      math_invalid += invalid;
      if (invalid > 0) {
        dropped_latex.push(line.slice(0, 160));
        return false;
      }
      // Diagrams and memory tricks are teaching scaffolds, not factual claims.
      if (sec.kind === "diagram" || sec.kind === "tip") {
        kept += 1;
        grounded += 1;
        return true;
      }
      const g = groundingScore(line, contextNorm);
      kept += 1;
      if (g >= GROUND_MIN) {
        grounded += 1;
        return true;
      }
      dropped_ungrounded.push(line.slice(0, 160));
      kept -= 1;
      return false;
    });
    return { ...sec, lines };
  }).filter((sec) => sec.lines.length > 0);

  const grounding_confidence = kept > 0 ? Math.round((grounded / kept) * 100) : 0;
  const issues: string[] = [];
  if (dropped_latex.length) issues.push(`${dropped_latex.length} line(s) removed — invalid LaTeX after repair.`);
  if (dropped_ungrounded.length)
    issues.push(`${dropped_ungrounded.length} line(s) removed — not supported by NCERT / PW context.`);
  if (kept === 0) issues.push("No verified note lines survived for this slide.");

  return {
    sections: cleaned,
    check: {
      math_spans,
      math_invalid,
      dropped_latex: dropped_latex.slice(0, 6),
      dropped_ungrounded: dropped_ungrounded.slice(0, 6),
      grounding_confidence,
      issues,
      pass: issues.length === 0 && grounding_confidence >= 60,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Auto-fix flow: repair invalid LaTeX, then re-run verification.     */
/* ------------------------------------------------------------------ */

import { aiFixLatex, localLatexFix, lineHasInvalidLatex } from "@/lib/latex-autofix";

/**
 * Rewrite invalid LaTeX into a valid equivalent across a whole deck, then
 * re-verify every slide before anything is saved.
 *
 * Pass 1 repairs deterministically; the lines that still fail are batched into
 * one Gemini pass per 20 lines. Only after both passes does
 * `verifyNoteSections` decide what to quarantine, so a line is dropped only
 * when its maths is truly unrecoverable.
 */
export async function autoFixAndVerifyNotes(
  perSlideSections: Array<NoteSection[] | undefined>,
  contextNorm: string,
  opts: { apiKey?: string; subject: string; chapter: string },
): Promise<Array<{ sections: NoteSection[]; check: NotesCheck }>> {
  type Ref = { slide: number; sec: number; line: number; label: string };
  const refs: Ref[] = [];
  const texts: string[] = [];

  // Work on a mutable copy.
  const decks: NoteSection[][] = perSlideSections.map((secs) =>
    (secs ?? []).map((sec) => ({ ...sec, lines: [...(sec.lines ?? [])] })),
  );

  let localFixed = 0;
  decks.forEach((secs, si) => {
    secs.forEach((sec, xi) => {
      sec.lines.forEach((line, li) => {
        if (!lineHasInvalidLatex(line)) return;
        const local = localLatexFix(line);
        if (local && !lineHasInvalidLatex(local)) {
          sec.lines[li] = local;
          localFixed += 1;
          return;
        }
        const m = line.match(/^(\*\*[^*]+:\*\*\s*)/);
        refs.push({ slide: si, sec: xi, line: li, label: m ? m[1] : "" });
        texts.push(m ? line.slice(m[1].length) : line);
      });
    });
  });

  let aiFixed = 0;
  if (texts.length > 0 && opts.apiKey) {
    const CHUNK = 20;
    const chunks: Array<{ start: number; items: string[] }> = [];
    for (let i = 0; i < texts.length; i += CHUNK) chunks.push({ start: i, items: texts.slice(i, i + CHUNK) });
    const maps = await Promise.all(
      chunks.map((c) =>
        aiFixLatex({ apiKey: opts.apiKey, subject: opts.subject, chapter: opts.chapter, lines: c.items }).then(
          (m) => ({ start: c.start, m }),
        ),
      ),
    );
    for (const { start, m } of maps) {
      for (const [k, v] of m) {
        const ref = refs[start + k];
        if (!ref) continue;
        decks[ref.slide][ref.sec].lines[ref.line] = `${ref.label}${v}`;
        aiFixed += 1;
      }
    }
  }

  const totalFixed = localFixed + aiFixed;
  return decks.map((secs) => {
    const { sections, check } = verifyNoteSections(secs, contextNorm);
    return { sections, check: { ...check, latex_fixed: totalFixed } };
  });
}

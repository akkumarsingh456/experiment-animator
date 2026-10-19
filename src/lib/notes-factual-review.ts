import type { Slide } from "./generate.functions";
import { cleanNcertDisplayText } from "./ncert-display-cleanup";
import { splitMath, normalizeLatex, isValidLatex } from "./latex-notation";

export type ReviewSource = { book: string; location: string; text: string };
export type ClaimReview = { slide: number; topic: string; text: string; status: "source-match" | "needs-review" | "possible-conflict"; reason: string; evidence?: ReviewSource };
export type FactualReview = { claims: ClaimReview[]; matched: number; conflicts: number; unreviewed: number; imageOnly: number };
const plain = (text: string) => cleanNcertDisplayText(text).replace(/^\s*\*\*[^*]+:\*\*\s*/, "").replace(/\*\*/g, "").normalize("NFKC").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const normal = (text: string) => plain(text).toLowerCase().replace(/[^\p{L}\p{N}.+−-]+/gu, " ").replace(/[.]+$/g, "").replace(/\s+/g, " ").trim();
const negations = (text: string) => normal(text).match(/\b(?:not|never|no|cannot)\b/g) || [];
const numbers = (text: string) => normal(text).match(/(?<![\p{L}])[+−-]?\d+(?:\.\d+)?/gu) || [];
const skeleton = (text: string) => normal(text).replace(/\b(?:not|never|no|cannot)\b/g, " ").replace(/(?<![\p{L}])[+−-]?\d+(?:\.\d+)?/gu, " ").replace(/\s+/g, " ").trim();
const scaffolding = /learning objective|prerequisite|practice|exercise|activity|discussion|answer|exit ticket|materials|steps|source review|source table|memory trick|remember/i;

/** A conservative, independent-source review, never a universal truth score.
 * Word overlap and valid LaTeX cannot establish factual correctness. No edits. */
export function reviewLessonFacts(slides: Slide[], sources: ReviewSource[]): FactualReview {
  const sentences = sources.flatMap(source => source.text.split(/(?<=[.!?])\s+|\n+/).filter(text => text.trim().length >= 20 && !/\?|^\s*\(?[a-d]\)\s+|^\s*(?:calculate|find|show that|which of|state whether)\b/i.test(text))
    .map(text => ({ source: { ...source, text: text.trim() }, normal: normal(text), skeleton: skeleton(text) })));

  const sentenceByText = new Map(sentences.map(sentence => [sentence.normal, sentence]));
  const bySkeleton = new Map<string, typeof sentences>();
  for (const sentence of sentences) {
    if (sentence.skeleton.split(" ").filter(word => /\p{L}{3}/u.test(word)).length < 4) continue;
    if (!bySkeleton.has(sentence.skeleton)) bySkeleton.set(sentence.skeleton, []);
    bySkeleton.get(sentence.skeleton)!.push(sentence);
  }
  const claims: ClaimReview[] = []; let imageOnly = 0;
  slides.forEach((slide, slideIndex) => {
    if (slide.teacher_pdf) { imageOnly++; return; }
    if (slide.kind === "mcq" || slide.kind === "break" || slide.visual === "cover") return;
    const lines = slide.sections?.length ? slide.sections.filter(section => section.kind !== "diagram" && section.kind !== "tip" && !scaffolding.test(section.heading)).flatMap(section => section.lines)
      : [...(slide.bullets || []), ...(slide.notes || [])];
    for (const raw of lines) {
      if (/^\s*\*\*([^*]+):\*\*/.test(raw) && scaffolding.test(raw.match(/^\s*\*\*([^*]+):\*\*/)![1])) continue;
      if (/\?\s*$|^\s*\(?[a-d]\)\s+|^\s*(?:calculate|find|show that|explain why)\b/i.test(raw)) continue;
      const text = plain(raw); if (!text) continue;
      const claim: ClaimReview = { slide: slideIndex + 1, topic: slide.title, text, status: "needs-review", reason: "No exact source wording match. A paraphrase or formula requires further review; this does not establish that it is false." };
      const math = splitMath(raw).filter(part => part.type !== "text");
      if (math.some(part => !normalizeLatex(part.value) || !isValidLatex(normalizeLatex(part.value)))) {
        claim.status = "possible-conflict"; claim.reason = "Formula notation could not be rendered reliably; compare with the source.";
      } else if (normal(text).length >= 20) {
        const matchedSentence = sentenceByText.get(normal(text));
        if (matchedSentence) { claim.status = "source-match"; claim.reason = "Wording found in the saved chapter source. A source match is not independent proof of truth."; claim.evidence = matchedSentence.source; }
        else {
          const candidates = bySkeleton.get(skeleton(text)) || [];
          const conflict = candidates.find(candidate => negations(candidate.source.text).length !== negations(text).length || JSON.stringify(numbers(candidate.source.text)) !== JSON.stringify(numbers(text)));
          if (conflict) { claim.status = "possible-conflict"; claim.reason = "A closely corresponding source sentence uses different numbers or negation. Check context before accepting either version."; claim.evidence = conflict.source; }
        }
      }
      if (!sources.length && claim.status !== "possible-conflict") claim.reason = "No independent saved chapter text is available. Generated grounding and notes are not used as their own evidence.";
      claims.push(claim);
    }
  });
  return { claims, imageOnly, matched: claims.filter(row => row.status === "source-match").length, conflicts: claims.filter(row => row.status === "possible-conflict").length, unreviewed: claims.filter(row => row.status === "needs-review").length };
}

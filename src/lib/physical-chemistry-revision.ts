import type { Slide } from "./generate.functions";
import { splitMath } from "./latex-notation";
import { formulaPresentation } from "./formula-presentation";
import { isTextbookIndex } from "./source-index-presentation";

export const PHYSICAL_REVISION = "physical-chemistry-revision";
const physicalChapters = [
  /some basic concepts(?: of chemistry)?/,
  /mole concept/,
  /structure of (?:the )?atom/,
  /atomic structure/,
  /states of matter/,
  /gaseous state/,
  /thermodynamics/,
  /thermochemistry/,
  /equilibrium/,
  /redox reactions?/,
  /solid state/,
  /^solutions?$/,
  /electrochemistry/,
  /chemical kinetics/,
  /surface chemistry/,
];
export function isPhysicalChemistryChapter(
  klass: string,
  subject: string,
  chapter: string,
): boolean {
  if (!/\b(?:11|12)\b/.test(klass) || !/^\s*(?:physical\s+)?chemistry\s*$/i.test(subject))
    return false;
  if (/^physical\s+chemistry$/i.test(subject.trim())) return true;
  const title = chapter
    .toLowerCase()
    .replace(/^\s*(?:ch\.?|chapter)\s*\d+\s*[:.\-–—]?\s*/, "")
    .replace(/\s*\(chemistry\)\s*$/, "")
    .trim();
  return physicalChapters.some((pattern) => pattern.test(title));
}
const formulaLabel = /^\s*\*\*(?:formulas?|equations?|relations?|results?):\*\*/i;
const formulaHeading =
  /^(?:formulas?|equations?|relations?|problem-solving formula reference)(?:\b|$)/i;
const noteLabel =
  /^\s*\*\*(?:definitions?|key points?|important points?|summary|memory trick|exam tip|meaning|explanation):\*\*/i;
const conditionLabel =
  /^\s*\*\*(?:conditions?|assumptions?|validity|limitations?|exceptions?|variables?|symbols?|(?:si )?units?|formula basis):\*\*/i;
const tasks =
  /^\s*\*\*(?:activity|discussion|practice|support practice|core practice|challenge practice|exit ticket|learning objective|prerequisite|answer|teacher revision source)/i;
export function hasRevisionFormula(line: string): boolean {
  if (!line.trim() || isTextbookIndex(line)) return false;
  if (formulaLabel.test(line)) return true;
  if (/[=∝⇌↔→]|\\(?:approx|equiv|propto|rightleftharpoons|rightarrow)\b/.test(line)) return true;
  return splitMath(formulaPresentation(line)).some(
    (part) =>
      part.type !== "text" &&
      /[+*/_^]|\\(?:frac|sqrt|sum|int|ln|log|sin|cos|tan|exp|Delta)\b/.test(part.value),
  );
}
/** Extract only existing teaching relations and existing short notes. No model calls,
 * generated replacements, algebraic transformations, truncation or input mutation.
 */
export function physicalChemistryRevision(
  slides: Slide[],
  klass: string,
  subject: string,
  chapter: string,
): Slide | undefined {
  if (!isPhysicalChemistryChapter(klass, subject, chapter)) return;
  const sections: NonNullable<Slide["sections"]> = [];
  const seen = new Set<string>();
  const add = (heading: string, lines: string[]) => {
    const unique = lines.filter((line) => {
      const key = `${heading}\u0000${line.trim()}`;
      if (!line.trim() || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!unique.length) return;
    const existing = sections.find((section) => section.heading === heading);
    if (existing) existing.lines.push(...unique);
    else sections.push({ heading, kind: "bullets", lines: unique });
  };
  for (const slide of slides) {
    if (slide.visual === PHYSICAL_REVISION || slide.visual === "cover" || slide.kind === "break")
      continue;
    const topic = slide.title || chapter;
    if (slide.kind === "mcq") {
      // Incorrect alternatives must never become revision facts. Retain the question,
      // correct choice and solution in their explicit practice context only.
      const question = slide.mcq;
      if (!question) continue;
      const lines = [
        question.question,
        question.options.find((option) => option.key === question.answer)?.text,
        question.explanation,
      ].filter((line): line is string => !!line && hasRevisionFormula(line));
      if (lines.length) add(`${topic} — worked-question context`, lines);
      continue;
    }
    const notes: string[] = [],
      conditions: string[] = [];
    for (const section of slide.sections || []) {
      if (section.kind === "diagram") continue;
      const original = /^Source (?:review|table)/i.test(section.heading);
      const formulas = section.lines.filter(
        (line) =>
          line.trim() &&
          !isTextbookIndex(line) &&
          (section.kind === "formula" ||
            formulaHeading.test(section.heading) ||
            hasRevisionFormula(line)),
      );
      add(original ? `${topic} — ${section.heading}` : `${topic} — formulas`, formulas);
      if (original) continue;
      for (const line of section.lines) {
        if (formulas.includes(line) || isTextbookIndex(line) || tasks.test(line)) continue;
        if (
          conditionLabel.test(line) ||
          /conditions?|assumptions?|validity|limitations?|exceptions?|units?|symbols?/i.test(
            section.heading,
          )
        )
          conditions.push(line);
        else if (
          line.length <= 320 &&
          (noteLabel.test(line) ||
            /definitions?|key points?|summary|remember|teacher notes/i.test(section.heading))
        )
          notes.push(line);
      }
    }
    for (const line of [
      ...(slide.bullets || []),
      ...(slide.notes || []),
      ...(slide.chapter_text ? [slide.chapter_text] : []),
      ...(slide.ncert_quote ? [slide.ncert_quote] : []),
    ]) {
      if (hasRevisionFormula(line)) add(`${topic} — formulas`, [line]);
      else if (conditionLabel.test(line)) conditions.push(line);
      else if (line.trim() && line.length <= 320 && !tasks.test(line) && !isTextbookIndex(line))
        notes.push(line);
    }
    for (const term of slide.key_terms || []) {
      if (hasRevisionFormula(term.term) || hasRevisionFormula(term.meaning))
        add(`${topic} — formulas`, [term.meaning ? `${term.term}: ${term.meaning}` : term.term]);
    }
    if (slide.caption && hasRevisionFormula(slide.caption))
      add(`${topic} — formulas`, [slide.caption]);
    add(`${topic} — units and conditions`, conditions);
    // Select complete source notes, never cut a sentence or rewrite an explanation.
    add(`${topic} — quick notes`, [...new Set(notes)].slice(0, 2));
  }
  if (!sections.length) return;
  return {
    title: "Physical Chemistry — final revision",
    kind: "content",
    visual: PHYSICAL_REVISION,
    bullets: [],
    notes: [],
    key_terms: [],
    sections,
    caption: `${chapter} · Formulas and short revision from the existing slides.`,
  };
}
export function withPhysicalChemistryRevision(
  slides: Slide[],
  klass: string,
  subject: string,
  chapter: string,
): Slide[] {
  if (slides.some((slide) => slide.visual === PHYSICAL_REVISION)) return slides;
  const revision = physicalChemistryRevision(slides, klass, subject, chapter);
  return revision ? [...slides, revision] : slides;
}

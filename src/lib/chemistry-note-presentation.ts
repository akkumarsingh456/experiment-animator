import type { Slide } from "./generate.functions";

/** Exact duplicate ordinary explanations only, within the same original section.
 * Stored notes, reaction sequences, examples, conditions and source review are opaque.
 */
export function polishChemistryPresentation(slide: Slide, subject: string): Slide {
  if (!/chemistry/i.test(subject) || !slide.sections?.length || slide.teacher_pdf) return slide;
  let changed = false;
  const sections = slide.sections.map((section) => {
    if (
      section.kind === "diagram" ||
      section.kind === "formula" ||
      /^Source (?:review|table)/i.test(section.heading) ||
      /reaction|mechanism|procedure|derivation|example|exercise|practice|activity|answer|condition/i.test(
        section.heading,
      ) ||
      section.lines.some((line) =>
        /\*\*(?:derivation|step)\b|\bstep\s*\d/i.test(line),
      )
    )
      return section;
    const seen = new Set<string>();
    const lines = section.lines.filter((line) => {
      const labelled =
        /^\s*\*\*(?:definition|key term|key point|important point|explanation|summary):\*\*/i.test(
          line,
        );
      const ordinary =
        /^(?:Teacher Notes|Definitions?|Key (?:points?|terms?)|Important points?|Summary|Understanding the concept)$/i.test(
          section.heading,
        );
      if (!labelled && !ordinary) return true;
      if (
        /[=$∝→⇌↔]|->|=>|\\(?:frac|rightarrow|rightleftharpoons)\b/.test(line) ||
        /^\s*\*\*(?:formula|equation|relation|reaction|mechanism|procedure|preparation|example|worked example|condition|assumption|exception|limitation|practice|answer|activity|step)/i.test(
          line,
        )
      )
        return true;
      const key = line.trim();
      if (!key) return true;
      if (seen.has(key)) {
        changed = true;
        return false;
      }
      seen.add(key);
      return true;
    });
    return lines.length === section.lines.length ? section : { ...section, lines };
  });
  return changed ? { ...slide, sections } : slide;
}

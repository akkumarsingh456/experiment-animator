import { MathText } from "@/components/MathText";
import { guidedFormulaRow, guidedGroups } from "@/lib/guided-notes";
import type { Slide } from "@/lib/generate.functions";

export function formulaMapTopics(slides: Slide[]) {
  const seen = new Set<string>();
  return slides.map((slide) => ({ title: slide.title,
    units: [...new Set((slide.sections || []).filter((section) => section.kind !== "diagram").flatMap((section) =>
      section.lines.filter((line) => /^\*\*(?:si unit|unit)\b/i.test(line) || /^(si unit|units?)\b/i.test(section.heading)).map((line) => line.replace(/^\*\*[^*]+:\*\*\s*/, ""))))],
    formulas: guidedGroups(slide.sections, [...(slide.bullets || []), ...(slide.notes || [])])
    .filter((group) => group.kind === "formula").flatMap((group) => group.lines).map(guidedFormulaRow).filter((row) => {
      const key = row.expression.replace(/[\s$]/g, "");
      if (seen.has(key)) return false; seen.add(key); return true;
    }) })).filter((topic) => topic.formulas.length);
}

export function FormulaMindMap({ slides }: { slides: Slide[] }) {
  const topics = formulaMapTopics(slides);
  if (!topics.length) return null;
  return <article className="guided-topic formula-summary"><h2>Formula mind map</h2>
    {topics.map((topic, index) => <section className="formula-map-branch" key={index}><h3>{topic.title}</h3>
      <ul className="formula-map-nodes">{topic.formulas.map((row, i) => <li key={i}>
        {row.concept !== "Relation" && <strong>{row.concept}</strong>}
        <p><MathText text={row.expression} /></p>
        {row.unit !== "—" && <p className="formula-map-unit">Unit / SI unit: <MathText text={row.unit} /></p>}
      </li>)}</ul>
      {!!topic.units.length && <><h4>Units and SI units</h4><ul className="formula-map-unit-reference">{topic.units.map((unit, i) => <li key={i}><MathText text={unit} /></li>)}</ul></>}
    </section>)}
  </article>;
}

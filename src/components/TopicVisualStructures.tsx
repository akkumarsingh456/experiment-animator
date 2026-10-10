import { currentElectricityDiagram, wrapTextbookDrawing } from "@/lib/current-electricity-diagrams";
import { renderSourceConceptMap, sourceConceptFacts, svgDataUrl, type ConceptMapInput } from "@/lib/source-concept-map";
import { geometryDiagram } from "@/lib/geometry-diagrams";
import { learningProfile } from "@/lib/learning-design";
import { MathText } from "@/components/MathText";

/** The same atomic figures are used in the document, guided projector and PDF. */
export function TopicVisualStructures({ input, subject }: { input: ConceptMapInput; subject?: string }) {
  const facts = sourceConceptFacts(input);
  if (!facts.length) return null;
  if (learningProfile(subject).family === "language") return <section className="guided-group literature-storyboard">
    <h3>Reading path: {input.title}</h3>
    <p>Follow these ideas through the passage. Use the author's words to explain your interpretation.</p>
    <ol className="literature-reading-path">{facts.slice(0, 6).map((fact, index) => <li key={index}>
      <p><MathText text={fact} /></p>
    </li>)}</ol>
  </section>;
  const electrical = /^(physics|science)$/i.test(subject || "") ? currentElectricityDiagram(input.title) : null;
  const diagrams = electrical ? [{ title: "Labelled topic diagram", svg: wrapTextbookDrawing(electrical.drawing, "guided-topic"), caption: electrical.caption }] : [];
  const geometry = geometryDiagram(input.title, subject);
  if (geometry) diagrams.push({ title: "Labelled geometry construction", ...geometry });
  // Small cards preserve readable labels; full explanations remain in the notes.
  for (let at = 0; at < Math.min(facts.length, 8); at += 2) diagrams.push({
    title: at ? "More connections to remember" : "Source-based concept map",
    svg: renderSourceConceptMap(input, facts.slice(at, at + 2)),
    caption: "Ideas from these notes. Branches organise the topic; they do not imply a cause, sequence or scale.",
  });
  return <div className="guided-explanation guided-visual-structures" aria-label="Topic visual structures">
    {diagrams.map((diagram, index) => <figure key={index}>
      <div className="guided-figure-heading"><strong>{diagram.title}</strong><span>2D study structure</span></div>
      <img src={svgDataUrl(diagram.svg)} alt={`${diagram.title}: ${input.title}`} />
      <figcaption>{diagram.caption}</figcaption>
    </figure>)}
  </div>;
}

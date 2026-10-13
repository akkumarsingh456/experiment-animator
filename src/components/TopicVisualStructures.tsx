import { topicScienceDrawing } from "@/lib/topic-science-visuals";
import {classroomDiscussionVisual,isKeyPointPage,keyPointIconCards} from '@/lib/classroom-visuals';
import { MathematicsTopicVisual } from "@/components/MathematicsTopicVisual";
import { isMathematics } from "@/lib/mathematics-presentation";
import { currentElectricityDiagram, wrapTextbookDrawing } from "@/lib/current-electricity-diagrams";
import { sourceConceptFacts, svgDataUrl, type ConceptMapInput } from "@/lib/source-concept-map";
import { geometryDiagram } from "@/lib/geometry-diagrams";
import { learningProfile } from "@/lib/learning-design";
import { MathText } from "@/components/MathText";

/** The same atomic figures are used in the document, guided projector and PDF. */
export function TopicVisualStructures({
  input,
  subject,
}: {
  input: ConceptMapInput;
  subject?: string;
}) {
  if (isMathematics(subject)) return <div className="guided-explanation guided-visual-structures"><figure><MathematicsTopicVisual input={input} /></figure></div>;
  const facts = sourceConceptFacts(input);
  if (learningProfile(subject).family === "language")
    return (
      <section className="guided-group literature-storyboard">
        <h3>Reading path: {input.title}</h3>
        <p>
          Follow these ideas through the passage. Use the author's words to explain your
          interpretation.
        </p>
        <ol className="literature-reading-path">
          {facts.slice(0, 6).map((fact, index) => (
            <li key={index}>
              <p>
                <MathText text={fact} />
              </p>
            </li>
          ))}
        </ol>
      </section>
    );
  const topic = topicScienceDrawing(input, subject);
  if(isKeyPointPage(input) && !classroomDiscussionVisual(input) && facts.length)return <div className="guided-explanation guided-visual-structures"><figure><img src={svgDataUrl(wrapTextbookDrawing(keyPointIconCards(facts), 'key-point-icons', input.title))} alt={`${input.title}: short concept icons`} /><figcaption>Short concept cues; full explanations remain in the notes.</figcaption></figure></div>;
  if (topic) return <div className="guided-explanation guided-visual-structures"><figure>
    <div className="guided-figure-heading"><strong>Labelled topic illustration</strong><span>2D diagram</span></div>
    <img src={svgDataUrl(wrapTextbookDrawing(topic.drawing, topic.id, input.title))} alt={`${input.title}: ${topic.caption}`} />
    <figcaption>{topic.caption}</figcaption>
  </figure></div>;
  if (!facts.length) return null;
  const electrical = /^(physics|science)$/i.test(subject || "")
    ? currentElectricityDiagram(input.title)
    : null;
  const diagrams = electrical
    ? [
        {
          title: "Labelled topic diagram",
          svg: wrapTextbookDrawing(electrical.drawing, "guided-topic"),
          caption: electrical.caption,
        },
      ]
    : [];
  const geometry = geometryDiagram(input.title, subject);
  if (geometry) diagrams.push({ title: "Labelled geometry construction", ...geometry });
  // Small cards preserve readable labels; full explanations remain in the notes.
  return (
    <div
      className="guided-explanation guided-visual-structures"
      aria-label="Topic visual structures"
    >
      {diagrams.map((diagram, index) => (
        <figure key={index}>
          <div className="guided-figure-heading">
            <strong>{diagram.title}</strong>
            <span>2D study structure</span>
          </div>
          <img src={svgDataUrl(diagram.svg)} alt={`${diagram.title}: ${input.title}`} />
          <figcaption>{diagram.caption}</figcaption>
        </figure>
      ))}
      {Array.from({ length: Math.ceil(Math.min(facts.length, 8) / 2) }, (_, index) => (
        <figure className="source-concept-card" key={`map:${index}`}>
          <div className="guided-figure-heading">
            <strong>{index ? "More connections to remember" : "Source-based concept map"}</strong>
            <span>2D study structure</span>
          </div>
          <div className="source-concept-content">
            <h3>{input.title}</h3>
            <ul>
              {facts.slice(index * 2, index * 2 + 2).map((fact, at) => (
                <li key={at}>
                  <MathText text={fact} />
                </li>
              ))}
            </ul>
          </div>
          <figcaption>
            Ideas from these notes. Branches organise the topic; they do not imply a cause, sequence
            or scale.
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

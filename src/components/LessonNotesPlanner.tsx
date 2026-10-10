import { MathText } from "@/components/MathText";
import { lessonResources } from "@/lib/lesson-resources";
import type { GuidedGroup } from "@/lib/guided-notes";
import { learningProfile } from "@/lib/learning-design";

export function LessonNotesPlanner({ topics, subject, klass }: { topics: string[]; subject?: string; klass?: string }) {
  const resources = lessonResources(topics, subject);
  const profile = learningProfile(subject, klass);
  return <>
    <article className="guided-topic guided-planner">
      <span className="guided-eyebrow">Teacher planning page</span>
      <h2>Teach for understanding</h2>
      <p>Use the topic notes as the reading material. Adapt the sequence and pace to your class; the tasks below encourage explanation, application and evidence.</p>
      <p><strong>Focus for {subject}:</strong> {profile.focus}. {profile.level}</p>
      <section className="guided-group"><h3>Learning goals & success criteria</h3><ul>
        <li>Explain the key ideas in your own words, using the vocabulary and source evidence in the notes.</li>
        <li>Apply a relevant relationship or principle and state its assumptions; include units where needed.</li>
        <li>Justify an answer with evidence from the textbook, a worked example or an observation.</li>
      </ul><p><strong>Coverage:</strong> {topics.join(" · ")}</p></section>
      <section className="guided-group"><h3>Suggested teaching sequence</h3><ol>
        <li><strong>Activate:</strong> ask what students already know; identify one question they want the lesson to answer.</li>
        <li><strong>Read & explain:</strong> read the concept notes, unpack vocabulary and annotate the diagram together.</li>
        <li><strong>Model:</strong> work through a source example, explaining each decision and checking assumptions.</li>
        <li><strong>Investigate:</strong> predict, observe and explain using a relevant simulation below, or a diagram in the notes.</li>
        <li><strong>Practise & assess:</strong> use the topic tasks and the exit ticket; revisit the concept that caused confusion.</li>
      </ol></section>
      <p className="guided-small">Supports experiential learning, discussion and formative assessment encouraged by NEP 2020. These are suggested teaching activities, not an official curriculum certification.</p>
    </article>
    {!!resources.length && <article className="guided-topic guided-resources"><span className="guided-eyebrow">Predict · Observe · Explain</span><h2>Explore with a simulation</h2>
      <p>Open the official interactive model directly. Check its assumptions against the topic notes before drawing conclusions.</p>
      {resources.map((resource) => <section className="guided-resource" key={resource.id}>
        <span className="guided-resource-type">{resource.dimension}</span><h3><a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title} ↗</a></h3>
        <p>{resource.scope}</p><p><strong>Try this:</strong> {resource.investigation}</p><p className="guided-small"><strong>Model limits:</strong> {resource.limitation}</p>
        <p className="guided-print-url">{resource.url}</p>
      </section>)}
    </article>}
  </>;
}

/** Fallback pedagogy is explicitly a prompt, never a fabricated textbook answer. */
export function TopicLearningTasks({ title, groups }: { title: string; groups: GuidedGroup[] }) {
  const has = (heading: string) => groups.some((group) => group.heading === heading);
  const hasPractice = ["Support practice", "Core practice", "Challenge practice"].some(has);
  return <section className="guided-learning-tasks">
    {!has("Learning objectives") && <div className="guided-group"><h3>Learning target</h3><p>Explain {title} using a key term, a labelled representation and evidence from these notes.</p></div>}
    {!hasPractice && <div className="guided-group"><h3>Practice at three levels</h3><ul>
      <li><strong>Support:</strong> choose one key term and complete: “This means … . The passage or representation shows it by … .” Use the notes as a word bank.</li>
      <li><strong>Core:</strong> explain one relationship or process from this topic. State the condition under which it applies and support your explanation with the notes.</li>
      <li><strong>Challenge:</strong> change one condition in a source example or diagram. Predict the result and explain which principle supports your prediction.</li>
    </ul><p className="guided-small"><strong>Success criteria:</strong> correct vocabulary; evidence that matches the source; a clear reason; correct units and assumptions if a calculation is used.</p></div>}
    {!has("Exit ticket") && <div className="guided-group"><h3>Exit ticket</h3><p>Write one claim you can now explain about {title}, the evidence supporting it, and one question you still have.</p><p className="guided-small"><strong>Teacher check:</strong> assess the claim’s accuracy, the relevance of the evidence and the explanation connecting them. Use unresolved questions to plan the next lesson.</p></div>}
  </section>;
}

export function TopicRecap({ groups }: { groups: GuidedGroup[] }) {
  if (groups.some((group) => group.heading === "Quick recap")) return null;
  const facts = groups.filter((group) => ["Understanding the concept", "Key terms and definitions", "Important points"].includes(group.heading)).flatMap((group) => group.lines).slice(0, 3);
  return facts.length ? <details className="guided-recap"><summary>Quick revision · key ideas</summary><ul>{facts.map((fact, i) => <li key={i}><MathText text={fact} /></li>)}</ul></details> : null;
}

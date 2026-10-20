import { MathText } from "@/components/MathText";
import { lessonResources } from "@/lib/lesson-resources";
import type { GuidedGroup } from "@/lib/guided-notes";
import { learningProfile } from "@/lib/learning-design";
import {teacherTopicPlans,type TeacherTopicInput} from '@/lib/teacher-topic-plan';

export function LessonNotesPlanner({ topics, subject, klass, chapter, sourceTopics }: { topics: string[]; subject?: string; klass?: string; chapter?:string; sourceTopics?:TeacherTopicInput[] }) {
  const resources = lessonResources(topics, subject);
  const profile = learningProfile(subject, klass);
  const plans=teacherTopicPlans(sourceTopics||topics.map(title=>({title,groups:[]})),subject,klass);
  return <>
    <article className="guided-topic guided-planner">
      <span className="guided-eyebrow">Teacher planning page</span>
      <h2>How to teach this chapter</h2>
      <p><strong>Class {klass} · {subject}</strong>{chapter&&<> · <MathText subject={subject} text={chapter}/></>}</p>
      <p>Teach the selected topics in the order below. Each plan uses the lesson’s own notes as its factual reference. Teaching prompts are suggestions, not quotations from NCERT.</p>
      <section className="guided-group"><h3>Prepare before class</h3><ul>
        <li>Read each source anchor below and locate its complete explanation in the topic notes.</li>
        <li>Choose a readable source example or diagram; check symbols, conditions and any stated exceptions before presenting it.</li>
        <li>Use the opening questions to identify prerequisites. Give more time to the first step students cannot explain.</li>
      </ul><p><strong>Class-level approach:</strong> {profile.level}</p></section>
      <section className="guided-group"><h3>Chapter teaching route</h3><ol>{plans.map((plan,index)=><li key={index}><MathText subject={subject} text={plan.title}/></li>)}</ol></section>
      <p className="guided-small">Use the topic plans below to explain, model, question and assess. No laboratory procedure or measured result is invented by this planner.</p>
    </article>
    {plans.map((plan,index)=><article className="guided-topic guided-teacher-topic" key={`teacher:${index}`}>
      <span className="guided-eyebrow">Teacher notes · Topic {index+1}</span>
      <h2><MathText subject={subject} text={plan.title}/></h2>
      <p><strong>Learning target:</strong> <MathText subject={subject} text={plan.goal}/></p>
      <section className="guided-group teacher-source-anchor"><h3>Source anchor for your explanation</h3>{plan.anchor?<p><MathText subject={subject} text={plan.anchor}/></p>:<p>No readable factual anchor is available for this topic. Resolve the source gap before teaching it as an established fact.</p>}<p className="guided-small">Use the complete topic notes for the full explanation and conditions.</p></section>
      <section className="guided-group"><h3>How to teach — step by step</h3><p><strong>Open the discussion:</strong> <MathText subject={subject} text={plan.opener}/></p><ol>{plan.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></section>
      {plan.example&&<section className="guided-group"><h3>Example to model from these notes</h3><p><MathText subject={subject} text={plan.example}/></p><p>Explain the reasoning aloud, then ask students to reproduce one step without looking.</p></section>}
      <section className="guided-group"><h3>Check understanding and respond</h3><p><strong>Ask:</strong> {plan.question}</p><p><strong>What to listen for:</strong> {plan.response}</p><p><strong>If the answer is unclear:</strong> return to the source anchor, identify the unsupported step and model it again. Then ask a different student to explain.</p></section>
      <section className="guided-group"><h3>Support, independent practice and conclusion</h3><p>{plan.support}</p><p><strong>Independent task:</strong> explain the topic without copying, then underline the source evidence supporting each claim.</p><p><strong>Exit check:</strong> <MathText subject={subject} text={plan.exit}/></p><p><strong>Close the topic:</strong> summarise the source-backed explanation and record unresolved questions before moving to the next topic.</p></section>
    </article>)}
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

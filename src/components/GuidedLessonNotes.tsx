import { MathText } from "@/components/MathText";
import { guidedFormulaRow, guidedGroups, uniqueTopicGroups, type GuidedGroup } from "@/lib/guided-notes";
import { LessonNotesPlanner, TopicLearningTasks, TopicRecap } from "@/components/LessonNotesPlanner";
import type { Slide } from "@/lib/generate.functions";
import { lessonIllustrationCaption, renderLessonIllustrationDataUrl } from "@/lib/napkin-infographic";

function NotesGroup({ group }: { group: GuidedGroup }) {
  return <section className={`guided-group guided-${group.kind}`}>
    <h3>{group.heading}</h3>
    {group.kind === "formula" ? <div className="guided-table-scroll"><table><thead><tr><th>Concept</th><th>Formula</th><th>SI unit</th></tr></thead><tbody>
      {group.lines.map((line, i) => { const row = guidedFormulaRow(line); return <tr key={i}><td><MathText text={row.concept} /></td><td><MathText text={row.expression} /></td><td><MathText text={row.unit} /></td></tr>; })}
    </tbody></table></div> : group.kind === "prose" ? group.lines.map((line, i) => <p key={i}><MathText text={line} /></p>) :
      group.kind === "derivation" ? <>
        {group.lines.filter((line) => /^\*\*derivation of/i.test(line)).map((line, i) => <p key={i}><MathText text={line} /></p>)}
        <ol>{group.lines.filter((line) => !/^\*\*(formula|derivation of)/i.test(line)).map((line, i) => <li key={i}><MathText text={line.replace(/^\*\*derivation step\s*\d*:\*\*\s*/i, "")} /></li>)}</ol>
      </> :
      <ul>{group.lines.map((line, i) => <li key={i}><MathText text={line} /></li>)}</ul>}
  </section>;
}

export function GuidedLessonNotes({ slides, title, subject, klass }: { slides: Slide[]; title: string; subject?: string; klass?: string }) {
  const content = slides.filter((slide) => (slide.kind ?? "content") === "content" || slide.kind === "chapter");
  const questions = slides.flatMap((slide) => slide.mcq ? [slide.mcq] : []);
  const topicGroups = uniqueTopicGroups(content.map((slide) => guidedGroups(slide.sections, slide.chapter_text ? slide.chapter_text.split(/\n\s*\n/).filter(Boolean) : [...(slide.bullets || []), ...(slide.notes || [])])));
  return <div className="guided-notes" aria-label="Complete guided lesson notes">
    <div className="guided-document-title"><span>Class {klass} · {subject}</span><h2>{title}</h2><p>Read · Investigate · Practise · Reflect</p></div>
    {!!content.length && <LessonNotesPlanner topics={content.map((slide) => slide.title)} subject={subject} />}
    {content.map((slide, index) => {
      const groups = topicGroups[index];
      const terms = groups.filter((g) => g.kind === "terms");
      const explanation = groups.filter((g) => g.heading === "Understanding the concept");
      const rest = groups.filter((g) => g.kind !== "terms" && g.heading !== "Understanding the concept");
      return <article className="guided-topic" key={`${index}:${slide.title}`}>
        <div className="guided-student-line"><span>Name: ____________________</span><span>Date: ____________________</span></div>
        <h2><span className="guided-topic-number">{String(index + 1).padStart(2, "0")}</span>{slide.title}</h2>
        {terms.map((group, i) => <NotesGroup group={group} key={`terms:${i}`} />)}
        <div className="guided-explanation">
          <figure>
            <img src={renderLessonIllustrationDataUrl({ title: slide.title, subject, slideIndex: index, bullets: slide.bullets, notes: slide.notes, keyTerms: slide.key_terms })} alt={`Labelled concept illustration for ${slide.title}`} />
            <figcaption>{lessonIllustrationCaption(slide.title, subject)}</figcaption>
          </figure>
          {explanation.map((group, i) => <NotesGroup key={`prose:${i}`} group={group} />)}
          {!explanation.length && rest[0]?.heading === "Important points" && <NotesGroup group={rest.shift()!} />}
        </div>
        {rest.map((group, i) => <NotesGroup group={group} key={`body:${i}`} />)}
        {!groups.length && <p>No verified source notes are available for this topic. Regenerate the lesson after uploading the relevant textbook pages.</p>}
        {!!groups.length && <><TopicLearningTasks title={slide.title} groups={groups} /><TopicRecap groups={groups} /></>}
        <footer>{subject} · Class {klass} · Topic {index + 1} of {content.length}</footer>
      </article>;
    })}
    {!!questions.length && <article className="guided-topic guided-practice"><h2>Check your understanding</h2>
      <ol>{questions.map((question, i) => <li key={i}><p><MathText text={question.question} /></p><ul>{question.options.map((option) => <li key={option.key}><strong>{option.key}.</strong> <MathText text={option.text} /></li>)}</ul></li>)}</ol>
    </article>}
    {!!questions.length && <article className="guided-topic guided-answer-key"><h2>Answer key</h2><ol>{questions.map((question, i) => <li key={i}><strong>{question.answer}.</strong> <MathText text={question.explanation || question.options.find((option) => option.key === question.answer)?.text || ""} /></li>)}</ol></article>}
  </div>;
}

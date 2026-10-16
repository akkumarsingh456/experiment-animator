import { withPhysicsFormulaReference } from "@/lib/physics-formula-reference";
import { sequenceChemistryNotes } from "@/lib/chemistry-note-sequence";
import { LessonCover } from "@/components/LessonCover";
import { withPhysicsDimensions } from "@/lib/physics-dimensions";
import { BookReferenceFigures } from "@/components/BookReferenceFigures";
import { MathematicsProse } from "@/components/MathematicsProse";
import { isMathematics, mathematicsPresentationSlide } from "@/lib/mathematics-presentation";
import { omitContentsListings } from "@/lib/note-source-noise";
import { repairSourceMathSlide } from "@/lib/source-math-repair";
import { MathText } from "@/components/MathText";
import { guidedFormulaRow, guidedGroups, uniqueTopicGroups, type GuidedGroup } from "@/lib/guided-notes";
import { LessonNotesPlanner, TopicLearningTasks, TopicRecap } from "@/components/LessonNotesPlanner";
import type { Slide } from "@/lib/generate.functions";
import { TopicVisualStructures } from "@/components/TopicVisualStructures";
import { FormulaMindMap } from "@/components/FormulaMindMap";
import { FormulaDerivation } from "@/components/FormulaDerivation";
import { presentNoteLabels } from "@/lib/note-label-presentation";
import { ChemistrySourceEntry } from "@/components/ChemistrySourceEntry";

function NotesGroup({ group, subject }: { group: GuidedGroup; subject?: string }) {
  const presentation = presentNoteLabels(group.lines, group.heading);
  const runs = presentation.reduce<Array<{heading?: string; lines: string[]}>>((out, line) => {
    if (line.heading || !out.length) out.push({heading:line.heading,lines:[]});
    out.at(-1)!.lines.push(line.text);
    return out;
  }, []);
  return <section className={`guided-group guided-${group.kind}`} data-note-category={group.heading}>
    <h3>{group.heading}</h3>
    {(group.heading === "Source table — original extracted entries" || group.heading === "Source review — original extraction") ? <div className="source-table-entries">{presentation.map((line, i) => <div key={i}>{line.heading && <h4 className="note-label-heading">{line.heading}</h4>}{group.heading === "Source table — original extracted entries" ? <ChemistrySourceEntry text={line.text} /> : <div className="source-table-entry"><MathText text={line.text} /></div>}</div>)}</div> : group.heading === "MLT Dimensional Formula" ? <div className="dimension-cards">{group.lines.map((line, i) => {
      const cells = line.split(" | ");
      return cells.length === 3 ? <div className="dimension-card" key={i}><strong>{cells[0]}</strong><div className="dimension-expression"><MathText text={cells[1]} /></div><p><b>Remember: </b>{cells[2]}</p></div> : <p key={i}><MathText text={line} /></p>;
    })}</div> : group.kind === "formula" ? <div className="guided-table-scroll"><table><thead><tr><th>Concept</th><th>Formula / relation</th><th>{group.heading === "Problem-solving formula reference" ? "Symbols, conditions & use" : "Unit / SI unit"}</th></tr></thead><tbody>
      {group.lines.map((line, i) => { const row = guidedFormulaRow(line); return <tr key={i}><td><MathText text={row.concept === "Formula" ? "—" : row.concept} /></td><td><MathText text={row.expression} /></td><td><MathText text={row.unit} /></td></tr>; })}
    </tbody></table></div> : group.kind === "prose" && group.lines.length === 1 ? group.lines.map((line, i) => isMathematics(subject) ? <div className="mathematics-prose" key={i}><MathematicsProse text={line} /></div> : <p key={i}><MathText text={line} /></p>) :
      group.kind === "derivation" ? <FormulaDerivation lines={group.lines} /> :
      runs.map((run, i) => <div key={i}>{run.heading && <h4 className="note-label-heading">{run.heading}</h4>}<ul>{run.lines.map((line, j) => <li key={j}>{isMathematics(subject) ? <MathematicsProse text={line} /> : <MathText text={line} />}</li>)}</ul></div>)}
  </section>;
}

export function GuidedLessonNotes({ slides, title, subject, klass, includeBreaks = false, includeCover = false }: { slides: Slide[]; title: string; subject?: string; klass?: string; includeBreaks?: boolean; includeCover?: boolean }) {
  slides = withPhysicsFormulaReference(slides, klass || "", subject || "", slides.find(slide => slide.visual === "cover")?.title || title).map(omitContentsListings).map(slide => mathematicsPresentationSlide(slide, subject)).map(repairSourceMathSlide).map(slide => ({...slide, sections: sequenceChemistryNotes(withPhysicsDimensions(slide.sections, subject || "", slide.title), subject || "", title)}));
  const content = slides.filter((slide) => (slide.kind ?? "content") === "content" || slide.kind === "chapter" || (includeBreaks && slide.kind === "break"));
  const questions = slides.flatMap((slide) => slide.mcq ? [slide.mcq] : []);
  const topicGroups = uniqueTopicGroups(content.map((slide) => guidedGroups(slide.sections, slide.chapter_text ? slide.chapter_text.split(/\n\s*\n/).filter(Boolean) : [...(slide.bullets || []), ...(slide.notes || [])])));
  return <div className="guided-notes" aria-label="Complete guided lesson notes">
    <div className="guided-document-title"><span>Class {klass} · {subject}</span><h2>{title}</h2><p>Read · Investigate · Practise · Reflect</p></div>
    {includeCover && <article className="guided-topic guided-cover"><LessonCover title={slides.find(slide => slide.visual === "cover")?.title || title} objectives={slides.find(slide => slide.visual === "cover")?.bullets || content.map(slide => slide.title)} subject={subject} klass={klass} /></article>}
    {!!content.length && <LessonNotesPlanner topics={content.map((slide) => slide.title)} subject={subject} klass={klass} />}
    {content.map((slide, index) => {
      if (slide.visual === "cover" && includeCover) return null;
      if (slide.kind === "break") return <article className="guided-topic" key={`break:${index}`}><h2>{slide.title}</h2><ul>{[...slide.bullets, ...slide.notes].map((line, i) => <li key={i}><MathText text={line} /></li>)}</ul></article>;
      const groups = topicGroups[index];
      const goals = groups.filter((g) => /^(Learning objectives|Before you begin)$/.test(g.heading));
      const terms = groups.filter((g) => g.kind === "terms");
      const explanation = groups.filter((g) => g.heading === "Understanding the concept");
      const rest = groups.filter((g) => !goals.includes(g) && g.kind !== "terms" && g.heading !== "Understanding the concept");
      return <article className="guided-topic" key={`${index}:${slide.title}`}>
        <div className="guided-student-line"><span>Name: ____________________</span><span>Date: ____________________</span></div>
        <h2><span className="guided-topic-number">{String(index + 1).padStart(2, "0")}</span>{slide.title}</h2>
        {goals.map((group, i) => <NotesGroup subject={subject} group={group} key={`goals:${i}`} />)}
        {slide.notes_quality?.issues.length ? <p className="guided-quality-note">Source review: {slide.notes_quality.issues.join(" ")}</p> : null}
        {explanation.map((group, i) => <NotesGroup subject={subject} key={`prose:${i}`} group={group} />)}
        {terms.map((group, i) => <NotesGroup subject={subject} group={group} key={`terms:${i}`} />)}
        <TopicVisualStructures input={{ ...slide, chapter: title, keyTerms: slide.key_terms }} subject={subject} />
        {rest.map((group, i) => <NotesGroup subject={subject} group={group} key={`body:${i}`} />)}
        <BookReferenceFigures figures={slide.reference_visuals} subject={subject} />
        {slide.context_illustration && <figure className="guided-context-illustration"><img src={slide.context_illustration.url} alt={slide.context_illustration.description} /><figcaption>AI context illustration · {slide.context_illustration.provider}. Exact relationships are shown in the labelled diagram and source notes.</figcaption></figure>}
        {!groups.length && <p>No verified source notes are available for this topic. Regenerate the lesson after uploading the relevant textbook pages.</p>}
        {!!groups.length && <><TopicLearningTasks title={slide.title} groups={groups} /><TopicRecap groups={groups} /></>}
        <footer>{subject} · Class {klass} · Topic {index + 1} of {content.length}</footer>
      </article>;
    })}
    {!!questions.length && <article className="guided-topic guided-practice"><h2>Check your understanding</h2>
      <ol>{questions.map((question, i) => <li key={i}><p><MathText text={question.question} /></p><ul>{question.options.map((option) => <li key={option.key}><strong>{option.key}.</strong> <MathText text={option.text} /></li>)}</ul></li>)}</ol>
    </article>}
    {!!questions.length && <article className="guided-topic guided-answer-key"><h2>Answer key</h2><ol>{questions.map((question, i) => <li key={i}><strong>{question.answer}.</strong> <MathText text={question.explanation || question.options.find((option) => option.key === question.answer)?.text || ""} /></li>)}</ol></article>}
    <FormulaMindMap slides={content} />
  </div>;
}

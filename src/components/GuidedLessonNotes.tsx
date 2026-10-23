import {TeacherExplanationGuide,type GuideBook} from "./TeacherExplanationGuide";
import { SourceReviewEntry } from "@/components/SourceReviewEntry";
import {NextClassPlanPage} from './NextClassPlanPage';
import {orderTopicGroups,topicOrderRank} from "@/lib/topic-lecture-order";
import {ncertNotesDisplaySlide} from "@/lib/ncert-display-cleanup";
import {polishChemistryPresentation} from "@/lib/chemistry-note-presentation";
import {physicalChemistryRevision} from "@/lib/physical-chemistry-revision";
import {readableIndexPresentation} from "@/lib/source-index-presentation";
import {hasMeaningfulSlide} from "@/lib/slide-space-organizer";
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
import { guidedFormulaRow, guidedGroups, type GuidedGroup } from "@/lib/guided-notes";
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
    {(group.heading === "Source table — original extracted entries" || group.heading === "Source review — original extraction") ? <div className="source-table-entries">{presentation.map((line, i) => <div key={i}>{line.heading && <h4 className="note-label-heading">{line.heading}</h4>}{group.heading === "Source table — original extracted entries" ? <ChemistrySourceEntry text={line.text} /> : <SourceReviewEntry subject={subject} text={line.text} />}</div>)}</div> : group.heading === "MLT Dimensional Formula" ? <div className="dimension-cards">{group.lines.map((line, i) => {
      const cells = line.split(" | ");
      return cells.length === 3 ? <div className="dimension-card" key={i}><strong>{cells[0]}</strong><div className="dimension-expression"><MathText subject={subject} text={cells[1]} /></div><p><b>Remember: </b>{cells[2]}</p></div> : <p key={i}><MathText subject={subject} text={line} /></p>;
    })}</div> : group.kind === "formula" ? <div className="guided-table-scroll"><table><thead><tr><th>Concept</th><th>Formula / relation</th><th>{group.heading === "Problem-solving formula reference" ? "Symbols, conditions & use" : "Unit / SI unit"}</th></tr></thead><tbody>
      {presentation.map((line, i) => { const row = guidedFormulaRow(line.text); return <tr key={i}><td><MathText subject={subject} text={row.concept === "Formula" ? "—" : row.concept} /></td><td><MathText subject={subject} text={row.expression} /></td><td><MathText subject={subject} text={row.unit} /></td></tr>; })}
    </tbody></table></div> : group.kind === "prose" && group.lines.length === 1 ? group.lines.map((line, i) => isMathematics(subject) ? <div className="mathematics-prose" key={i}><MathematicsProse text={line} /></div> : <p key={i}><MathText subject={subject} text={line} /></p>) :
      group.kind === "derivation" ? <FormulaDerivation subject={subject} lines={group.lines} /> :
      runs.map((run, i) => <div key={i}>{run.heading && <h4 className="note-label-heading">{run.heading}</h4>}<ul>{run.lines.map((line, j) => <li key={j}>{isMathematics(subject) ? <MathematicsProse text={line} /> : <MathText subject={subject} text={line} />}</li>)}</ul></div>)}
  </section>;
}

export function GuidedLessonNotes({ slides, title, subject, klass, includeBreaks = false, includeCover = false, teacherGuide = false, sourceBooks = [] }: { slides: Slide[]; title: string; subject?: string; klass?: string; includeBreaks?: boolean; includeCover?: boolean; teacherGuide?: boolean; sourceBooks?: GuideBook[] }) {
  const nextPlan=slides.find(slide=>slide.teacher_next_class);
  slides=slides.filter(slide=>!slide.teacher_next_class);
  slides = withPhysicsFormulaReference(slides.map(slide=>ncertNotesDisplaySlide(polishChemistryPresentation(readableIndexPresentation(slide),subject||""),subject)).filter(hasMeaningfulSlide), klass || "", subject || "", slides.find(slide => slide.visual === "cover")?.title || title).map(omitContentsListings).map(slide => mathematicsPresentationSlide(slide, subject)).map(repairSourceMathSlide).map(slide => ({...slide, sections: sequenceChemistryNotes(withPhysicsDimensions(slide.sections, subject || "", slide.title, true), subject || "", title)}));
  const finalRevision=physicalChemistryRevision(slides, klass||"", subject||"", slides.find(slide=>slide.visual==="cover")?.title||title);
  const content = slides.filter((slide) => (slide.kind ?? "content") === "content" || slide.kind === "chapter" || (includeBreaks && slide.kind === "break"));
  const questions = slides.flatMap((slide) => slide.mcq ? [slide.mcq] : []);
  const topicGroups = content.map((slide) => guidedGroups(slide.sections, slide.chapter_text ? slide.chapter_text.split(/\n\s*\n/).filter(Boolean) : [...(slide.bullets || []), ...(slide.notes || [])], true));
  return <div className={`guided-notes${teacherGuide ? " teacher-guide-enabled" : ""}`} aria-label="Complete guided lesson notes">
    <div className="guided-document-title"><span>Class {klass} · {subject}</span><h2>{title}</h2><p>Read · Investigate · Practise · Reflect</p></div>
    {includeCover && <article className="guided-topic guided-cover"><LessonCover title={slides.find(slide => slide.visual === "cover")?.title || title} objectives={slides.find(slide => slide.visual === "cover")?.bullets || content.map(slide => slide.title)} subject={subject} klass={klass} /></article>}
    {!!content.length && <LessonNotesPlanner topics={content.filter(slide=>slide.visual!=='cover'&&slide.kind!=='break').map(slide=>slide.title)} sourceTopics={content.flatMap((slide,index)=>slide.visual==='cover'||slide.kind==='break'?[]:[{title:slide.title,groups:topicGroups[index]}])} chapter={title} subject={subject} klass={klass} />}
    {content.map((slide, index) => {
      if (slide.visual === "cover" && includeCover) return null;
      if (slide.kind === "break") return <article className="guided-topic" key={`break:${index}`}><h2>{slide.title}</h2><ul>{[...slide.bullets, ...slide.notes].map((line, i) => <li key={i}><MathText subject={subject} text={line} /></li>)}</ul></article>;
      if (slide.teacher_pdf) {
        const image = slide.reference_visuals?.find(figure => figure.url);
        return <article className="guided-topic guided-original-page" data-teacher-page="true" key={`original:${index}`}>
          <h2>{slide.title}</h2>
          {image ? <figure><img src={image.url} alt={`${slide.teacher_pdf.file_name} · original PDF page ${slide.teacher_pdf.page}`} style={{width:"100%",maxHeight:"580px",objectFit:"contain"}}/><figcaption>{slide.teacher_pdf.file_name} · PDF page {slide.teacher_pdf.page}</figcaption></figure> : <p role="alert">The original chapter PDF page has not loaded. Reload the lesson before exporting.</p>}
        </article>;
      }
      const groups = orderTopicGroups(topicGroups[index]);
      const firstDetail = groups.findIndex(group => topicOrderRank(group.heading) >= 20);
      const visualAt = firstDetail < 0 ? groups.length : firstDetail;
      return <article className="guided-topic" key={`${index}:${slide.title}`}>
        <div className="guided-student-line"><span>Name: ____________________</span><span>Date: ____________________</span></div>
        <h2><span className="guided-topic-number">{String(index + 1).padStart(2, "0")}</span>{slide.title}</h2>
        {slide.source_recovery?.url&&<p className="text-sm">{slide.source_recovery.kind==='official-online-supplement'?'Supplementary note sources':'External NCERT mirror · IIT Kanpur SATHEE'}: {(slide.source_recovery.sources?.length?slide.source_recovery.sources:[{url:slide.source_recovery.url,title:slide.source_recovery.url}]).map((source,index)=><span key={source.url}>{index>0?' · ':''}<a href={source.url} className="underline">{source.title}</a></span>)}</p>}
        {slide.notes_quality?.issues.length ? <p className="guided-quality-note">Source review: {slide.notes_quality.issues.join(" ")}</p> : null}
        {groups.slice(0, visualAt).map((group, i) => <NotesGroup subject={subject} group={group} key={`intro:${i}`} />)}
        <TopicVisualStructures input={{ ...slide, chapter: title, keyTerms: slide.key_terms }} subject={subject} />
        {groups.slice(visualAt).map((group, i) => <NotesGroup subject={subject} group={group} key={`body:${i}`} />)}
        <BookReferenceFigures figures={slide.reference_visuals} subject={subject} />
        {slide.context_illustration && <figure className="guided-context-illustration"><img src={slide.context_illustration.url} alt={slide.context_illustration.description} /><figcaption>AI context illustration · {slide.context_illustration.provider}. Exact relationships are shown in the labelled diagram and source notes.</figcaption></figure>}
        {!groups.length && <p>No verified source notes are available for this topic. Regenerate the lesson after uploading the relevant textbook pages.</p>}
        {!!groups.length && <><TopicLearningTasks title={slide.title} groups={groups} /><TopicRecap groups={groups} /></>}
        {teacherGuide && slide.visual!=="cover" && !slide.teacher_blank && <TeacherExplanationGuide slide={slide} groups={groups} subject={subject} klass={klass} chapter={title} books={sourceBooks}/>}
        <footer>{subject} · Class {klass} · Topic {index + 1} of {content.length}</footer>
      </article>;
    })}
    {!!questions.length && <article className="guided-topic guided-practice"><h2>Check your understanding</h2>
      <ol>{questions.map((question, i) => <li key={i}><p><MathText subject={subject} text={question.question} /></p><ul>{question.options.map((option) => <li key={option.key}><strong>{option.key}.</strong> <MathText subject={subject} text={option.text} /></li>)}</ul></li>)}</ol>
    </article>}
    {!!questions.length && <article className="guided-topic guided-answer-key"><h2>Answer key</h2><ol>{questions.map((question, i) => <li key={i}><strong>{question.answer}.</strong> <MathText subject={subject} text={question.explanation || question.options.find((option) => option.key === question.answer)?.text || ""} /></li>)}</ol></article>}
    <FormulaMindMap slides={content} />
    {finalRevision&&<article className="guided-topic physical-chemistry-final-revision" data-physical-revision="true"><h2>{finalRevision.title}</h2><p>{finalRevision.caption}</p>{finalRevision.sections?.map((section,index)=><NotesGroup key={index} subject={subject} group={{heading:section.heading,kind:"list",lines:section.lines}}/>)}</article>}
    {nextPlan&&<NextClassPlanPage slide={nextPlan} klass={klass} subject={subject}/>}
  </div>;
}



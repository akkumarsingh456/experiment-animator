import {useState} from 'react';
import {MathText} from './MathText';
import {MathematicsProse} from './MathematicsProse';
import {MathematicsTeacherGuide} from './MathematicsTeacherGuide';
import {isMathematics} from '@/lib/mathematics-presentation';
import {FormulaDerivation} from './FormulaDerivation';
import {teacherTopicPlans} from '@/lib/teacher-topic-plan';
import type {GuidedGroup} from '@/lib/guided-notes';
import type {Slide} from '@/lib/generate.functions';

export type GuideBook={chapter:string;class:string;subject:string};

/** Read-only teaching companion. Never writes into generation data or slide sections. */
export function TeacherExplanationGuide({slide,groups,subject,klass,chapter,books=[]}:{slide:Slide;groups:GuidedGroup[];subject?:string;klass?:string;chapter:string;books?:GuideBook[]}){
 const [mode,setMode]=useState<'revision'|'full'>('full');
 const mathematics=isMathematics(subject);
 const passage=(text:string)=>mathematics?<MathematicsProse text={text}/>:<MathText subject={subject} text={text}/>;
 const plan=teacherTopicPlans([{title:slide.title,groups}],subject,klass)[0];
 const usable=groups.filter(group=>!/^Source (review|table)/i.test(group.heading));
 const matching=(pattern:RegExp)=>usable.filter(group=>pattern.test(group.heading));
 const support=(pattern:RegExp)=>(slide.teaching_support||[]).filter(section=>pattern.test(section.heading));
 const renderGroups=(items:GuidedGroup[],empty:string)=>items.length?items.map((group,i)=><section className="guided-group" key={i}><h4>{group.heading}</h4>{group.kind==='derivation'&&!mathematics?<FormulaDerivation subject={subject} lines={group.lines}/>:group.kind==='derivation'?<ol>{group.lines.map((line,j)=><li key={j}>{passage(line)}</li>)}</ol>:group.lines.map((line,j)=><div className="teacher-guide-passage" key={j}>{passage(line)}</div>)}</section>):<p className="guided-small">{empty}</p>;
 const renderSupport=(pattern:RegExp)=>support(pattern).map((section,i)=><section className="guided-group" key={i}><h4>{section.heading}</h4><p className="guided-small">Source-supported supplementary teaching notes · review alongside the original notes.</p>{section.lines.map((line,j)=><div className="teacher-guide-passage" key={j}>{passage(line)}</div>)}</section>);
 const explanations=matching(/Understanding|How it works|Key terms|Important points/);
 const examples=matching(/Worked examples|Answers and explanations|Step-by-step derivation/);
 const formula=usable.some(group=>group.kind==='formula'||group.kind==='derivation');
 const sources=slide.source_recovery?.sources?.length?slide.source_recovery.sources:slide.source_recovery?.url?[{url:slide.source_recovery.url,title:slide.source_recovery.url}]:[];
 return <details open className="guided-recap teacher-explanation-guide">
  <summary>Teacher explanation guide <span className="teacher-guide-topic">{slide.title}</span></summary>
  <div className="teacher-guide-modes print:hidden" role="group" aria-label={`Teaching detail for ${slide.title}`}>
   <button type="button" aria-pressed={mode==='revision'} onClick={()=>setMode('revision')} className="rounded border px-3 py-2">Quick revision</button>
   <button type="button" aria-pressed={mode==='full'} onClick={()=>setMode('full')} className="rounded border px-3 py-2">Full lesson</button>
  </div>
  <p className="guided-small teacher-guide-context">Teaching suggestions are guidance for the teacher. Factual passages below come from the current lesson; supplementary notes are labelled separately. Original notes remain unchanged.</p>
  <section className="guided-group"><h3>1. Start and connect</h3>
   {renderGroups(matching(/Before you begin/),'Ask students which earlier definitions or skills they need for this topic; confirm these against the chapter before proceeding.')}
   <p><strong>Opening prompt:</strong> <MathText subject={subject} text={plan.opener}/></p>
   <p><strong>Learning target:</strong> <MathText subject={subject} text={plan.goal}/></p>
  </section>
  <section className="guided-group"><h3>2. Explain the key idea</h3>
   {mode==='revision'?(plan.anchor?<div className="teacher-guide-passage">{passage(plan.anchor)}</div>:<p>No readable source anchor is available. Resolve the source gap first.</p>):<>{renderGroups(explanations,'No readable explanatory passage is available. Use the topic recovery tools to supply it before teaching.')}{renderSupport(/explanation/i)}</>}
   <p><strong>Ask:</strong> {plan.question}</p>
  </section>
  <div className={mode==='revision'?'hidden print:block':undefined}>
   {mathematics&&<MathematicsTeacherGuide title={slide.title} groups={usable}/>}
   <section className="guided-group teacher-guide-example"><h3>3. Model an example with reasoning</h3>
    {renderGroups(examples,'No complete worked example is identified in these notes. Do not treat a question alone as a solved example.')}{renderSupport(/worked example/i)}
    <ol><li>Identify the given information and the question to answer.</li><li>Explain why the source method applies, including its stated conditions.</li><li>Follow the source steps in order; ask for the reason behind each step.</li><li>Interpret the source result. For calculations, check signs, units and whether the result answers the question.</li></ol>
    <p className="guided-small">This modelling checklist is a teaching prompt; it does not supply missing solution steps or numerical answers.</p>
   </section>
   {formula&&<section className="guided-group teacher-guide-formula"><h3>4. Formula meaning, conditions and limits</h3>
    {renderGroups(matching(/Formulas and relations|Symbols|Meaning and conditions|Conditions and assumptions|Limitations and exceptions|Problem-solving formula/),'No explicit formula guidance is available.')}
    <p><strong>Teacher check:</strong> {mathematics?'Define each symbol and its permitted values from the source. State the domain and theorem hypotheses before applying a relation. Distinguish an identity, an equation to solve and a conditional result. Verify any missing restriction in the original chapter.':'name every symbol from the source, retain its stated unit, identify the assumptions, and explain where the relationship can be used. If a definition or condition is missing, verify it in the original chapter; do not guess from the symbol alone.'}</p>
   </section>}
   <section className="guided-group teacher-guide-caution"><h3>{formula?'5':'4'}. Misconceptions and classroom prompts</h3>
    {renderGroups(matching(/misconception/i),'No topic-specific misconception correction is supplied. Ask students to justify a claim against the source before correcting it.')}{renderSupport(/misconception/i)}
    <ol>{plan.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
    <p><strong>Draw or display:</strong> use the existing topic diagram or source representation, if available. Ask students to connect each label to the explanation.</p>
    <p><strong>Pause:</strong> ask a student to explain the last step before revealing the next one. {plan.support}</p>
   </section>
  </div>
  <section className="guided-group teacher-guide-check"><h3>Check, respond and close</h3>
   {renderGroups(matching(/Check your understanding|Answers and explanations|Exit ticket/),'Ask students to explain one source-backed claim and identify its supporting passage.')}{renderSupport(/questions and explained answers/i)}
   <p><strong>Assessment reference:</strong> {plan.response}</p><p><strong>Exit check:</strong> <MathText subject={subject} text={plan.exit}/></p>
  </section>
  <section className="guided-group teacher-guide-sources"><h3>Source references and coverage</h3>
   <p>Class {klass} · {subject} · {chapter} · Topic: {slide.title}</p>
   {books.filter(book=>book.class.replace(/^Class\s*/i,'')===(klass||'').replace(/^Class\s*/i,'')&&book.subject.toLowerCase()===(subject||'').toLowerCase()).map((book,i)=><p key={i}>Lesson source book: {book.chapter}</p>)}
   {sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></p>)}
   {slide.teacher_revision&&<p>{slide.teacher_revision.file_name}{slide.teacher_revision.page?` · PDF page ${slide.teacher_revision.page}`:''}</p>}
   {slide.figures?.length?<p>Source figure references: {slide.figures.join(', ')}</p>:null}
   {!slide.teacher_revision?.page&&<p className="guided-small">Exact source page is not recorded for this topic. Chapter references do not certify page-level coverage.</p>}
   {slide.notes_quality?.issues.length?<p role="note">Source review needed: {slide.notes_quality.issues.join(' ')}</p>:null}
  </section>
 </details>;
}

import { EduPlanMark } from "@/components/EduPlanMark";
import { WorkspacePreview } from "@/components/WorkspacePreview";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ShieldCheck, FileText, PencilLine, Presentation, FlaskConical, Ruler, CircuitBoard, Leaf, Monitor, Download, ClipboardList } from "lucide-react";

const workflow = [
  {title: "Choose a chapter", Icon: ClipboardList, text: "Select your class, subject and subtopics from the available catalogue."},
  {title: "Prepare your lesson", Icon: FileText, text: "Build notes, formulas and practice from matching NCERT textbooks."},
  {title: "Review and personalise", Icon: PencilLine, text: "Check the textbook, review notation and add your own diagrams."},
  {title: "Teach or revise", Icon: Presentation, text: "Present in class or download the available PDF and PowerPoint views."},
];
const features = [
  {Icon: FileText, title: "Structured notes", text: "Definitions, explanations, conditions and uses in readable sections."},
  {Icon: Ruler, title: "Formulas and derivations", text: "Symbols, units and source-supported steps, with Physics dimension guides."},
  {Icon: PencilLine, title: "Diagrams you can adapt", text: "Use topic drawings or import, crop and save your own images."},
  {Icon: FlaskConical, title: "Activities and practice", text: "Available procedures, observations and questions for classroom learning."},
  {Icon: BookOpen, title: "Source references", text: "Consult available PDFs and import eligible Med Easy figures."},
  {Icon: Download, title: "Present and export", text: "Lecture slides, guided notes, the Notes Library and PDF or PPTX downloads."},
];
const subjects = [
  {name: "Social Science", Icon: BookOpen, label: "CLASSES 9 & 10", text: "History, Geography, Civics and Economics, with uploaded revision PDFs."},
  {name: "Science", Icon: Leaf, label: "CLASSES 9 & 10", text: "Physics, Chemistry and Biology in one subject."},
  {name: "Physics", Icon: CircuitBoard, label: "CLASSES 11 & 12", text: "Laws, units, dimensions and derivations."},
  {name: "Chemistry", Icon: FlaskConical, label: "CLASSES 11 & 12", text: "Reactions, structures, properties and conditions."},
  {name: "Mathematics", Icon: Ruler, label: "CLASSES 9–12", text: "Concepts, proofs, examples and geometry."},
  {name: "Computer Science", Icon: Monitor, label: "AVAILABLE CLASS CATALOGUES", text: "Programming, computing concepts and data."},
];

export function EducationHomepage({generator}: {generator: ReactNode}) {
  return <div className="edu-home">
    <header className="edu-header"><div className="edu-container edu-header-inner"><Link to="/" className="edu-brand"><EduPlanMark /><span>EduPlan<small>BY AMAN KUMAR</small></span></Link><nav aria-label="Main navigation"><a href="#generator">Prepare a lesson</a><a href="#how">How it works</a><a href="#subjects">Subjects</a><Link to="/notes-library">Notes Library</Link><Link to="/history">Uploaded books</Link></nav><Link className="edu-button edu-button-small" to="/upload"><ShieldCheck size={16} />Admin login</Link></div></header>
    <main>
      <section className="edu-container edu-hero"><div className="edu-hero-copy"><span className="edu-eyebrow">NCERT LESSON PREPARATION · CLASSES 9–12</span><h1>Your chapter.<br /><em>Ready for class.</em></h1><p>Prepare NCERT notes, diagrams and practice in one workspace. Review, personalise and present.</p><div className="edu-actions"><a className="edu-button" href="#generator">Prepare a lesson <ArrowRight size={18} /></a><a className="edu-text-link" href="#how">See how it works</a></div><ul className="edu-hero-details"><li><BookOpen size={17} />Textbook-based preparation</li><li><PencilLine size={17} />Review and add your own images</li><li><Presentation size={17} />Present, print or download</li></ul></div><WorkspacePreview /></section>
      <section className="edu-audience"><div className="edu-container edu-audience-grid"><div><span className="edu-eyebrow">FOR THE PEOPLE IN THE CLASSROOM</span><h2>For teaching.<br />For revision.</h2></div><article><h3>For teachers</h3><p>Prepare and adapt lessons with your own subject knowledge and classroom approach.</p></article><article><h3>For students</h3><p>Revisit concepts, follow formulas and check your understanding with practice.</p></article></div></section>
      <section id="generator" className="edu-container edu-generator"><div className="edu-section-heading"><span className="edu-eyebrow">01 / YOUR LESSON STARTS HERE</span><h2>Choose a chapter. Set the scope.</h2><p>Choose your class, subject and chapter. Uses matching textbooks already in the library.</p></div>{generator}</section>
      <section id="how" className="edu-workflow"><div className="edu-container"><div className="edu-section-heading"><span className="edu-eyebrow">02 / THE WORKING PROCESS</span><h2>Four steps to your lesson.</h2><p>Choose, prepare, review and present.</p></div><div className="edu-step-grid">{workflow.map(({title, Icon, text}, i) => <article key={title}><div className="edu-step-top"><span>{String(i+1).padStart(2,'0')}</span><Icon size={25} strokeWidth={1.4} /></div><h3>{title}</h3><p>{text}</p></article>)}</div><div className="edu-principle"><div><span className="edu-eyebrow">SOURCE FIRST</span><h3>Grounded in NCERT.<br />Reviewed by you.</h3></div><div><p>Lessons use matching NCERT textbook text. Check formulas and unclear passages against the textbook before teaching.</p><p>Diagram imports support your explanation; automated checks do not guarantee factual accuracy.</p></div></div></div></section>
      <section className="edu-container edu-features"><div className="edu-section-heading"><span className="edu-eyebrow">03 / WHAT YOU CAN WORK WITH</span><h2>Your teaching toolkit.</h2><p>Notes, visuals and practice, together.</p></div><div className="edu-feature-grid">{features.map(({Icon,title,text}) => <article key={title}><Icon strokeWidth={1.4} size={27} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section id="subjects" className="edu-subjects"><div className="edu-container"><div className="edu-section-heading"><span className="edu-eyebrow">04 / SUBJECTS & CLASS LEVELS</span><h2>Find your subject.</h2><p>Choose from the available class catalogues. Senior Biology is not currently included.</p></div><div className="edu-subject-grid">{subjects.map(({name,Icon,label,text}) => <article key={name}><div><Icon size={30} strokeWidth={1.3} /><small>{label}</small></div><h3>{name}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="edu-container edu-start"><div><span className="edu-hand">Start with one chapter.</span><h2>Make room for better preparation.</h2><p>Choose a chapter to begin. Source uploads are restricted to authorised administrators.</p></div><div className="edu-actions"><Link to="/upload" className="edu-button"><ShieldCheck size={18} />Admin login</Link><a href="#generator" className="edu-text-link">Open lesson preparation <ArrowRight size={16} /></a></div></section>
    </main><footer className="edu-footer"><div className="edu-container"><Link to="/" className="edu-brand"><EduPlanMark /><span>EduPlan<small>BY AMAN KUMAR</small></span></Link><p>For teacher-led lessons and student revision · Classes 9–12</p><Link to="/notes-library">Browse the Notes Library <ArrowRight size={15} /></Link></div></footer>
  </div>;
}

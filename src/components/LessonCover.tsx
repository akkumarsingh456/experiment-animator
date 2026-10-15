import type { CSSProperties } from "react";
import { Atom, FlaskConical, Ruler, Microscope, CircuitBoard, BookOpen, ArrowUpRight, Layers3, Compass, Laptop } from "lucide-react";
import { topicScienceDrawing } from "@/lib/topic-science-visuals";
import { geometryDiagram } from "@/lib/geometry-diagrams";

function coverTheme(subject: string, title: string) {
  const text = /^science$/i.test(subject) || !subject ? title : subject;
  if (/chem|chemical|acid|carbon|periodic|metal|reaction/i.test(text)) return {name: "Chemistry", color: "#11695e", pale: "#e4f1eb", Icon: FlaskConical, tools: ["Laboratory", "Structures", "Reactions"]};
  if (/bio|life process|organism|cell|heredity|reproduction|plant|tissue/i.test(text)) return {name: "Biology", color: "#386044", pale: "#eaf0e1", Icon: Microscope, tools: ["Observe", "Identify", "Understand"]};
  if (/math|trigon|polynomial|geometry|triangle|circle|calculus/i.test(text)) return {name: "Mathematics", color: "#52427a", pale: "#efebf5", Icon: Ruler, tools: ["Reason", "Construct", "Apply"]};
  if (/computer|informatics|program|network|database/i.test(text)) return {name: "Computer Science", color: "#255579", pale: "#e5eef6", Icon: Laptop, tools: ["Logic", "Code", "Explore"]};
  if (/phys|motion|force|electric|light|sound|gravitation|magnet|energy/i.test(text)) return {name: "Physics", color: "#1c6077", pale: "#e4f0f3", Icon: Atom, tools: ["Observe", "Measure", "Explain"]};
  return {name: subject || "Learning", color: "#345a75", pale: "#e8eff4", Icon: BookOpen, tools: ["Read", "Connect", "Explore"]};
}

function PeriodicObjects() {
  const elements = [["24", "Cr", "Chromium", "d"], ["26", "Fe", "Iron", "d"], ["29", "Cu", "Copper", "d"], ["58", "Ce", "Cerium", "f"], ["60", "Nd", "Neodymium", "f"], ["92", "U", "Uranium", "f"]];
  return <div className="cover-elements" aria-label="Selected d- and f-block elements with atomic numbers">
    <div className="cover-figure-label">THE PERIODIC TABLE / SELECTED d- AND f-BLOCK ELEMENTS</div>
    <div className="cover-element-grid">{elements.map(([number, symbol, name, block]) => <div className={`cover-element cover-element-${block}`} key={symbol}><small>{number}</small><strong>{symbol}</strong><span>{name}</span></div>)}</div>
    <div className="cover-block-key"><span><i /> d block</span><span><i /> f block</span><span>Position · configuration · properties</span></div>
  </div>;
}

function CoverFigure({subject, title}: {subject: string; title: string}) {
  const theme = coverTheme(subject, title);
  if (theme.name === "Chemistry" && /d.and.f|d.block|f.block|transition|periodic/i.test(title)) return <PeriodicObjects />;
  const drawing = theme.name === "Mathematics" ? geometryDiagram(title, subject) : topicScienceDrawing({title, chapter: title}, theme.name);
  if (drawing) {
    const svg = "svg" in drawing ? drawing.svg : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 550"><defs><marker id="tip" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#173d50"/></marker></defs>${drawing.drawing}</svg>`;
    return <figure className="cover-topic-figure"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={drawing.caption} /><figcaption>{drawing.caption}</figcaption></figure>;
  }
  const Icon = theme.Icon;
  return <div className="cover-toolkit"><div className="cover-figure-label">{theme.name.toUpperCase()} / TOOLS FOR EXPLORATION</div><div className="cover-main-tool"><Icon strokeWidth={1.1} aria-hidden="true" /></div><div className="cover-tool-labels">{theme.tools.map((tool, i) => { const Tool = [Compass, Layers3, CircuitBoard][i]; return <span key={tool}><Tool size={20} strokeWidth={1.5} />{tool}</span>; })}</div><p>Connect the concepts. Explore the chapter.</p></div>;
}

/** Designed locally: crisp subject illustrations, no generated photographs or invented apparatus. */
export function LessonCover({title, objectives, subject = "", klass}: {title: string; objectives: string[]; subject?: string; klass?: string}) {
  const theme = coverTheme(subject, title), Icon = theme.Icon;
  const match = title.match(/^Chapter\s+(\d+)\s*[:.\-]\s*/i);
  const heading = title.replace(/^Chapter\s+\d+\s*[:.\-]\s*/i, "");
  const goals = [...new Set(objectives.map(item => item.trim()).filter(Boolean))];
  return <div className="lesson-cover" style={{"--cover-accent": theme.color, "--cover-pale": theme.pale} as CSSProperties}>
    <div className="cover-topline"><span><Icon size={20} strokeWidth={1.6} />{subject || theme.name}{klass ? ` / CLASS ${klass}` : ""}</span><span>EDUPLAN AI <span className="cover-top-dot" /></span></div>
    <div className="cover-main-grid"><div className="cover-copy"><div className="cover-eyebrow">{match ? `CHAPTER ${match[1].padStart(2, "0")}` : "CHAPTER STUDY"}<span />LEARN WITH PURPOSE</div><h1>{heading}</h1><div className="cover-title-rule" /><p className="cover-description">A guided journey through concepts,<br />connections and classroom discovery.</p><div className="cover-subject-stamp"><Icon size={22} strokeWidth={1.6} /><span>{theme.name}<small>CHAPTER OVERVIEW</small></span></div></div><div className="cover-visual"><CoverFigure subject={subject} title={title} /><div className="cover-visual-corner">01 <ArrowUpRight size={18} /></div></div></div>
    <section className="cover-roadmap"><div className="cover-roadmap-label"><BookOpen size={19} /><strong>Inside this chapter</strong><small>{goals.length} selected {goals.length === 1 ? "topic" : "topics"}</small></div><ol>{goals.slice(0, 6).map((goal, i) => <li key={goal}><span>{String(i + 1).padStart(2, "0")}</span><p>{goal}</p></li>)}</ol>{goals.length > 6 && <p className="cover-more">+ {goals.length - 6} more topics covered in the lesson</p>}</section>
  </div>;
}

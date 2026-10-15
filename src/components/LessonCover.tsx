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

/** Authored pen-style apparatus motifs, decorative rather than a fabricated experiment. */
function NotebookDoodles({family, title, bottom = false}: {family: string; title: string; bottom?: boolean}) {
  const chemistry = family === "Chemistry", physics = family === "Physics", biology = family === "Biology", maths = family === "Mathematics";
  let objects = chemistry ? ["Flask", "Dropper", "Molecular model"] : physics ? ["Magnet", "Circuit", "Prism"] : biology ? ["Leaf", "Microscope", "Specimen slide"] : maths ? ["Compass", "Ruler", "Geometry"] : ["Notebook", "Pencil", "Learning tools"];
  let paths = chemistry ? ["M27 5 L27 22 L14 45 Q12 50 19 51 L54 51 Q61 50 57 44 L43 22 L43 5 M23 5 L47 5 M22 36 Q35 31 49 37 M26 43 L47 44", "M26 9 L37 4 L47 15 L20 45 L14 48 L17 39 Z M27 33 L32 38 M43 23 Q52 33 46 36 Q41 38 41 32", "M18 17 L35 7 L53 18 L53 39 L35 49 L18 39 Z M35 7 L35 0 M53 39 L64 46 M18 39 L7 46"] : physics ? ["M17 7 L17 34 Q17 52 35 52 Q54 52 54 34 L54 7 L42 7 L42 34 Q42 39 35 39 Q29 39 29 34 L29 7 Z M17 19 L29 19 M42 19 L54 19", "M8 28 L19 28 L23 20 L30 37 L37 20 L44 37 L49 28 L64 28 M8 28 L8 48 L64 48 L64 28", "M16 47 L35 9 L56 47 Z M1 25 L27 26 M44 29 L70 17 M45 32 L70 34 M46 35 L68 50"] : biology ? ["M14 48 Q2 8 57 5 Q63 42 14 48 Z M12 53 L47 16 M23 39 L21 26 M32 29 L46 30", "M27 5 L41 12 L33 29 L20 22 Z M33 29 Q58 40 40 49 L18 49 M13 54 L55 54 M14 35 L43 35 M26 49 L26 54", "M8 17 L63 17 L63 44 L8 44 Z M24 23 L45 23 L45 38 L24 38 Z M30 27 Q37 23 40 31 Q40 36 32 34 Z"] : maths ? ["M35 4 L19 52 M35 4 L53 52 M25 34 L44 34 M30 8 Q35 1 40 8 M35 4 L35 0", "M8 20 L65 20 L65 43 L8 43 Z M17 20 L17 31 M27 20 L27 28 M37 20 L37 33 M47 20 L47 28 M57 20 L57 31", "M13 47 L34 8 L59 47 Z M21 37 L47 37 M34 8 L34 47"] : ["M12 8 L58 8 L58 52 L12 52 Z M20 8 L20 52 M28 21 L49 21 M28 30 L49 30 M28 39 L43 39", "M17 47 L24 32 L51 5 L60 14 L32 42 Z M24 32 L32 42 M49 8 L56 15 M17 47 L25 44", "M15 29 Q15 7 35 7 Q57 7 57 29 Q57 40 45 44 L45 51 L27 51 L27 44 Q15 40 15 29 M29 56 L43 56"];
  if (physics && /optic|light|ray|lens|wave/i.test(title)) {
    objects = ["Lens", "Prism", "Ray paths"];
    paths = ["M35 5 Q15 30 35 54 Q55 30 35 5 M5 30 L65 30 M35 1 L35 58", "M16 47 L35 9 L56 47 Z M1 25 L27 26 M44 29 L70 17 M45 32 L70 34 M46 35 L68 50", "M5 12 L35 30 L65 12 M5 48 L35 30 L65 48 M35 5 L35 55"];
  } else if (physics && !/electric|magnet|charge|capacitan|current/i.test(title)) {
    objects = ["Ruler", "Pendulum", "Balance"];
    paths = ["M8 20 L65 20 L65 43 L8 43 Z M17 20 L17 31 M27 20 L27 28 M37 20 L37 33 M47 20 L47 28 M57 20 L57 31", "M15 5 L60 5 M37 5 L51 43 M56 47 A6 6 0 1 1 44 47 A6 6 0 1 1 56 47 M37 5 L37 51", "M35 7 L35 53 M20 54 L51 54 M9 18 L62 18 M17 18 L8 38 L27 38 Z M53 18 L44 38 L63 38 Z"];
  }
  return <div className={`notebook-doodles ${bottom ? "notebook-doodles-bottom" : ""}`} aria-label={`${family} sketch illustrations`}>
    {objects.map((label, index) => <span key={label} style={{transform: `rotate(${index % 2 ? 3 : -3}deg)`}}><svg viewBox="0 0 76 60" aria-hidden="true"><path d={paths[index]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><small>{label}</small></span>)}<b aria-hidden="true">{bottom ? "Keep asking why!" : "Let's explore"}<i>✦</i></b>
  </div>;
}

/** Designed locally: crisp subject illustrations, no generated photographs or invented apparatus. */
export function LessonCover({title, objectives, subject = "", klass}: {title: string; objectives: string[]; subject?: string; klass?: string}) {
  const theme = coverTheme(subject, title), Icon = theme.Icon;
  const match = title.match(/^Chapter\s+(\d+)\s*[:.\-]\s*/i);
  const heading = title.replace(/^Chapter\s+\d+\s*[:.\-]\s*/i, "");
  const goals = [...new Set(objectives.map(item => item.trim()).filter(Boolean))];
  return <div className="lesson-cover notebook-cover" style={{"--cover-accent": theme.color, "--cover-pale": theme.pale} as CSSProperties}>
    <div className="cover-topline"><span><Icon size={20} strokeWidth={1.6} />{subject || theme.name}{klass ? ` / CLASS ${klass}` : ""}</span><span>EDUPLAN AI <span className="cover-top-dot" /></span></div>
    <NotebookDoodles family={theme.name} title={title} />
    <div className="cover-main-grid"><div className="cover-copy"><div className="cover-eyebrow">{match ? `CHAPTER ${match[1].padStart(2, "0")}` : "CHAPTER STUDY"}<span />MY CHAPTER NOTES</div><h1>{heading}</h1><div className="cover-title-rule" /><p className="cover-description">Read, sketch, connect.<br />Let’s make sense of the chapter.</p><div className="cover-subject-stamp"><Icon size={22} strokeWidth={1.6} /><span>{theme.name}<small>CHAPTER OVERVIEW</small></span></div></div><div className="cover-visual"><CoverFigure subject={subject} title={title} /><div className="cover-visual-corner">01 <ArrowUpRight size={18} /></div></div></div>
    <section className="cover-roadmap"><div className="cover-roadmap-label"><BookOpen size={19} /><strong>Inside this chapter</strong><small>{goals.length} selected {goals.length === 1 ? "topic" : "topics"}</small></div><ol>{goals.slice(0, 6).map((goal, i) => <li key={goal}><span>{String(i + 1).padStart(2, "0")}</span><p>{goal}</p></li>)}</ol>{goals.length > 6 && <p className="cover-more">+ {goals.length - 6} more topics covered in the lesson</p>}</section>
    <NotebookDoodles family={theme.name} title={title} bottom />
  </div>;
}

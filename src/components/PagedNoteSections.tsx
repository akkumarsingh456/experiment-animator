import {noteSpaceBalance} from "@/lib/slide-space-organizer";
import { MathematicsProse } from "@/components/MathematicsProse";
import { isMathematics } from "@/lib/mathematics-presentation";
/**
 * Teacher Notes sheet for the current slide.
 *
 * Continuation pages are built before rendering. This component never adds notes
 * after pagination or uses an inner vertical scrollbar. The text size is fitted
 * automatically so the notes fill the page: larger when notes are short,
 * smaller (and in two columns) when they are long. Each formula and its
 * derivation stay together as one unbreakable block.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import MathText from "@/components/MathText";
import { FormulaDerivation } from "@/components/FormulaDerivation";
import { guidedFormulaRow } from "@/lib/guided-notes";
import { toNoteBlocks, type NoteBlock, type NoteSectionLike } from "@/lib/notes-paging";
import { readableSourceRelation } from "@/lib/source-note-quality";
import { presentNoteLabels } from "@/lib/note-label-presentation";
import { ChemistrySourceEntry } from "@/components/ChemistrySourceEntry";

// Present repeated prose labels as a single heading, keeping mathematical
// derivation labels intact for the block grouping helpers.
export function groupNoteLabels(sections: NoteSectionLike[] | undefined): NoteSectionLike[] {
  const out: NoteSectionLike[] = [];
  for (const section of sections || []) {
    if (section.heading !== "Teacher Notes" || section.kind === "diagram") {
      out.push(section);
      continue;
    }
    let group: NoteSectionLike | undefined;
    for (const line of section.lines) {
      const match = line.match(/^\*\*(Definition|Key point|Important point|Use|Example|NCERT point):\*\*\s*(.+)$/i);
      const heading = match ? ({ Definition: "Definitions", "Key point": "Key points", "Important point": "Important points", Use: "Applications", Example: "Examples", "NCERT point": "Textbook points" } as Record<string, string>)[match[1]] || match[1] : "Teacher Notes";
      if (!group || group.heading !== heading) {
        group = { ...section, heading, lines: [] };
        out.push(group);
      }
      group.lines.push(match ? match[2] : line);
    }
  }
  return out;
}

function BlockView({ block, showHeading, subject, previousLine }: { block: NoteBlock; showHeading: boolean; subject?: string; previousLine?: string }) {
  const isDeriv = block.lines.some((l) => /derivation (of|step)/i.test(l));
  const presentation = presentNoteLabels(block.lines, block.heading, previousLine);
  return (
    <div className={`break-inside-avoid ${showHeading ? "pt-[0.4em] first:pt-0" : ""}`}>
      {showHeading && (
        <h4 className="text-[1.12em] font-semibold text-primary mb-[0.25em] pb-[0.1em] border-b border-border/60">
          {block.heading}
        </h4>
      )}
      {block.kind === "diagram" ? (
        <pre className="text-[0.85em] font-mono leading-[1.4] whitespace-pre overflow-x-auto text-foreground/90 rounded-md border border-border/50 bg-secondary/40 p-[0.7em]">
          {block.lines.join("\n")}
        </pre>
      ) : isDeriv ? <FormulaDerivation subject={subject} lines={block.lines} /> : (
        <ul
          className={`leading-relaxed space-y-[0.4em] text-foreground/90 break-words ${
            isDeriv ? "rounded-md border-l-2 border-primary/50 bg-secondary/30 py-[0.2em] pr-[0.3em]" : ""
          }`}
        >
          {block.lines.map((line, index) => (
            <li key={index} className="pl-[1em] -indent-[1em] [&_.katex-display]:my-[0.15em] [&_.katex-display]:indent-0 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
              {presentation[index].heading && <h5 className="note-label-heading">{presentation[index].heading}</h5>}
              {block.heading === "Problem-solving formula reference" ? (() => {
                const [name, expression, use] = line.split(" | ");
                return <div className="physics-reference-row"><strong>{name}</strong><div className="physics-reference-equation"><MathText subject={subject} text={expression || line} /></div><p><MathText subject={subject} text={use || ""} /></p></div>;
              })() : block.heading === "Source table — original extracted entries" ? <ChemistrySourceEntry text={presentation[index].text} /> : block.heading === "Source review — original extraction" ? <div className="source-table-entry"><MathText subject={subject} text={presentation[index].text} /></div> : block.heading === "MLT Dimensional Formula" && line.split(" | ").length === 3 ? (() => {
                const [quantity, expression, remember] = line.split(" | ");
                return <div className="dimension-card" style={{textIndent: 0}}><strong>{quantity}</strong><div className="dimension-expression"><MathText subject={subject} text={expression} /></div><p><b>Remember: </b>{remember}</p></div>;
              })() : /^(?:\*\*)?(?:formula|equation|relation):/i.test(line) && readableSourceRelation(line) ? (() => {
                const row = guidedFormulaRow(presentation[index].text.replace(/^\*\*[^*]+:\*\*\s*/, ""));
                return <div className="note-formula-card">{row.concept !== "Formula" && <strong><MathText subject={subject} text={row.concept} /></strong>}<div><MathText subject={subject} text={row.expression} /></div>{row.unit && <small>Unit: <MathText subject={subject} text={row.unit} /></small>}</div>;
              })() : <>• {isMathematics(subject) ? <MathematicsProse text={presentation[index].text} /> : <MathText subject={subject} text={presentation[index].text} />}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Measure the available viewport, never the naturally short notes card itself. */
export function noteSheetCapacity(host:HTMLElement,box:HTMLElement):number {
  const style=getComputedStyle(host),inset=getComputedStyle(box);
  const siblings=Array.from(host.children).filter(child=>child!==box) as HTMLElement[];
  const occupied=siblings.reduce((height,child)=>height+child.offsetHeight,0);
  const gap=(parseFloat(style.rowGap)||0)*Math.max(0,host.children.length-1);
  return Math.max(0,host.clientHeight-occupied-gap-(parseFloat(inset.paddingTop)||0)-(parseFloat(inset.paddingBottom)||0)-(parseFloat(inset.borderTopWidth)||0)-(parseFloat(inset.borderBottomWidth)||0));
}

const MIN_PX = 14;

export function PagedNoteSections({
  sections,
  scale,
  header,
  subject,
  onOverflow,
  organizeSpace = false,
}: {
  sections?: NoteSectionLike[];
  scale?: "card" | "present";
  header?: React.ReactNode;
  subject?: string;
  onOverflow?: (ratio: number, lines: string[]) => void;
  organizeSpace?: boolean;
}) {
  const blocks = useMemo(() => toNoteBlocks(groupNoteLabels(sections)), [sections]);
  const maxPx = scale === "present" ? 22 : 18;
  const hostRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ px: number; cols: 1 | 2 }>({ px: maxPx, cols: 1 });

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    const host=hostRef.current;
    if (!box || !content || !host) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        content.style.setProperty("--note-block-gap", "0px");
        box.style.marginTop = "0px";
        const inset = getComputedStyle(box);
        const availableHeight = noteSheetCapacity(host,box);
        const availableWidth = box.clientWidth - parseFloat(inset.paddingLeft) - parseFloat(inset.paddingRight);
        const fits = (px: number, cols: 1 | 2) => {
          content.style.fontSize = `${px}px`;
          content.style.columnCount = String(cols);
          return content.scrollHeight <= availableHeight + 1 && content.scrollWidth <= availableWidth + 1;
        };
        const search = (cols: 1 | 2) => {
          if (!fits(MIN_PX, cols)) return 0;
          let lo = MIN_PX;
          let hi = maxPx;
          while (hi - lo > 0.25) {
            const mid = (lo + hi) / 2;
            if (fits(mid, cols)) lo = mid;
            else hi = mid;
          }
          return lo;
        };
        const one = search(1);
        if (!one && availableHeight > 0 && blocks.length > 1) {
          // Repack the source topic into additional outer slides using actual DOM size.
          fits(MIN_PX, 1);
          onOverflow?.(content.scrollHeight / availableHeight, (sections || []).flatMap(section => section.lines));
        }
        const wide = box.clientWidth > 640;
        const two = wide && one < MIN_PX + 1 ? search(2) : 0;
        // A single indivisible equation/diagram may be fitted as a whole; prose has
        // already been split into continuation pages before it reaches this sheet.
        const atomicPx = !one && !two && blocks.length === 1
          ? MIN_PX * Math.min(1, availableHeight / Math.max(1, content.scrollHeight)) : MIN_PX;
        const next = two > one ? { px: two, cols: 2 as const } : { px: one || atomicPx, cols: 1 as const };
        content.style.fontSize = `${next.px}px`;
        content.style.columnCount = String(next.cols);
        // Keep natural spacing: spare room is for content, not stretched gaps.
        // Reset first so measuring never counts spacing from the previous pass.
        content.style.setProperty("--note-block-gap", "0px");
        const spare = Math.max(0, availableHeight - content.scrollHeight - 24);
        const balanced = noteSpaceBalance(availableHeight, content.scrollHeight, blocks.length);
        const gap = organizeSpace ? balanced.gap : Math.min(4, spare / Math.max(1, blocks.length));
        box.style.marginTop = `${organizeSpace ? balanced.inset : 0}px`;
        content.style.setProperty("--note-block-gap", `${gap}px`);
        setFit((prev) => (Math.abs(prev.px - next.px) < 0.2 && prev.cols === next.cols ? prev : next));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    ro.observe(box);
    // KaTeX fonts can change heights after first paint.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [blocks, sections, maxPx, header, onOverflow, organizeSpace]);

  return (
    <div ref={hostRef} className="flex-1 min-h-0 flex flex-col gap-1.5">
      {header}
      <div ref={boxRef} data-note-sheet className="min-h-0 overflow-hidden pr-2" style={{flex:"0 1 auto",maxHeight:"100%"}}>
        <div
          ref={contentRef}
          data-note-content
          style={{ fontSize: `${fit.px}px`, columnCount: fit.cols, columnGap: "1.5em" }}
         
        >
          {!blocks.length&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-slate-800">The source text for this page is incomplete or unreadable. Regenerate this topic using clearer textbook pages to recover the missing explanation.</p>}
          {blocks.map((block, index) => {
            const previous = blocks[index - 1];
            return (
              <BlockView
                key={`${block.sectionIndex}:${index}:${block.lines[0]}`}
                subject={subject}
                block={block}
                previousLine={previous?.sectionIndex === block.sectionIndex ? previous.lines.at(-1) : undefined}
                showHeading={!previous || previous.sectionIndex !== block.sectionIndex}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PagedNoteSections;

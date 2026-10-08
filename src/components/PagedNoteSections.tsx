/**
 * Teacher Notes sheet for the current slide.
 *
 * One page per slide — no inner notes pagination. The text size is fitted
 * automatically so the notes fill the page: larger when notes are short,
 * smaller (and in two columns) when they are long. Each formula and its
 * derivation stay together as one unbreakable block.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import MathText from "@/components/MathText";
import { toNoteBlocks, type NoteBlock, type NoteSectionLike } from "@/lib/notes-paging";

function BlockView({ block, showHeading }: { block: NoteBlock; showHeading: boolean }) {
  const isDeriv = block.lines.some((l) => /derivation of/i.test(l));
  return (
    <div className={`break-inside-avoid ${showHeading ? "pt-[0.4em] first:pt-0" : ""}`}>
      {showHeading && (
        <h4 className="text-[1.12em] font-semibold text-primary mb-[0.25em] pb-[0.1em] border-b border-border/60">
          {block.heading}
        </h4>
      )}
      {block.kind === "diagram" ? (
        <pre className="text-[0.72em] font-mono leading-[1.2] whitespace-pre overflow-hidden text-foreground/90 rounded-md border border-border/50 bg-secondary/40 p-[0.4em]">
          {block.lines.join("\n")}
        </pre>
      ) : (
        <ul
          className={`leading-snug space-y-[0.15em] text-foreground/90 break-words ${
            isDeriv ? "rounded-md border-l-2 border-primary/50 bg-secondary/30 py-[0.2em] pr-[0.3em]" : ""
          }`}
        >
          {block.lines.map((line, index) => (
            <li key={index} className="pl-[1em] -indent-[1em] [&_.katex-display]:my-[0.15em] [&_.katex-display]:indent-0 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
              • <MathText text={line} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const MIN_PX = 10;

export function PagedNoteSections({
  sections,
  scale,
  header,
}: {
  sections?: NoteSectionLike[];
  scale?: "card" | "present";
  header?: React.ReactNode;
}) {
  const blocks = useMemo(() => toNoteBlocks(sections), [sections]);
  const maxPx = scale === "present" ? 22 : 18;
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ px: number; cols: 1 | 2 }>({ px: maxPx, cols: 1 });

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const fits = (px: number, cols: 1 | 2) => {
          content.style.fontSize = `${px}px`;
          content.style.columnCount = String(cols);
          return content.scrollHeight <= box.clientHeight + 1 && content.scrollWidth <= box.clientWidth + 1;
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
        const wide = box.clientWidth > 640;
        const two = wide && one < 13 ? search(2) : 0;
        const next = two > one ? { px: two, cols: 2 as const } : { px: one || MIN_PX, cols: 1 as const };
        content.style.fontSize = `${next.px}px`;
        content.style.columnCount = String(next.cols);
        setFit((prev) => (Math.abs(prev.px - next.px) < 0.2 && prev.cols === next.cols ? prev : next));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    // KaTeX fonts can change heights after first paint.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [blocks, maxPx, header]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5">
      {header}
      <div ref={boxRef} className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={contentRef}
          style={{ fontSize: `${fit.px}px`, columnCount: fit.cols, columnGap: "1.5em" }}
          className="[column-rule:1px_solid_hsl(var(--border)/0.5)]"
        >
          {blocks.map((block, index) => {
            const previous = blocks[index - 1];
            return (
              <BlockView
                key={`${block.sectionIndex}:${index}:${block.lines[0]}`}
                block={block}
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

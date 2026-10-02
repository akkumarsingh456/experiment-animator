/**
 * A4 Teacher Notes sheet for the current slide.
 *
 * Long notes use numbered pages inside the slide. Each formula and its
 * derivation stays together, and the page itself never scrolls.
 */
import { useEffect, useMemo, useState } from "react";
import MathText from "@/components/MathText";
import { toNoteBlocks, type NoteBlock, type NoteSectionLike } from "@/lib/notes-paging";

function estimateRows(block: NoteBlock): number {
  return block.lines.reduce((sum, line) => {
    const plain = line.replace(/\$\$?/g, "").replace(/\\[a-zA-Z]+/g, "x");
    return sum + Math.max(1, Math.ceil(plain.length / 58));
  }, 0);
}

function paginateBlocks(blocks: NoteBlock[], maxRows: number): NoteBlock[][] {
  const pages: NoteBlock[][] = [];
  let page: NoteBlock[] = [];
  let rows = 0;
  for (const block of blocks) {
    const cost = estimateRows(block) + (page.length === 0 || page[page.length - 1]!.sectionIndex !== block.sectionIndex ? 2 : 0);
    if (page.length && rows + cost > maxRows) {
      pages.push(page);
      page = [];
      rows = 0;
    }
    page.push(block);
    rows += estimateRows(block) + (page.length === 1 || page[page.length - 2]?.sectionIndex !== block.sectionIndex ? 2 : 0);
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

function BlockView({ block, showHeading, base, mono }: { block: NoteBlock; showHeading: boolean; base: string; mono: string }) {
  return (
    <div className={showHeading ? "pt-2 first:pt-0" : ""}>
      {showHeading && (
        <h4 className="text-[clamp(13px,1.05vw,17px)] font-semibold text-primary mb-1 pb-0.5 border-b border-border/60">
          {block.heading}
        </h4>
      )}
      {block.kind === "diagram" ? (
        <pre className={`${mono} font-mono leading-[1.2] whitespace-pre overflow-hidden text-foreground/90 rounded-md border border-border/50 bg-secondary/40 p-1.5`}>
          {block.lines.join("\n")}
        </pre>
      ) : (
        <ul className={`${base} leading-snug space-y-0.5 text-foreground/90 break-words`}>
          {block.lines.map((line, index) => (
            <li key={index} className="pl-4 -indent-4 [&_.katex-display]:overflow-hidden [&_.katex-display]:indent-0">
              • <MathText text={line} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PagedNoteSections({
  sections,
  scale,
  header,
}: {
  sections?: NoteSectionLike[];
  scale?: "card" | "present";
  header?: React.ReactNode;
}) {
  const base = scale === "present" ? "text-[clamp(12px,0.95vw,15px)]" : "text-[clamp(12px,0.9vw,14px)]";
  const mono = scale === "present" ? "text-[clamp(9px,0.72vw,11px)]" : "text-[9px]";
  const blocks = useMemo(() => toNoteBlocks(sections), [sections]);
  const pages = useMemo(() => paginateBlocks(blocks, scale === "present" ? 21 : 18), [blocks, scale]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => setPageIndex(0), [sections]);
  const page = pages[Math.min(pageIndex, pages.length - 1)] || [];

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">
      <div className="flex-1 min-h-0 overflow-hidden">
        {header}
        {page.length > 0 && (
          <div className="space-y-1">
            {page.map((block, index) => {
              const previous = page[index - 1];
              return (
                <BlockView
                  key={`${block.sectionIndex}:${index}:${block.lines[0]}`}
                  block={block}
                  showHeading={!previous || previous.sectionIndex !== block.sectionIndex}
                  base={base}
                  mono={mono}
                />
              );
            })}
          </div>
        )}
      </div>
      {pages.length > 1 && (
        <div className="shrink-0 flex items-center justify-between border-t border-border/50 pt-1 text-[10px] text-muted-foreground">
          <button type="button" onClick={() => setPageIndex((value) => Math.max(0, value - 1))} disabled={pageIndex === 0} className="disabled:opacity-40 hover:text-foreground">
            Previous notes
          </button>
          <span>Notes page {pageIndex + 1} of {pages.length}</span>
          <button type="button" onClick={() => setPageIndex((value) => Math.min(pages.length - 1, value + 1))} disabled={pageIndex >= pages.length - 1} className="disabled:opacity-40 hover:text-foreground">
            Next notes
          </button>
        </div>
      )}
    </div>
  );
}

export default PagedNoteSections;

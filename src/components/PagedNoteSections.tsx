/**
 * Paged Teacher Notes.
 *
 * Measures the real rendered height of every notes block and splits them into
 * pages that fit the available space exactly — so a lesson page never scrolls.
 * Formulas keep their full derivation on the same page (see notes-paging.ts).
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MathText from "@/components/MathText";
import { toNoteBlocks, packMeasuredBlocks, type NoteBlock, type NoteSectionLike } from "@/lib/notes-paging";

function BlockView({
  block,
  showHeading,
  continued,
  base,
  mono,
}: {
  block: NoteBlock;
  showHeading: boolean;
  continued: boolean;
  base: string;
  mono: string;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-secondary/40 px-2.5 py-1.5">
      {showHeading && (
        <div className="text-[9px] font-semibold uppercase tracking-wider text-primary mb-1">
          {block.heading}
          {continued ? " (cont.)" : ""}
        </div>
      )}
      {block.kind === "diagram" ? (
        <pre className={`${mono} font-mono leading-[1.25] whitespace-pre overflow-x-auto text-foreground/90`}>
          {block.lines.join("\n")}
        </pre>
      ) : (
        <ul className={`${base} leading-snug space-y-1 text-foreground/90`}>
          {block.lines.map((l, k) => (
            <li key={k}>
              • <MathText text={l} />
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
  /** Rendered once above the notes on every page (title, pen board, …). */
  header?: React.ReactNode;
}) {
  const base = scale === "present" ? "text-[clamp(12px,1.2vw,18px)]" : "text-[12.5px]";
  const mono = scale === "present" ? "text-[clamp(9px,0.78vw,13px)]" : "text-[9.5px]";

  const blocks = useMemo(() => toNoteBlocks(sections), [sections]);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const plainMeasureRef = useRef<HTMLDivElement | null>(null);
  const headedMeasureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<number[][]>([]);
  const [page, setPage] = useState(0);

  const recompute = () => {
    const area = areaRef.current;
    const plainMeasure = plainMeasureRef.current;
    const headedMeasure = headedMeasureRef.current;
    if (!area || !plainMeasure || !headedMeasure) return;
    const available = area.clientHeight;
    if (!available) return;
    const plainHeights = Array.from(plainMeasure.children).map((c) => (c as HTMLElement).offsetHeight + 6);
    const headedHeights = Array.from(headedMeasure.children).map((c) => (c as HTMLElement).offsetHeight + 6);
    setPages(packMeasuredBlocks(blocks, plainHeights, headedHeights, available));
  };

  useLayoutEffect(recompute, [blocks, base, mono]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(area);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useEffect(() => {
    setPage(0);
  }, [sections]);

  if (!blocks.length) return <>{header}</>;

  const total = Math.max(1, pages.length);
  const currentPage = pages[Math.min(page, total - 1)] ?? [];

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      {header}
      <div ref={areaRef} className="flex-1 min-h-0 overflow-hidden relative">
        {/* Hidden measurer — same width, same styles. */}
        <div aria-hidden className="absolute inset-x-0 top-0 invisible pointer-events-none">
          <div ref={plainMeasureRef} className="space-y-1.5">
            {blocks.map((b, i) => (
              <BlockView key={i} block={b} showHeading={false} continued={false} base={base} mono={mono} />
            ))}
          </div>
          <div ref={headedMeasureRef} className="space-y-1.5">
            {blocks.map((b, i) => (
              <BlockView key={i} block={b} showHeading continued={false} base={base} mono={mono} />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {currentPage.map((bi, k) => {
            const b = blocks[bi]!;
            const prev = k > 0 ? blocks[currentPage[k - 1]!] : undefined;
            const showHeading = !prev || prev.sectionIndex !== b.sectionIndex;
            const firstOfSection = bi === blocks.findIndex((x) => x.sectionIndex === b.sectionIndex);
            return (
              <BlockView
                key={bi}
                block={b}
                showHeading={showHeading}
                continued={showHeading && !firstOfSection}
                base={base}
                mono={mono}
              />
            );
          })}
        </div>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-2 shrink-0 print:hidden">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[10px] font-mono text-muted-foreground">
            Notes page {Math.min(page, total - 1) + 1} / {total}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            disabled={page >= total - 1}
            onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default PagedNoteSections;

/**
 * Teacher Notes document for the CURRENT slide.
 *
 * There is exactly one navigation system (the slide index). Notes are never
 * paginated independently — if a slide's notes are longer than the visible
 * A4 area, they scroll smoothly inside the document. Formulas keep their full
 * derivation together (block grouping from notes-paging.ts).
 */

import { useEffect, useMemo, useRef } from "react";
import MathText from "@/components/MathText";
import { toNoteBlocks, type NoteBlock, type NoteSectionLike } from "@/lib/notes-paging";

function BlockView({ block, showHeading, base, mono }: { block: NoteBlock; showHeading: boolean; base: string; mono: string }) {
  return (
    <div className={showHeading ? "pt-3 first:pt-0" : ""}>
      {showHeading && (
        <h4 className="text-[clamp(15px,1.25vw,19px)] font-semibold text-primary mb-1.5 pb-1 border-b border-border/60">
          {block.heading}
        </h4>
      )}
      {block.kind === "diagram" ? (
        <pre className={`${mono} font-mono leading-[1.3] whitespace-pre overflow-x-auto text-foreground/90 rounded-md border border-border/50 bg-secondary/40 p-2`}>
          {block.lines.join("\n")}
        </pre>
      ) : (
        <ul className={`${base} leading-relaxed space-y-1.5 text-foreground/90 break-words`}>
          {block.lines.map((l, k) => (
            <li key={k} className="pl-4 -indent-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:indent-0">
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
  header?: React.ReactNode;
}) {
  const base = scale === "present" ? "text-[clamp(16px,1.25vw,20px)]" : "text-[clamp(15px,1.1vw,17px)]";
  const mono = scale === "present" ? "text-[clamp(11px,0.9vw,14px)]" : "text-[11px]";
  const blocks = useMemo(() => toNoteBlocks(sections), [sections]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [sections]);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth pr-2 space-y-3">
      {header}
      {blocks.length > 0 && (
        <div className="space-y-1.5">
          {blocks.map((b, i) => (
            <BlockView key={i} block={b} showHeading={i === 0 || blocks[i - 1]!.sectionIndex !== b.sectionIndex} base={base} mono={mono} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PagedNoteSections;

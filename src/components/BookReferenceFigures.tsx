import { Atom, FlaskConical, BookOpen, Zap } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReferenceVisual } from "@/lib/reference-visuals";

function SourceCrop({ figure, presentation, compact }: { figure: ReferenceVisual; presentation: boolean; compact: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  const ratio = figure.crop.width * figure.aspect / figure.crop.height;
  useLayoutEffect(() => {
    if (!presentation || !box.current) return;
    const element = box.current;
    const fit = () => setWidth(Math.max(1, Math.min(element.clientWidth, element.clientHeight * ratio)));
    const observer = new ResizeObserver(fit);
    observer.observe(element); fit();
    return () => observer.disconnect();
  }, [presentation, ratio]);
  const crop = <div className="book-figure-crop" style={{ aspectRatio: String(ratio), width: presentation && width ? `${width}px` : "100%", maxWidth: presentation ? "100%" : `${(compact ? 320 : 500) * ratio}px`, marginInline: "auto" }}>
    <img src={figure.url} alt={`${figure.title}: ${figure.description}`} crossOrigin="anonymous" style={{ width: `${100 / figure.crop.width}%`, height: `${100 / figure.crop.height}%`, left: `${-100 * figure.crop.x / figure.crop.width}%`, top: `${-100 * figure.crop.y / figure.crop.height}%` }} />
  </div>;
  return presentation ? <div ref={box} className="book-map-image-space">{crop}</div> : crop;
}

/** Display original bonds, charges, arrows and labels directly from the book. */
export function BookReferenceFigures({ figures, compact = false, presentation = false, subject }: { figures?: ReferenceVisual[]; compact?: boolean; presentation?: boolean; subject?: string }) {
  const available = figures?.filter(figure => !!figure.url) || [];
  if (!available.length) return null;
  return <section className={presentation ? "book-figure-stack book-figure-presentation" : compact ? "book-figure-stack book-figure-compact" : "book-figure-stack"} aria-label="Structures and diagrams from your books">
    {available.slice(0, compact || presentation ? 1 : available.length).map((figure, index) => {
      const Icon = figure.kind === "reaction" ? FlaskConical : /physics/i.test(subject || "") ? Zap : Atom;
      return <figure className="book-reference-figure" key={`${figure.storage_path}:${index}`}>
        <figcaption><Icon size={20} aria-hidden="true" /><strong>{figure.title}</strong><span>{figure.capture === "page" ? "Original book page" : figure.kind === "reaction" ? "Reaction scheme" : figure.kind === "structure" ? "Molecular structure" : "Labelled diagram"}</span></figcaption>
        <SourceCrop figure={figure} presentation={presentation} compact={compact} />
        <p>{figure.description}</p>
        <small><BookOpen size={13} aria-hidden="true" />{figure.book || "Uploaded book"} · {figure.chapter ? `${figure.chapter} · ` : ""}PDF page {figure.page}</small>
      </figure>;
    })}
  </section>;
}

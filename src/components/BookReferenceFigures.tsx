import { Atom, FlaskConical, BookOpen, Zap } from "lucide-react";
import type { ReferenceVisual } from "@/lib/reference-visuals";

/** Display original bonds, charges, arrows and labels directly from the book. */
export function BookReferenceFigures({ figures, compact = false, subject }: { figures?: ReferenceVisual[]; compact?: boolean; subject?: string }) {
  const available = figures?.filter(figure => !!figure.url) || [];
  if (!available.length) return null;
  return <section className={compact ? "book-figure-stack book-figure-compact" : "book-figure-stack"} aria-label="Structures and diagrams from your books">
    {available.slice(0, compact ? 1 : 8).map((figure, index) => {
      const Icon = figure.kind === "reaction" ? FlaskConical : /physics/i.test(subject || "") ? Zap : Atom;
      return <figure className="book-reference-figure" key={`${figure.storage_path}:${index}`}>
        <figcaption><Icon size={20} aria-hidden="true" /><strong>{figure.title}</strong><span>{figure.kind === "reaction" ? "Reaction scheme" : figure.kind === "structure" ? "Molecular structure" : "Labelled diagram"}</span></figcaption>
        <div className="book-figure-crop" style={{ aspectRatio: `${figure.crop.width * figure.aspect} / ${figure.crop.height}`, maxWidth: `${(compact ? 320 : 500) * figure.crop.width * figure.aspect / figure.crop.height}px`, marginInline: "auto" }}>
          <img src={figure.url} alt={`${figure.title}: ${figure.description}`} crossOrigin="anonymous" style={{ width: `${100 / figure.crop.width}%`, height: `${100 / figure.crop.height}%`, left: `${-100 * figure.crop.x / figure.crop.width}%`, top: `${-100 * figure.crop.y / figure.crop.height}%` }} />
        </div>
        <p>{figure.description}</p>
        <small><BookOpen size={13} aria-hidden="true" />{figure.book || "Uploaded book"} · PDF page {figure.page}</small>
      </figure>;
    })}
  </section>;
}

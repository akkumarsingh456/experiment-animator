import { BookReferenceFigures } from "@/components/BookReferenceFigures";
import type { ReferenceVisual } from "@/lib/reference-visuals";

/** A complete source reaction map gets the slide width and its own source caption. */
export function BookMapSlide({ title, figures, subject }: { title: string; figures?: ReferenceVisual[]; subject?: string }) {
  return <div className="book-map-slide">
    <h3>{title}</h3>
    <BookReferenceFigures figures={figures} presentation subject={subject} />
  </div>;
}

import type { Slide } from "@/lib/generate.functions";
import { sourceIndexEntries } from "@/lib/source-index-presentation";

export function SourceIndexReview({ slides }: { slides: Slide[] }) {
  const entries = slides.flatMap((slide) =>
    sourceIndexEntries(slide).map((text) => ({ title: slide.title, text })),
  );
  if (!entries.length) return null;
  return (
    <details className="my-4 rounded-xl border border-border bg-card p-4 print:hidden">
      <summary className="cursor-pointer font-semibold">
        Original textbook index entries ({entries.length})
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Term-and-page listings are kept here for source reference, separate from the lesson notes
        and slides. Original wording is retained.
      </p>
      <div className="mt-3 max-h-80 space-y-3 overflow-auto">
        {entries.map((entry, index) => (
          <section key={index}>
            <h4 className="text-sm font-semibold">{entry.title}</h4>
            <pre className="mt-1 whitespace-pre-wrap break-words rounded border p-3 text-xs">
              {entry.text}
            </pre>
          </section>
        ))}
      </div>
    </details>
  );
}

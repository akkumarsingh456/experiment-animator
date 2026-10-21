import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/MathText";

type Props = {
  lines: string[];
  subject: string;
  disabled?: boolean;
  onImport: (lines: string[], wholePassage: boolean) => void;
};
/** Change presentation and selection only; keep every source sentence verbatim. */
export function TopicTextPreview({ lines, subject, disabled, onImport }: Props) {
  const [view, setView] = useState<"paragraphs" | "points">("paragraphs");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const chosen = lines.filter((_, index) => selected.has(index));
  return (
    <div className="my-3">
      <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Source text display">
        <Button
          size="sm"
          variant={view === "paragraphs" ? "default" : "outline"}
          aria-pressed={view === "paragraphs"}
          onClick={() => setView("paragraphs")}
        >
          Paragraphs
        </Button>
        <Button
          size="sm"
          variant={view === "points" ? "default" : "outline"}
          aria-pressed={view === "points"}
          onClick={() => setView("points")}
        >
          Points
        </Button>
      </div>
      <p className="mb-3 text-sm text-slate-600">
        Read the source sentences below. Tick the passages you want to extract, or import all the
        notes.
      </p>
      <div
        className="max-h-96 select-text space-y-4 overflow-y-auto rounded-lg bg-slate-50 p-4 text-base leading-relaxed"
        aria-label="Source notes preview"
      >
        {lines.map((line, index) => (
          <div key={index} className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1.5 h-4 w-4 shrink-0"
              aria-label={`Select passage ${index + 1}`}
              checked={selected.has(index)}
              onChange={() =>
                setSelected((previous) => {
                  const next = new Set(previous);
                  if (next.has(index)) next.delete(index);
                  else next.add(index);
                  return next;
                })
              }
            />
            <p className="min-w-0 flex-1">
              {view === "points" && <span aria-hidden="true">• </span>}
              <MathText text={line} subject={subject} />
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => onImport(lines, true)}>
          Import these notes
        </Button>
        <Button
          variant="outline"
          disabled={disabled || !chosen.length}
          onClick={() => onImport(chosen, chosen.length === lines.length)}
        >
          Import selected passages ({chosen.length})
        </Button>
      </div>
      {!!chosen.length && chosen.length < lines.length && (
        <p className="mt-2 text-sm text-slate-600">
          Selected excerpts are imported as teacher notes for your review.
        </p>
      )}
    </div>
  );
}

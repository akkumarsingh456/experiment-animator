import {quantumNumberNotation} from '@/lib/quantum-number-notation';
import katex from "katex";
import { normalNoteLabel } from "@/lib/note-labels";
import { autoLatex, splitMath, normalizeLatex, latexToUnicode } from "@/lib/latex-notation";

/**
 * Renders a note line containing **bold** labels and LaTeX math
 * (`$inline$`, `$$display$$`) using KaTeX. Falls back to the raw
 * source text when a fragment fails to parse, so notes never break.
 */
export function MathText({ text }: { text: string }) {
  // Presentation only: highlight explicit exception wording; never infer a
  // scientific exception from an element name, numerical value or equation.
  const exception = /\b(?:exceptions?|exceptional|anomalous|anomaly|anomalies|unusual behavio[u]?r|deviat(?:es?|ion) from (?:the )?(?:general|usual|expected))\b/i.test(text)
    && !/\b(?:no exceptions?|without exception|not an exception)\b/i.test(text);
  const segments = splitMath(autoLatex(quantumNumberNotation(normalNoteLabel(text))));
  return (
    <span className={exception ? "note-exception" : undefined}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          const parts = seg.value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
          return (
            <span key={i}>
              {parts.map((p, k) =>
                p.startsWith("**") && p.endsWith("**") ? (
                  <strong key={k} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
                ) : (
                  <span key={k}>{p}</span>
                ),
              )}
            </span>
          );
        }
        const body = normalizeLatex(seg.value);
        if (!body) return <span key={i}>{latexToUnicode(seg.value)}</span>;
        let html = "";
        try {
          html = katex.renderToString(body, {
            displayMode: seg.type === "block",
            throwOnError: false,
            strict: false,
            output: "htmlAndMathml",
          });
        } catch {
          return <span key={i}>{latexToUnicode(seg.value)}</span>;
        }
        return (
          <span
            key={i}
            className={seg.type === "block" ? "note-math note-math-display block my-1 overflow-x-auto" : "note-math inline-block align-middle"}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

export default MathText;

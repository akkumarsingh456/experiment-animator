import katex from "katex";
import { autoLatex, splitMath } from "@/lib/latex-notation";

/**
 * Renders a note line containing **bold** labels and LaTeX math
 * (`$inline$`, `$$display$$`) using KaTeX. Falls back to the raw
 * source text when a fragment fails to parse, so notes never break.
 */
export function MathText({ text }: { text: string }) {
  const segments = splitMath(autoLatex(text));
  return (
    <>
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
        let html = "";
        try {
          html = katex.renderToString(seg.value, {
            displayMode: seg.type === "block",
            throwOnError: false,
            strict: false,
            output: "html",
          });
        } catch {
          return <span key={i} className="font-mono">{seg.value}</span>;
        }
        return (
          <span
            key={i}
            className={seg.type === "block" ? "block my-1 overflow-x-auto" : "inline-block align-middle"}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </>
  );
}

export default MathText;

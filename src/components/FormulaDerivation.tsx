import { MathText } from "@/components/MathText";
import { guidedFormulaRow } from "@/lib/guided-notes";
import { presentNoteLabels } from "@/lib/note-label-presentation";

/** Keep the target relation separate from the numbered reasoning that leads to it. */
export function FormulaDerivation({ lines }: { lines: string[] }) {
  const header = lines.find((line) => /^\s*\*\*derivation of\b/i.test(line));
  const label = header?.match(/^\s*\*\*derivation of\s*(.*?):\*\*/i)?.[1] || "Derivation";
  const target = header?.replace(/^\s*\*\*[^*]+:\*\*\s*/, "") || "";
  const relation = guidedFormulaRow(target);
  const steps = lines.filter((line) => !/^\s*\*\*(?:formula|derivation of)\b/i.test(line));
  const presentation = presentNoteLabels(steps.map(line => line.replace(/^\s*\*\*derivation step\s*\d*:\*\*\s*/i, "")), "Step-by-step derivation");
  return (
    <div className="formula-derivation">
      {header && (
        <div className="formula-derivation-target">
          <strong>{label}</strong>
          <div>
            <MathText text={relation.expression} />
          </div>
        </div>
      )}
      <ol className="guided-derivation-flow">
        {steps.map((line, index) => {
          const number = line.match(/^\s*\*\*derivation step\s*(\d+)/i)?.[1] || String(index + 1);
          return (
            <li key={index}>
              <span className="formula-step-number" aria-label={`Step ${number}`}>
                {number}
              </span>
              <div>
                {presentation[index].heading && <h5 className="note-label-heading">{presentation[index].heading}</h5>}
                <MathText text={presentation[index].text} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

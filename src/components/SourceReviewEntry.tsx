import { splitMath } from "@/lib/latex-notation";
import { MathText } from "@/components/MathText";

// Display emphasis only. Keep original wording, spacing and mathematical spans;
// highlighting is a reading aid, never a claim that an extraction is verified.
const KEYWORDS = /(\*\*[^*]+\*\*|\b(?:potential energy|kinetic energy|gravitational potential|work done|conservation of energy|electric field|magnetic field|electric current|potential difference|acceleration|velocity|displacement|equilibrium|oxidation|reduction|catalyst|temperature|pressure|resistance|frequency|wavelength|photosynthesis|respiration|definition|explanation|conclusion|therefore|important|constant|infinity|difference)\b)/gi;

export function SourceReviewEntry({ text, subject }: { text: string; subject?: string }) {
  return <div className="source-review-entry">{splitMath(text).map((part, index) =>
    part.type === "text" ? <span key={index}>{part.value.split(KEYWORDS).map((word, i) =>
      i % 2 ? <mark key={i}>{word}</mark> : <span key={i}>{word}</span>
    )}</span> : <MathText key={index} subject={subject} text={`${part.type === "block" ? "$$" : "$"}${part.value}${part.type === "block" ? "$$" : "$"}`} />
  )}</div>;
}

import { splitMath } from "@/lib/latex-notation";
import { MathText } from "@/components/MathText";
import { verifiedSourceNotation } from '@/lib/verified-source-notation';
import { sourceExtractionIssue } from '@/lib/source-extraction-review';
import { hasBrokenSourceMath } from '@/lib/source-note-quality';

// Display emphasis only. Keep original wording, spacing and mathematical spans;
// highlighting is a reading aid, never a claim that an extraction is verified.
const KEYWORDS = /(\*\*[^*]+\*\*|\b(?:potential energy|kinetic energy|gravitational potential|work done|conservation of energy|electric field|magnetic field|electric current|potential difference|acceleration|velocity|displacement|equilibrium|oxidation|reduction|catalyst|temperature|pressure|resistance|frequency|wavelength|photosynthesis|respiration|definition|explanation|conclusion|therefore|important|constant|infinity|difference)\b)/gi;

export function SourceReviewEntry({ text, subject }: { text: string; subject?: string }) {
  const displayed=verifiedSourceNotation(text);
  const issue=sourceExtractionIssue(displayed)||(hasBrokenSourceMath(displayed)?'The PDF lost part of this mathematical notation. Check the original textbook equation before using it.':null);
  if(issue)return <div className="source-review-entry"><p>{issue}</p><details className="mt-2"><summary className="cursor-pointer text-sm">View original extraction</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm">{text}</p></details></div>;
  return <div className="source-review-entry">{splitMath(displayed).map((part, index) =>
    part.type === "text" ? <span key={index}>{part.value.split(KEYWORDS).map((word, i) =>
      i % 2 ? <mark key={i}>{word}</mark> : <span key={i}>{word}</span>
    )}</span> : <MathText key={index} subject={subject} text={`${part.type === "block" ? "$$" : "$"}${part.value}${part.type === "block" ? "$$" : "$"}`} />
  )}</div>;
}

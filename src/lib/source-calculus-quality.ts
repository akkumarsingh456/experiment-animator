import {splitMath,mapOutsideMath} from './latex-notation';

/** A complete verbal definition identifies both differentiated quantities.
 * This does not recover an equation from symbol proximity alone. */
export function namedDerivativeNotation(raw:string):string {
 return mapOutsideMath(raw,text=>text.split(/(```[\s\S]*?```|`[^`]*`|"[^"\n]*"|“[^”\n]*”)/g).map((part,index)=>index%2?part:part.replace(
  /\bderivative\s+d([A-Za-z])\s+d([A-Za-z])\s*,?\s*(?:we mean|represents?)\s+(?:the )?rate of change of\s+([^.;!?]{1,140}?)\s+with respect to\s+([^.;!?]{1,80})/g,
  (match,a,b,numerator,denominator)=>new RegExp(`\\b${a}\\b`).test(numerator)&&new RegExp(`\\b${b}\\b`).test(denominator)?match.replace(new RegExp(`d${a}\\s+d${b}`),`$\\frac{d${a}}{d${b}}$`):match
 )).join(''));
}

/** Detect lost two-dimensional calculus notation, never reconstruct it from
 * adjacent symbols. Authored math, quotations and code remain opaque. */
export function collapsedCalculusIssue(raw:string):string|null {
 if(/^\s*\*\*(?:code|program|algorithm|syntax|output):/i.test(raw))return null;
 const prose=splitMath(namedDerivativeNotation(raw)).filter(part=>part.type==='text').map(part=>part.value.replace(/```[\s\S]*?```|`[^`]*`|"[^"\n]*"|“[^”\n]*”/g,' ')).join(' ');
 if(!/[=≠]|\b(?:derivative|differentiation|chain rule|rate of change)\b/i.test(prose))return null;
 const compact=prose.match(/\b\d*[A-Za-z]{6,}\b/g)||[];
 if(compact.some(token=>(token.match(/d[Artxyvs]/g)||[]).length>=3)
   ||/\b(?:derivative|chain rule|rate of change)\b[\s\S]*\bd[A-Za-z]\s+d[A-Za-z]\b/i.test(prose)
   ||/\b[xyz]\s+[fgh]\s+[txyz]\s*=\s*and\s*[xyz]\s+[fgh]\s+[txyz]\s*=/i.test(prose)
   ||/\b\d+(?:\.\d+)?(?:cm|mm|km|m|s)and[xyz]\b/.test(prose))
  return 'The PDF flattened a derivative or function expression and lost its fraction bars or grouping. Recover the matching textbook equation; adjacent symbols cannot safely be treated as a formula.';
 if(/\bChapter\s+\d+\s+[A-Z][A-Z -]{12,}/.test(prose))
  return 'A chapter running heading interrupts the mathematical explanation. Recover the uninterrupted textbook passage before using this equation.';
 if(/\b(?:polynomial|quadratic|cubic|total cost|marginal cost)\b/i.test(prose)&&(prose.match(/\b[xyz]\s+[2-9]\b/g)||[]).length>=2)
  return 'The extracted polynomial may have lost its exponents. Compare the original equation rather than interpreting the detached numbers as powers or factors.';
 return null;
}

/** Separate a new, explicitly numbered example from a preceding source step.
 * Keep the words and numbers exactly as extracted. */
export function splitSourceExamples(raw:string):string[]{
 if(/```|"[^"\n]*Example\s+\d+|“[^”\n]*Example\s+\d+/i.test(raw))return [raw];
 if(splitMath(raw).some(part=>part.type!=='text'&&/\bExample\s+\d+/.test(part.value)))return [raw];
 return raw.split(/(?=\bExample\s+\d+\s+(?:Find|The|A|An|Show|Determine|Calculate)\b)/).map(line=>line.trim()).filter(Boolean);
}

import {splitMath} from '@/lib/latex-notation';

/** Mentioning a named unit is not the same as stating a quantity's SI unit. */
export function isUnitStatement(text:string):boolean {
  return /\b(?:SI|S\.I\.)\s+units?\b|\bunits?\s+of\b|\b(?:measured|expressed)\s+in\b|\b(?:units?\s+(?:is|are)|(?:has|have)\s+(?:the\s+)?units?)\b/i.test(text)
    && text.length < 300;
}
const definition = (text:string) => /\b(?:is defined as|is called|is known as|refers to|means)\b/i.test(text)
  || /\b(?:law|field|potential|capacitance|resistance|current|force|energy|momentum|molarity|molality|osmosis|diffusion)\s+is\s+(?:a|an|the)\b/i.test(text);
const formula = (text:string) => {
  if (text.length > 220 || text.replace(/\$[^$]*\$/g,' ').split(/\s+/).length > 20) return false;
  return splitMath(text).some(part => part.type !== 'text' && /[=∝]|\\(?:propto|approx|rightarrow|rightleftharpoons)\b/.test(part.value))
    || /[A-Za-zΔ]\s*=\s*[^=]/.test(text);
};

/** Presentation repair for saved notes; never rewrite the sentence or equation. */
export function normalNoteLabel(line:string):string {
  const match = line.match(/^\s*\*\*(SI units?|units?|key point|important point):\*\*\s*([\s\S]*)$/i);
  if (!match) return line;
  const body=match[2];
  if (/^(?:SI units?|units?)$/i.test(match[1]) && isUnitStatement(body)) return `**SI unit:** ${body}`;
  if (definition(body)) return `**Definition:** ${body}`;
  if (formula(body)) return `**Formula:** ${body}`;
  return body;
}

import {splitMath} from '@/lib/latex-notation';

/** Mentioning a named unit is not the same as stating a quantity's SI unit. */
export function isUnitStatement(text:string):boolean {
  return /\b(?:SI|S\.I\.)\s+units?\b|\bunits?\s+of\b|\b(?:measured|expressed)\s+in\b|\b(?:units?\s+(?:is|are)|(?:has|have)\s+(?:the\s+)?units?)\b/i.test(text)
    && text.length < 300;
}
export const isDefinitionStatement = (text:string) => /\b(?:is defined as|is called|is known as|refers to|means)\b/i.test(text)
  || /\b(?:law|field|potential|capacitance|resistance|current|force|energy|momentum|molarity|molality|osmosis|diffusion)\s+is\s+(?:a|an|the)\b/i.test(text)
  || (!/^(?:it|this|that|these|those|there|they|we|thus|hence)\b/i.test(text.trim()) && /^[\p{L}][\p{L}\p{M}\s’'()-]{2,60}\s+(?:is|are)\s+(?:a|an|the process|the phenomenon|the study)\b/iu.test(text.trim()));
const formula = (text:string) => {
  if (text.length > 220 || text.replace(/\$[^$]*\$/g,' ').split(/\s+/).length > 20) return false;
  return splitMath(text).some(part => part.type !== 'text' && /[=∝]|\\(?:propto|approx|rightarrow|rightleftharpoons)\b/.test(part.value))
    || /[A-Za-zΔ]\s*=\s*[^=]/.test(text);
};

/** Classify explicit source statements without adding a scientific claim. */
export function sourceDetailLabel(text:string):string|undefined {
  if (/\b(?:limitation|limitations|not valid|fails? (?:to|for|when)|cannot be (?:used|applied)|does not (?:apply|hold)|limited to|not applicable|breaks? down)\b/i.test(text)) return 'Limitation';
  if (/\b(?:provided that|valid (?:only |when|for|under)|applicable (?:only |when|for)|under (?:the )?(?:condition|assumption)|assum(?:e|es|ed|ing)|at constant|in the absence of|only (?:if|when)|catalyst|reaction conditions?)\b/i.test(text)) return 'Condition';
  if (/\b(?:used (?:in|as|for|to)|applications?|practical use|industrial use)\b/i.test(text)) return 'Use';
  if (/\b(?:because|as a result|due to|consequently|this explains|mechanism)\b/i.test(text)) return 'Explanation';
}

/** Presentation repair for saved notes; never rewrite the sentence or equation. */
export function normalNoteLabel(line:string):string {
  const match = line.match(/^\s*\*\*(SI units?|units?|key point|important point):\*\*\s*([\s\S]*)$/i);
  if (!match) return line;
  const body=match[2];
  if (/^(?:SI units?|units?)$/i.test(match[1]) && isUnitStatement(body)) return `**SI unit:** ${body}`;
  if (isDefinitionStatement(body)) return `**Definition:** ${body}`;
  if (formula(body)) return `**Formula:** ${body}`;
  const detail=sourceDetailLabel(body);
  if(detail)return `**${detail}:** ${body}`;
  return body;
}

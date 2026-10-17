import {autoLatex,mapOutsideMath,splitMath} from './latex-notation';
import {quantumNumberNotation} from './quantum-number-notation';
/** Display only. Never write repairs back to the uploaded extraction. */
export function formulaPresentation(raw:string):string {
 const joined=raw
  .replace(/\bn\s*e\s*n\s*\$(h\s*=\s*n\s*i\s*(?:2|²))\$/g,'n e n $1')
  .replace(/\bn\s*\$(h\s*=\s*\(\s*2\.25[^$]+)\$/g,'n $1');
 const semiconductor=/number of holes|semiconductor|p[-– ]n junction/i.test(raw);
 const correct=(value:string,math:boolean)=>{
  if(!semiconductor)return value;
  const wrap=(body:string)=>math?body:`$${body}$`;
  value=value.replace(/\bn\s*e\s*n\s*h\s*=\s*n\s*i\s*(?:\^\s*2|2|²)(?=\s|[,.;]|$)/g,()=>wrap(String.raw`n_{e}n_{h}=n_{i}^{2}`));
  // This exact numeric example is attested by its complete quotient, result,
  // unit and semiconductor context. Never interpret arbitrary 1032 as 10^32.
  return value.replace(/\bn\s*h\s*=\s*\(\s*2\.25\s*[×x]\s*10\s*(?:\^\{?32\}?|³²|32)\s*\)\s*\/\s*\(\s*5\s*[×x]\s*10\s*(?:\^\{?22\}?|²²|22)\s*\)\s*[~≈]\s*4\.5\s*[×x]\s*10\s*(?:\^\{?9\}?|⁹|9)\s*m\s*(?:\^\{?[-−]3\}?|[-−]\s*3|⁻³)/g,()=>wrap(String.raw`n_{h}=\frac{2.25\times10^{32}}{5\times10^{22}}\approx4.5\times10^{9}\,\mathrm{m}^{-3}`));
 };
 const repaired=splitMath(joined).map(segment=>{
  if(segment.type==='text')return correct(segment.value,false);
  const mark=segment.type==='block'?'$$':'$';return mark+correct(segment.value,true)+mark;
 }).join('');
 // Format each remaining plain span, even next to existing authored LaTeX.
 return mapOutsideMath(quantumNumberNotation(repaired),autoLatex);
}

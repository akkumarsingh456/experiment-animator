import {splitMath} from './latex-notation';
/** Presentation-only recovery of explicit initial/final quantum-number labels. */
export function quantumNumberNotation(raw:string):string {
 // Older auto-formatting sometimes left n outside an inline f expression.
 const joined=raw.replace(/\bn\s*\$f\s*=\s*(\d+)\s*and\s*n\s*i\s*=\s*([\d, ]+)\$/g,(_,f,i)=>`$n_{f}=${f}\\quad\\text{and}\\quad n_{i}=${i.trim()}$`);
 return splitMath(joined).map(segment=>{
  if(segment.type==='text')return segment.value
   .replace(/(\d)and(?=n\s*[if]\s*=)/g,'$1 and ')
   .replace(/\bn\s*([if])\s*=\s*(\d+(?:\s*,\s*\d+)*)/g,(_,index,value)=>`$n_{${index}}=${value}$`);
  const value=segment.value.replace(/\bn\s*([if])(?=\s*=)/g,'n_{$1}')
   .replace(/(\d)\s*and\s*n_\{([if])\}/g,'$1\\quad\\text{and}\\quad n_{$2}');
  const mark=segment.type==='block'?'$$':'$';return mark+value+mark;
 }).join('');
}

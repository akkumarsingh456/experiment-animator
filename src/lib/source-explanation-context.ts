/** Join only immediately adjacent source sentences; never invent an antecedent. */
export const isDependentSourceDefinition=(line:string)=>/^(?:This (?:property|phenomenon|process|ability)|Such [^.!?]{1,160})\s+(?:is|are)\s+(?:called|known as)\b/i.test(line);
export function joinSourceExplanations(lines:string[]):string[]{
 const output:string[]=[];
 for(const line of lines){
  if(isDependentSourceDefinition(line)&&output.length&&output.at(-1)!.length<650&&!/[?]$/.test(output.at(-1)!))output[output.length-1]+=' '+line;
  else output.push(line);
 }
 return output;
}

export function contextualizeSourceDefinitions<T extends {lines:string[]}>(sections:T[]|undefined,source:string):T[]|undefined {
 if(!sections||!source)return sections;
 const joined=joinSourceExplanations(source.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/));
 return sections.map(section=>({...section,lines:section.lines.map(line=>{
  const body=line.replace(/^\*\*[^*]+:\*\*\s*/,'');
  if(!isDependentSourceDefinition(body))return line;
  const context=joined.find(candidate=>candidate!==body&&candidate.endsWith(body));
  return context?line.slice(0,line.length-body.length)+context:line;
 })}));
}

/** Read only a complete, explicitly headed symbol/name activity-series table.
 * Missing rows or lost direction remain unresolved; no table values are guessed. */
export function sourceReactivitySeries(topic:string,text:string):string[]{
 if(!/^reactivity series$/i.test(topic.trim()))return [];
 const table=text.match(/Table\s+3\.2\s+Activity series\s*:?\s*Relative reactivities of metals([\s\S]*?)(?=\n\s*3\.3\s|$)/i)?.[1];
 if(!table||!/Most reactive/i.test(table)||!/Least reactive/i.test(table))return [];
 const expected=[['K','Potassium'],['Na','Sodium'],['Ca','Calcium'],['Mg','Magnesium'],['Al','Aluminium'],['Zn','Zinc'],['Fe','Iron'],['Pb','Lead'],['H','Hydrogen'],['Cu','Copper'],['Hg','Mercury'],['Ag','Silver'],['Au','Gold']];
 const plain=table.replace(/[|$\[\]]/g,' ').replace(/\s+/g,' ');
 let after=0;
 for(const [symbol,name] of expected){const match=new RegExp(`\\b${symbol}\\s+${name}\\b`,'i').exec(plain.slice(after));if(!match)return [];after+=match.index+match[0].length;}
 return ['The source table lists decreasing reactivity in this order: K > Na > Ca > Mg > Al > Zn > Fe > Pb > [H] > Cu > Hg > Ag > Au. The bracketed hydrogen entry is the reference shown in the table.'];
}

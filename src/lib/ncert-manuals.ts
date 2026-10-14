import catalog from './ncert-manual-catalog.json';

export type ManualLink = { klass: string; subject: string; title: string; url: string;
  entries: Array<{ page: number; label: string; terms: string }> };
export type MatchedManual = ManualLink & { page: number; experiment: string; score: number };
const STOP = new Set('the and for from with that this into class chapter part introduction study practical experiment activities activity properties basic some theory principle manual using determine verify observation'.split(' '));
function words(value: string) {
  return value.toLowerCase().replace(/\((?:physics|chemistry|biology)\)/g,'').replace(/isation\b/g,'ization').replace(/\bohm.s?\b/g,'ohm')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/)
    .map(word=>word.length>5?word.replace(/ies$/,'y').replace(/s$/,''):word)
    .filter(word=>word.length>2&&!STOP.has(word)&&!/^\d+$/.test(word));
}
const related: Array<[RegExp,string]> = [
  [/units|measurement/i,'vernier screw gauge spherometer measurement'],
  [/current electricity|ohm/i,'current voltage resistance resistor ohm'],
  [/electrostatic|capacitance|electric charges/i,'charge capacitor capacitance electrostatic'],
  [/electromagnetic induction|alternating current/i,'induction coil induced alternating'],
  [/magnetism|magnetic effect/i,'magnet magnetic compass galvanometer'],
  [/ray optics|light.*reflection|human eye/i,'lens mirror refraction focal optical'],
  [/wave optics/i,'interference diffraction wave'],
  [/oscillation|sound|waves/i,'pendulum vibration frequency sound wave'],
  [/mechanical properties of fluids/i,'viscosity surface tension fluid capillary'],
  [/thermal properties|thermodynamics|heat/i,'calorimeter specific heat temperature cooling'],
  [/motion|force|laws of motion/i,'motion velocity acceleration force friction'],
  [/chemical kinetics/i,'reaction rate kinetics'],
  [/solutions/i,'solution solubility'],
  [/electrochemistry/i,'electrochemical electrode cell conductivity'],
  [/equilibrium/i,'equilibrium ionic pH'],
  [/organic|hydrocarbon|alcohol|phenol|aldehyde|ketone|carboxylic/i,'organic compound functional group'],
  [/biomolecules/i,'carbohydrate protein fat starch'],
  [/matter in our surroundings/i,'melting boiling evaporation'],
  [/matter around us pure/i,'mixture separation solution suspension colloid'],
  [/fundamental unit of life|cell/i,'cell microscope onion osmosis'],
  [/life processes|photosynthesis/i,'photosynthesis respiration starch'],
  [/reproduction|flower/i,'reproduction flower pollen germination'],
  [/heredity|inheritance/i,'inheritance mendel genetic'],
];

/** URLs come from NCERT's published manual index; page targets come from PDF text. */
export function ncertManualsFor(klass: string, subject: string, chapter: string, topic = '') {
  const grade=klass.match(/(?:^|\D)(9|10|11|12)(?=\D|$)/)?.[1]||klass;
  const normalized=/botany|zoology|biology/i.test(subject)?'Biology':/math/i.test(subject)?'Mathematics':subject;
  const all=(catalog as ManualLink[]).filter(item=>item.klass===grade&&item.subject.toLowerCase()===normalized.toLowerCase());
  const focus=topic&&topic!==chapter?topic:chapter;
  const direct=[...new Set(words(focus))], chapterTerms=[...new Set(words(chapter))];
  const aliases=related.filter(([pattern])=>pattern.test(focus)).flatMap(([,text])=>words(text));
  const frequencies=new Map<string,number>();
  all.forEach(item=>new Set(words(`${item.title} ${item.entries.map(entry=>entry.terms).join(' ')}`)).forEach(term=>frequencies.set(term,(frequencies.get(term)||0)+1)));
  const weight=(term:string)=>1+Math.log((all.length+1)/((frequencies.get(term)||0)+1));
  const recommended: MatchedManual[]=all.map(item=>{
    const candidates=item.entries.length?item.entries:[{page:1,label:item.title,terms:item.title}];
    const ranked=candidates.map(entry=>{
      const tokens=new Set(words(`${item.title} ${entry.terms}`));
      const hits=direct.filter(term=>tokens.has(term));
      const extra=aliases.filter(term=>tokens.has(term));
      const chapterHits=chapterTerms.filter(term=>tokens.has(term));
      const score=hits.reduce((sum,term)=>sum+weight(term)*4,0)+extra.reduce((sum,term)=>sum+weight(term),0)+chapterHits.reduce((sum,term)=>sum+weight(term)*.5,0);
      return {...entry,score,hits: hits.length+extra.length};
    }).filter(entry=>entry.hits>0).sort((a,b)=>b.score-a.score);
    const best=ranked[0];
    return {...item,page:best?.page||1,experiment:best?.label||item.title,score:best?.score||0};
  }).filter(item=>item.score>=4).sort((a,b)=>b.score-a.score).slice(0,4);
  return { grade, subject: normalized, all, recommended };
}

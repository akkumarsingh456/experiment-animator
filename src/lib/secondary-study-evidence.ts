import {cleanSourceNoteLine,isSourceTask} from './source-note-quality';
import {isContentsListing} from './note-source-noise';

const key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/properties/g,'property');
/** Heading aliases identify source sections; they contain no replacement textbook facts. */
const aliases:Record<string,string[]>={
 'What are living organisms made of?':['What are living organisms made up of'],
 'Physical and chemical properties':['Physical properties','Chemical properties'],
 'Corrosion prevention':['Corrosion','Prevention of corrosion'],
 'Extraction of metals':['Extraction of metals','Enrichment of ores','Refining of metals'],
 'Pure substances (elements and compounds)':['What are the types of pure substances','Elements','Compounds'],
 'Physical and chemical changes':['Physical and chemical changes'],
 'Molecular mass and mole concept':['Molecular mass','Mole concept'],
 'Structure of an atom (Thomson, Rutherford and Bohr models)':['The structure of an atom'],
 'Distribution of electrons in orbits':['How are electrons distributed in different orbits'],
 'Atomic number and mass number':['Atomic number','Mass number'],
 'Isotopes and isobars':['Isotopes','Isobars'],
 'Description of motion':['Describing motion'],
 'Equations of kinematic motion':['Equations of motion'],
 'Rate of doing work (power)':['Rate of doing work'],
 'Protection management':['Crop protection management'],
 'Types of reactions (combination, decomposition, displacement, double displacement)':['Types of chemical reactions'],
 'Chemical properties of acids and bases':['Understanding the chemical properties of acids and bases'],
 'pH scale':['How strong are acid or base solutions'],
 'Preparation and uses of important salts (NaOH, bleaching powder, baking soda, washing soda, plaster of paris)':['More about salts'],
 'Covalent bonding':['Bonding in carbon'],
 'Chemical properties':['Chemical properties of carbon compounds','Chemical properties'],
 'Ethanol and ethanoic acid':['Some important carbon compounds'],
 'Transportation (human circulatory system)':['Transportation'],
 'Excretion (nephrons)':['Excretion'],
 'Nervous system':['Animals nervous system'],
 'Plant hormones and tropic movements':['Coordination in plants'],
 'Asexual reproduction':['Modes of reproduction used by single organisms'],
 'Mendel\'s laws of inheritance':['Rules for the inheritance of traits'],
 'Reflection by spherical mirrors':['Spherical mirrors'],
 'Refraction through glass slabs':['Refraction through a rectangular glass slab'],
 'Lenses':['Refraction by spherical lenses'],
 'Prism refraction':['Refraction of light through a prism'],
 'Atmospheric scattering':['Scattering of light'],
 'Series and parallel combinations':['Resistance of a system of resistors'],
 'Heating effect':['Heating effect of electric current'],
 'Magnetic force on current conductors':['Force on a current carrying conductor in a magnetic field'],
 'Domestic circuits':['Domestic electric circuits'],
 'Ecosystem dynamics':['Eco system','Ecosystem'],
 'Biological magnification':['Food chains and webs'],
 'Ozone layer depletion':['Ozone layer and how it is getting depleted'],
};

export function sourceUnavailable(line:string){return /readable source text.*(?:missing|unavailable|not (?:available|found))|source text needs attention|source provides too little|re.ingest.*(?:chapter|pdf)|no (?:readable|matching) (?:chapter|source|textbook)/i.test(line);}
export function substantiveStudyLine(line:string){
 const body=line.replace(/^\*\*[^*]+:\*\*\s*/,'').replace(/^n\s+/,'');
 return body.length>25&&!sourceUnavailable(body)&&!isSourceTask(body)
  &&!/^\*\*(?:activity|discussion|experiment|learning objective|prerequisite|support practice|core practice|challenge practice|answers? and explanations?|exit ticket)/i.test(line)
  &&! /^(?:take|place|put|ask|discuss|clean|note|try|hold|dry|repeat|record|collect|draw|observe|test|burn|heat|add|pour|clamp|attach|connect|insert|keep|use a|give reasons|let us|for performing activities|caution|compare your|in pairs|submit a claim|teacher checks|before reading|explain .*in your own words)\b/i.test(body);
}

/** Read a matched numbered textbook section with all its subordinate paragraphs.
 * A lexical hit is not permission to borrow text from an unrelated heading. */
export function secondaryScienceSectionEvidence(title:string,context:string):string[]{
 context=context.replace(/\bReprint(?:ed)?\s+20\d{2}(?:[-–]\d{2})?/g,'').split('\n').filter(line=>/EXERCISES|E X E R C I S E S/.test(line)||!/^\s*(?:Science|\d{1,3}|[A-Z][A-Z ,–-]{2,100})\s*$/.test(line)).join('\n');
 const variants=[title.replace(/\s*\([^)]*\)/g,''),...(Object.entries(aliases).find(([name])=>key(name)===key(title))?.[1]||[])].map(key).filter(v=>v.length>=4);
 const headings:Array<{start:number;body:number;depth:number;heading:string}>=[];
 const pattern=/^[ \t]*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)[ \t]*(?:\r?\n[ \t]*)?([^\n\r]{3,140})(?=\r?$)/gm;
 for(const match of context.matchAll(pattern)){
  const heading=match[2].trim();if(/\.[ \t]+[A-Z]/.test(heading)||isContentsListing(heading))continue;
  headings.push({start:match.index!,body:match.index!+match[0].length,depth:match[1].split('.').length,heading});
 }
 const sections:string[]=[];
 headings.forEach((h,i)=>{
  const identity=key(h.heading.replace(/^\d+(?:\.\d+)*\s*/,'').replace(/^\([a-z]\)\s*/i,''));
  if(!variants.some(v=>identity===v||identity===`the${v}`))return;
  const boundary=headings.slice(i+1).find(next=>next.depth<=h.depth)?.start??context.length;
  sections.push(context.slice(h.body,boundary).split(/\n\s*(?:What you have learnt|EXERCISES|E X E R C I S E S)\b/i)[0]);
 });
 const result:string[]=[],seen=new Set<string>();
 for(const section of sections){
  const parts=section.replace(/^[ \t]*\d{1,2}\.\d{1,2}(?:\.\d{1,2})?[ \t]*[^\n\r]{3,140}$/gm,' ').replace(/(?:^|\n)[ \t]*n[ \t]*(?:\n|(?=[A-Z]))/g,' ').replace(/\bActivity\s+\d+(?:\.\d+)?[^\n]*\n(?:[ \t]*[n•▪][^\n]*\n)+/g,' ').replace(/\s+/g,' ').split(/(?<=[.!?])\s+/);
  for(const raw of parts){const line=cleanSourceNoteLine(raw);if(!substantiveStudyLine(line)||isContentsListing(line)||/^(?:Activity|Questions?|Exercises?)\b/i.test(line))continue;const id=key(line);if(!seen.has(id)){seen.add(id);result.push(line);}}
 }
 return result;
}

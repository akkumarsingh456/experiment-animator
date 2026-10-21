import {seniorScienceEvidence,seniorTopicHeadings} from './senior-study-notes';
import {secondaryScienceSectionEvidence,substantiveStudyLine} from './secondary-study-evidence';
import {topicEvidence} from './topic-evidence';
import {cleanSourceNoteLine,hasBrokenSourceMath} from './source-note-quality';
import {decodeNcertProse} from './ncert-prose-decoding';
import {joinSourceExplanations} from './source-explanation-context';

export function adequateTopicEvidence(title:string,lines:string[]){
 const facts=[...new Set(lines.filter(substantiveStudyLine))];
 if(facts.length<3||facts.join(' ').length<240)return false;
 if(/^reactivity series$/i.test(title.trim())&&!facts.some(line=>/decreasing (?:order|reactivity)|reactivity decreases/i.test(line)&&/(?:\b[A-Z][a-z]?\s*>\s*){3}/.test(line)))return false;
 if(/preparation/i.test(title)&&/KMnO|permanganate/i.test(title)&&/Cr.*O|dichromate/i.test(title))return /permanganate|KMnO/i.test(facts.join(' '))&&/dichromate|Cr.{0,8}O/i.test(facts.join(' '));
 return true;
}
const plain=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
/** Three different recovery strategies, always on an already chapter-scoped text.
 * Keep source prose; do not generate facts or reconstruct damaged equations. */
export function recoverTopicFromSources(title:string,sources:string[]){
 const names=[title.replace(/\s*\([^)]*\)/g,''),...seniorTopicHeadings(title)];
 const results:string[]=[],legacyResults:string[]=[];let attempts=0;
 for(let pass=0;pass<3;pass++){
  attempts++;
  for(const raw of sources){
   const text=decodeNcertProse(raw,names);let candidates:string[]=[];
   if(pass===0)candidates=[...seniorScienceEvidence(title,text),...secondaryScienceSectionEvidence(title,text)];
   if(pass===1){
    const rows=text.split(/\r?\n/),heads=rows.flatMap((line,index)=>{
     const normalized=line.trim().replace(/\s*\[\d+(?:\s*[-–]\s*\d+)?\]\s*#?\s*$/,'');const match=names.find(name=>plain(normalized)===plain(name)||normalized.toLowerCase().startsWith(name.toLowerCase()+' ')&&(/^[A-Z][A-Za-z0-9 ]{1,25}$/.test(normalized.slice(name.length).trim())||/^\$[^$]{1,100}\$$/.test(normalized.slice(name.length).trim())));
     return match?[index]:[];
    });
    for(const start of heads){let end=start+1;while(end<rows.length&&!heads.includes(end)&&!/^\s*\d{1,2}\.\d{1,2}(?:\.\d+)?\s+[A-Z]|^\s*(?:Uses|Exercises|Summary)\s*$/i.test(rows[end]))end++;
     candidates.push(...rows.slice(start+1,end).join(' ').split(/(?<=[.!?])\s+/));
    }
   }
   if(pass===2){
    // A focused source paragraph can name its subject once, then explain it
    // using pronouns. Retain that paragraph's sentences together; never use
    // a whole flattened chapter as the surrounding context.
    const paragraphs=text.split(/\n\s*\n/).filter(value=>value.length<=2000);
    candidates=names.flatMap(name=>topicEvidence(name,[...text.split(/\n\s*\n|(?<=[.!?])\s+/),...paragraphs]));
   }
   // Saved chunks can contain several complete source sentences on one line.
   // Count their explanations individually, rather than treating a whole source
   // paragraph as a single fact and incorrectly rejecting a populated topic.
   for(const value of candidates){
    const original=cleanSourceNoteLine(value);
    if(substantiveStudyLine(original)&&!hasBrokenSourceMath(original)&&!legacyResults.includes(original))legacyResults.push(original);
    for(const sentence of joinSourceExplanations(value.length>2000?topicEvidence(title,value.split(/(?<=[.!?])\s+/)):value.split(/(?<=[.!?])\s+(?=[\p{Lu}"“])/u))){
     const line=cleanSourceNoteLine(sentence);if(substantiveStudyLine(line)&&!hasBrokenSourceMath(line)&&!results.includes(line))results.push(line);
    }
   }
  }
  if(adequateTopicEvidence(title,results))return {lines:results,attempts,complete:true};
  // An already adequate recovery must not become a new failure as a result
  // of the additional paragraph handling.
  if(adequateTopicEvidence(title,legacyResults))return {lines:legacyResults,attempts,complete:true};
 }
 return {lines:results,attempts,complete:false};
}

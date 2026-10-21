import {canonicalAttentionTopic,attentionChapterTopics,type AttentionScope} from './attention-topic-scope';
import {subtopicsFor} from './ncert-syllabus';
import {canonicalOfficialRecoveryTopic} from './official-recovery-scope';

/** A source-less lesson may use online material only when every requested
 * topic is explicitly authorised. Never omit or substitute other topics. */
export function attentionLessonSelection(input:{klass:string;subject:string;chapter?:string;topic:string;subtopics?:string;mode?:string},failedCatalogRecovery=false):AttentionScope[]|null{
 if(input.mode==='chapter')return null;
 const suppliedChapter=input.chapter||input.topic;
 const chapterScope=attentionChapterTopics({klass:input.klass,subject:input.subject,chapter:suppliedChapter});
 const chapter=chapterScope[0]?.chapter||suppliedChapter,klass=chapterScope[0]?.klass||input.klass;
 const selected:string[]=[];let depth=0,start=0;
 const text=input.subtopics||'';
 for(let i=0;i<=text.length;i++){
  const char=text[i];if(char==='('||char==='[')depth++;if(char===')'||char===']')depth=Math.max(0,depth-1);
  if(i===text.length||depth===0&&/[,;\n]/.test(char)){const title=text.slice(start,i).trim();if(title&&!selected.includes(title))selected.push(title);start=i+1;}
 }
 // A comma may be part of one catalogue title (for example number-system
 // conversions). Prefer complete catalogue labels before delimiter parsing.
 const catalog=subtopicsFor(klass,input.subject,chapter).sort((a,b)=>b.length-a.length),exact:string[]=[];
 let remaining=text.trim();
 while(remaining){const title=catalog.find(title=>remaining.slice(0,title.length).toLowerCase()===title.toLowerCase()&&/^\s*(?:[,;\n]|$)/.test(remaining.slice(title.length)));if(!title)break;if(!exact.includes(title))exact.push(title);remaining=remaining.slice(title.length).replace(/^[\s,;]+/,'');}
 const chosen=exact.length&&!remaining?exact:selected;
 const scope={klass,subject:input.subject,chapter};
 const canonical=failedCatalogRecovery?canonicalOfficialRecoveryTopic:canonicalAttentionTopic;
 const single=canonical({...scope,topic:input.topic});
 const titles=chosen.length?chosen:single?[single.topic]:subtopicsFor(klass,input.subject,chapter);
 if(!titles.length)return null;
 const result=titles.map(topic=>canonical({...scope,topic}));
 return result.every((row):row is NonNullable<typeof row>=>!!row)?result:null;
}

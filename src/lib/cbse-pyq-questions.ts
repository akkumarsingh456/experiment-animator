import {NCERT_SYLLABUS} from './ncert-syllabus';
export type PyqQuestion={id:string;number:string;page:number;endPage:number;text:string;ocr:boolean;chapter:string;topics:string[];mapping:'suggested'|'teacher'|'unmapped'};
export type PyqReading={url:string;file:string;klass:string;subject:string;year:number;exam:string;pages:number;ocrPages:number;questions:PyqQuestion[];readAt:string;sourceCheckedAt:string;warnings:string[]};
export function pyqChapters(klass:string,subject:string){const entries=Object.entries(NCERT_SYLLABUS[klass]||{}),normal=(s:string)=>s.toLowerCase().replace(/[^a-z]/g,'');const key=entries.find(([key])=>normal(key)===normal(subject)||normal(key)==='mathematics'&&normal(subject).startsWith('mathematics'))?.[0];return key?NCERT_SYLLABUS[klass][key]:[];}
export function questionBlocks(pages:{page:number;text:string;ocr:boolean}[]){
 const source=pages.map(page=>page.text.replace(/\r/g,'')).join('\n'),offsets:number[]=[];let offset=0;
 for(const page of pages){offsets.push(offset);offset+=page.text.replace(/\r/g,'').length+1;}
 const markers=[...source.matchAll(/(?:^|\n)[ \t]*(\d{1,2})(?:[.)]\s+(?=\S)|[ \t]+(?=[A-Z]))/g)].filter(match=>Number(match[1])<=80);
 return markers.flatMap((marker,index)=>{
   const start=marker.index!,end=markers[index+1]?.index??source.length,text=source.slice(start,end).trim();
   if(text.length<40||text.length>14000||!/[a-z]{3}/i.test(text)||!/\b(?:state|what|which|write|find|calculate|define|explain|choose|assertion|predict|identify|following|match|why|differentiate|draw|name|give|read|answer|evaluate|prove|obtain|consider|select)\b/i.test(text))return [];
   if(/general instructions|question paper contains|all questions are compulsory|time allowed|maximum marks/i.test(text.slice(0,250)))return [];
   const pageIndex=offsets.reduce((last,at,index)=>at<=start+1?index:last,0),endIndex=offsets.reduce((last,at,index)=>at<end?index:last,pageIndex);
   return [{number:marker[1],page:pages[pageIndex].page,endPage:pages[endIndex].page,text,ocr:pages.slice(pageIndex,endIndex+1).some(p=>p.ocr)}];
 });
}
export function suggestQuestionTopics(text:string,klass:string,subject:string){
 const normal=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' '),haystack=normal(text);
 const stop=new Set(['the','and','with','from','types','properties','their','using','some','basic','introduction','general','concept','concepts']);
 const ranked=pyqChapters(klass,subject).map(chapter=>{
   const topics=chapter.subtopics.filter(topic=>{const words=normal(topic).split(' ').filter(word=>word.length>3&&!stop.has(word));return words.length&&words.filter(word=>new RegExp(`\\b${word}\\b`).test(haystack)).length>=Math.min(2,words.length);});
   return {chapter:chapter.chapter,topics,score:topics.length};
 }).filter(row=>row.score).sort((a,b)=>b.score-a.score);
 if(!ranked.length||ranked[1]?.score===ranked[0].score)return {chapter:'',topics:[],mapping:'unmapped' as const};
 return {chapter:ranked[0].chapter,topics:ranked[0].topics.slice(0,5),mapping:'suggested' as const};
}
export function questionTeachingPoints(question:PyqQuestion){
 const points=question.topics.map(topic=>`Teach and practise: ${topic}.`);
 if(/calculate|evaluate|find|obtain/i.test(question.text))points.push('Practise choosing the required relationship, substituting given values and checking units or constraints.');
 if(/explain|why|reason/i.test(question.text))points.push('Practise linking each explanation to the relevant concept and supporting it with a clear reason.');
 if(/draw|figure|diagram|graph/i.test(question.text))points.push('Read the original PDF figure and practise the relevant labelled diagram or graph.');
 if(/write.*(?:program|function|code)|output|sql|query/i.test(question.text))points.push('Practise tracing the code or query step by step, including syntax and boundary cases.');
 return points;
}
export function pyqPdfHref(url:string,file:string,page?:number){return `/api/cbse-pyq-pdf?paper=${encodeURIComponent(url)}&file=${encodeURIComponent(file)}${page?`#page=${page}`:''}`;}

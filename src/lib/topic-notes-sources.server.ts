import {getRequest} from '@tanstack/react-start/server';
import type {AttentionScope} from './attention-topic-scope';
import {canonicalOfficialRecoveryTopic} from './official-recovery-scope';
import {readAttentionSources,type ReadAttentionSource} from './attention-source-read.server';
import {readSavedChapterSources} from './saved-chapter-sources.server';
import {recoverTopicFromSources} from './topic-source-recovery';

/** Popup only: use frozen, readable library pages before depending on websites.
 * Never use generated lesson_cache notes as independent textbook evidence. */
export async function readTopicNotesSources(input:AttentionScope):Promise<ReadAttentionSource[]>{
 const scope=canonicalOfficialRecoveryTopic(input);if(!scope)return [];
 const saved:ReadAttentionSource[]=[];
 try{
  const chapter=await readSavedChapterSources(scope);
  const books=new Map<string,string[]>();
  for(const source of chapter.sources){const rows=books.get(source.book)||[];rows.push(source.text);books.set(source.book,rows);}
  let url='';try{url=new URL('/history',getRequest().url).href;}catch{/* Non-request fixtures have no source navigation link. */}
  for(const [book,rows] of books){
   const text=rows.join('\n\n').slice(0,500000);
   if(recoverTopicFromSources(scope.topic,[text]).lines.length)saved.push({url,text,title:`${book} · ${scope.chapter}`,sourceClass:scope.klass,provider:'Saved textbook source'});
  }
 }catch{/* A library outage must still allow official online recovery. */}
 if(saved.some(source=>recoverTopicFromSources(scope.topic,[source.text]).complete))return saved;
 try{return [...saved,...await readAttentionSources(scope)];}catch{return saved;}
}

import {it,expect} from 'vitest';
import {NCERT_SYLLABUS,subtopicsFor} from '@/lib/ncert-syllabus';
import {topicSourceComplete,recoverSparseTopicNotes} from '@/lib/sparse-topic-recovery.server';
import type {Slide} from '@/lib/generate.functions';
for(const [klass,subjects] of Object.entries(NCERT_SYLLABUS))for(const [subject,chapters] of Object.entries(subjects))it(`${klass} ${subject}: source guard applies to every chapter and topic`,()=>{
 for(const chapter of chapters)for(const title of subtopicsFor(klass,subject,chapter.chapter).length?subtopicsFor(klass,subject,chapter.chapter):[chapter.chapter]){
  const slide={title,kind:'content',bullets:[],notes:[],key_terms:[],visual:'book',sections:[]} as Slide;
  expect(topicSourceComplete(slide),`${chapter.chapter}: ${title}`).toBe(false);
  expect(topicSourceComplete(slide,true),`${chapter.chapter}: ${title}`).toBe(false);
 }
});
it('preserves genuine short multilingual source passages without padding or external requests',async()=>{
 for(const [subject,text] of [['English','A short original poem.'],['Hindi','यह मूल पाठ है।'],['Sanskrit','विद्या ददाति विनयं सदा।']]){
  const slide={title:'Source passage',kind:'content',chapter_text:text,bullets:[],notes:[],key_terms:[],visual:'book',sections:[]} as Slide;
  const result=await recoverSparseTopicNotes([slide],{klass:'10',subject,chapter:'Selected reader',sources:[],verbatim:true});
  expect(result.slides[0]).toBe(slide);expect(result.extraEvidence).toEqual([]);
 }
});

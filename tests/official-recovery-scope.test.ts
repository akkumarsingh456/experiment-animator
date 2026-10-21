import {it,expect,vi} from 'vitest';
import {NCERT_SYLLABUS,subtopicsFor} from '@/lib/ncert-syllabus';
import {canonicalOfficialRecoveryTopic} from '@/lib/official-recovery-scope';
import {recoverSparseTopicNotes,topicSourceComplete} from '@/lib/sparse-topic-recovery.server';
import {recoverAttentionTopic} from '@/lib/attention-topic-notes.server';
import {autoFixAndVerifyNotes,normalizeForGrounding} from '@/lib/notes-verification';
import type {Slide} from '@/lib/generate.functions';
import {attentionLessonSelection} from '@/lib/attention-selection';
it('expands source-less fallback only when the caller explicitly invokes failed-topic recovery',()=>{
 const selected={klass:'12',subject:'Chemistry',chapter:'Chapter 6: Haloalkanes and Haloarenes',topic:'Nature of C-X bond',subtopics:'Nature of C-X bond'};
 expect(attentionLessonSelection(selected)).toBeNull();
 expect(attentionLessonSelection(selected,true)?.[0].topic).toBe('Nature of C-X bond');
 expect(attentionLessonSelection({...selected,mode:'chapter'},true)).toBeNull();
});
it('authorises exact catalogue scopes across all six requested subject families only',()=>{
 let count=0;
 for(const klass of ['9','10','11','12'])for(const subject of Number(klass)<11?['Social Science','Science','Mathematics','Computer Science']:['Physics','Chemistry','Mathematics','Computer Science'])for(const row of NCERT_SYLLABUS[klass][subject])for(const topic of subtopicsFor(klass,subject,row.chapter)){
  expect(canonicalOfficialRecoveryTopic({klass,subject,chapter:row.chapter,topic})).toEqual({klass,subject,chapter:row.chapter,topic});count++;
 }
 expect(count).toBeGreaterThan(1000);
 expect(canonicalOfficialRecoveryTopic({klass:'10',subject:'Science',chapter:'Chapter 3: Metals and Non-metals (Chemistry)',topic:'Quantum numbers'})).toBeUndefined();
 expect(canonicalOfficialRecoveryTopic({klass:'8',subject:'Science',chapter:'Metals and Non-metals',topic:'Physical and chemical properties'})).toBeUndefined();
});
it('recovers the reported Class 10 topic through slide verification even offline',async()=>{
 const scope={klass:'10',subject:'Science',chapter:'Chapter 3: Metals and Non-metals (Chemistry)',topic:'Physical and chemical properties'};
 const spy=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Offline'));
 try{
  const slide={title:scope.topic,kind:'content',bullets:[],notes:[],key_terms:[],sections:[],visual:'book'} as Slide;
  const recovered=await recoverSparseTopicNotes([slide],{...scope,sources:[]});
  expect(topicSourceComplete(recovered.slides[0])).toBe(true);
  const [checked]=await autoFixAndVerifyNotes([recovered.slides[0].sections],normalizeForGrounding(recovered.extraEvidence.join('\n')),{subject:scope.subject,chapter:scope.chapter});
  expect(checked.check.pass).toBe(true);
  expect(topicSourceComplete({...recovered.slides[0],sections:checked.sections})).toBe(true);
  expect(recovered.extraEvidence.join(' ')).toContain('malleability');
  expect(recovered.extraEvidence.join(' ')).toContain('amphoteric oxides');
  // The no-uploaded-source path must have the same network-independent recovery.
  const supplement=await recoverAttentionTopic(scope);
  expect(supplement?.method).toBe('source-extraction');
  expect(supplement?.sources[0].sourceClass).toBe('10');
  expect(spy).not.toHaveBeenCalled();
 }finally{spy.mockRestore();}
});

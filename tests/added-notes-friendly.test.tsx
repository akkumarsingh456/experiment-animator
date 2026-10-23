import React,{act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {AddedTopicNotes} from '@/components/AddedTopicNotes';
import {GuidedLessonNotes} from '@/components/GuidedLessonNotes';
import {paginateGuidedArticles} from '@/lib/guided-slides';
import {importMissingTopicNotes} from '@/lib/missing-topic-import';
import type {Slide} from '@/lib/generate.functions';

it('selects individual added points, keeps Undo across action changes and preserves source notes',async()=>{
 const original={title:'Topic',kind:'content',visual:'book',bullets:[],notes:[],key_terms:[],sections:[{heading:'Explanation',kind:'bullets',lines:['Original textbook point.']}]} as Slide;
 let current=importMissingTopicNotes(original,['Added first point.','Added second point.']);
 function Teacher(){const [slide,setSlide]=useState(current),[adding,setAdding]=useState(false);return <><button onClick={()=>setAdding(!adding)}>Switch action</button><div hidden={adding}><AddedTopicNotes subject="Physics" lines={slide.teacher_supplement!.lines} onChange={lines=>{current=importMissingTopicNotes(slide,lines);setSlide(current);}}/></div></>;}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const button=(text:string)=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent?.startsWith(text))!;
 try{
  await act(async()=>root.render(<Teacher/>));
  await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
  await act(async()=>button('Delete selected').click());
  expect(current.teacher_supplement!.lines).toEqual(['Added second point.']);
  expect(current.sections?.[0].lines).toEqual(['Original textbook point.']);
  await act(async()=>button('Switch action').click());await act(async()=>button('Switch action').click());
  await act(async()=>button('Undo deletion').click());
  expect(current.teacher_supplement!.lines).toEqual(['Added first point.','Added second point.']);
  await act(async()=>button('Select all added points').click());await act(async()=>button('Delete selected').click());
  expect(current.teacher_supplement!.lines).toEqual([]);
  expect(current.sections?.[0].lines).toEqual(['Original textbook point.']);
  expect(host.textContent).toContain('No added points to remove');
 }finally{await act(async()=>root.unmount());host.remove();}
});

it('retains exact source identity for repeated topic titles through guided page cloning',()=>{
 const slide=(point:string)=>({title:'Same topic',kind:'content',visual:'book',bullets:[],notes:[],key_terms:[],sections:[{heading:'Important points',kind:'bullets',lines:[point]}]}) as Slide;
 const root=document.createElement('div');document.body.append(root);
 try{
  root.innerHTML=renderToStaticMarkup(<GuidedLessonNotes slides={[slide('First source explanation about this topic.'),slide('Second source explanation about this topic.')]} title="Chapter" subject="Computer Science" klass="12" textOnly/>);
  const articles=Array.from(root.querySelectorAll<HTMLElement>('[data-topic-title]'));
  expect(articles.map(article=>article.dataset.sourceIndex)).toEqual(['0','1']);
  const pages=paginateGuidedArticles(root,720).filter(page=>page.dataset.topicTitle==='Same topic');
  expect(pages.map(page=>page.dataset.sourceIndex)).toEqual(expect.arrayContaining(['0','1']));
  expect(pages.every(page=>page.dataset.topicTitle==='Same topic')).toBe(true);
 }finally{root.remove();}
});

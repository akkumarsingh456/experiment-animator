import {describe,it,expect} from 'vitest';
import {scopeSocialChapterPages} from '@/lib/lesson-source-scope';
import {SOCIAL_SCIENCE_CHAPTERS,socialTitle,socialChapterPart,socialRevisionChapter,socialRevisionPageMatches} from '@/lib/social-science-chapters';

describe('Social Science chapter boundaries and source recovery',()=>{
 for(const [grade,chapters] of Object.entries(SOCIAL_SCIENCE_CHAPTERS))for(const row of chapters){
  it(`matches Class ${grade}: ${row.chapter}`,()=>{
   const title=socialTitle(row.chapter),titles=chapters.filter(c=>socialChapterPart(c.chapter)===socialChapterPart(row.chapter)).map(c=>socialTitle(c.chapter));
   const spaced=title.toUpperCase().split('').join(' ');
   const pages=[{page_number:1,text:`3 ${spaced} Opening explanation.`},{page_number:2,text:'Continuation of the same chapter.'},{page_number:3,text:'Chapter 99 Unlisted legacy chapter Overview Another chapter begins.'}];
   const scoped=scopeSocialChapterPages(pages,title,titles);
   expect(scoped).toHaveLength(2);expect(scoped.join(' ')).not.toContain('Another chapter begins');
  });
 }
 it('keeps overview-first pages even when they mention earlier chapters',()=>{
  const page='74 D EMOCRATIC P OLITICS O VERVIEW Earlier we read Chapter 3 and Chapter 4. Here we study rights. CHAPTER 5 DEMOCRATIC RIGHTS 2019-20';
  expect(scopeSocialChapterPages([{page_number:88,text:page}],'Democratic Rights',['Democratic Rights'])).toEqual([page]);
 });
 it('supports shortened running titles without substituting chapters',()=>{
  expect(scopeSocialChapterPages([{page_number:15,text:'3 Nationalism in Europe Opening explanation.'}],'The Rise of Nationalism in Europe',['The Rise of Nationalism in Europe'])).toHaveLength(1);
  expect(scopeSocialChapterPages([{page_number:117,text:'105 Print Culture Opening explanation.'}],'Nationalism in India',['Nationalism in India','Print Culture and the Modern World'])).toHaveLength(0);
 });
 it('recovers notes imported under the wrong grade only from a unique curriculum title',()=>{
  expect(socialRevisionChapter({class:'Class 9',file_name:'Lifelines of National Economy.pdf'})).toContain('Lifelines');
  expect(socialRevisionChapter({class:'Class 9',file_name:'Class 9 Lifelines of National Economy.pdf'})).toBeNull();
  expect(socialRevisionChapter({class:'Class 9',file_name:'Unidentified notes.pdf'})).toBeNull();
  expect(socialRevisionChapter({class:'Class 10',file_name:'Forest and Wildlife_watermarked.pdf'})).toContain('Forest and Wildlife Resources');
 });
 it('does not use a population mention from a different chapter mind map',()=>{
  const text='1 | OSWAAL CBSE Mind Maps, Social Science, Class IX The French Revolution French society included a large population.';
  expect(socialRevisionPageMatches(text,'Chapter 6: Population (Geography)','9')).toBe(false);
  expect(socialRevisionPageMatches(text,'Chapter 1: The French Revolution (History)','9')).toBe(true);
 });

 it('does not treat prose references to earlier economics chapters as new chapter openings',()=>{
  const titles=['Development','Sectors of the Indian Economy','Money and Credit','Globalisation and the Indian Economy','Consumer Rights'];
  const pages=[{page_number:1,text:'NOTES FOR THE TEACHER CHAPTER 3 : MONEY AND CREDIT Teacher introduction.'},{page_number:2,text:'Loans and banks. Recall Chapter 1 for development and Chapter 2 for sectors.'},{page_number:3,text:'Another page explains credit terms.'},{page_number:4,text:'NOTES FOR THE TEACHER CHAPTER 4 : GLOBALISATION AND THE INDIAN ECONOMY Next lesson.'}];
  const scoped=scopeSocialChapterPages(pages,'Money and Credit',titles);
  expect(scoped).toHaveLength(3);expect(scoped.join(' ')).toContain('credit terms');expect(scoped.join(' ')).not.toContain('Next lesson');
 });

});

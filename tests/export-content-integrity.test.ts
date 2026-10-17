import{describe,it,expect}from'vitest';
import{mergeLessonBookPictures}from'@/lib/lesson-book-pictures';
import{sourceQuizItems}from'@/lib/source-quiz';
import{cleanNcertLine}from'@/lib/ncert-teacher-notes';
import{cleanSocialNoteText,socialNotesPresentationSlide}from'@/lib/social-note-presentation';
import{scopeTextbookPages,scopeEnglishChapterPages,languageVolumeMatches}from'@/lib/lesson-source-scope';
import{prepareSlideExport}from'@/lib/lesson-slide-export';
import{buildLocalSlides}from'@/lib/generate.functions';
import{topicEvidence}from'@/lib/topic-evidence';
import type{Slide}from'@/lib/generate.functions';
describe('Power-sharing export regressions shared across subjects',()=>{
 it('keeps named Hindi volumes separate, including Antara and Antaral',()=>{
  expect(languageVolumeMatches({file_name:'NCERT_CLASS_11_HINDI_ANTRAL_1.pdf'},'अंतराल भाग 1')).toBe(true);
  expect(languageVolumeMatches({file_name:'NCERT_CLASS_11_HINDI_ANTRA_1.pdf'},'अंतराल भाग 1')).toBe(false);
  expect(languageVolumeMatches({file_name:'NCERT_CLASS_10_HINDI_KRITIKA_2.pdf'},'क्षितिज भाग 2')).toBe(false);
 });
 it('removes explicit reprint years without stripping dates in the lesson',()=>{
  expect(cleanNcertLine('Reprint 2018-19 Between 1970 and 1993 the constitution changed.')).not.toContain('2018-19');
  expect(cleanNcertLine('Reprint 2018-19 Between 1970 and 1993 the constitution changed.')).toContain('1970 and 1993');
 });
 it('does not split commas inside a single catalog topic',()=>{
  const slides=buildLocalSlides('Matter','States of matter (solid, liquid, gas), Evaporation','Matter exists in solid, liquid and gas states. Evaporation is the surface change of liquid into vapour.','Science');
  expect(slides).toHaveLength(2);expect(slides[0].title).toContain('Solid, Liquid, Gas');
 });
 it('matches question headings and singular/plural topic terms',()=>{
  expect(topicEvidence('What is an atom?',['Atoms are the smallest particles of an element taking part in chemical reactions.'])).toHaveLength(1);
 });
 it('uses explicit contents and consistent printed-page offsets for flattened English PDFs',()=>{
  const pages=[{page_number:1,text:'Contents Alpha . . . . 1 Beta . . . . 4 Gamma . . . . 6'},...Array.from({length:7},(_,i)=>({page_number:i+3,text:`${i+1} / Reader Full original paragraph for printed page ${i+1}.`}))];
  const result=scopeEnglishChapterPages(pages,'Alpha',['Alpha','Beta','Gamma']);expect(result).toHaveLength(3);expect(result.join(' ')).not.toContain('printed page 4');
 });
 it('stops an English chapter at legacy chapters absent from the dropdown',()=>{
  const pages=[{page_number:1,text:'Contents 1. Alpha 1 2. Old Chapter 3 3. Beta 5 Gamma 7'},...Array.from({length:8},(_,i)=>({page_number:i+3,text:`${i+1} Reader Full original text for page ${i+1}.`}))];
  expect(scopeEnglishChapterPages(pages,'Alpha',['Alpha','Beta','Gamma'])).toHaveLength(2);
 });
 it('does not present a Power-sharing dialogue statement as a scientific formula',()=>{
  const slide={title:'Power-sharing',bullets:[],notes:[],sections:[{heading:'Formula',kind:'formula',lines:['**Formula:** Sharing power = dividing power = weakening the country.']}]} as Slide;
  const result=socialNotesPresentationSlide(slide,'Social Science');expect(result.sections?.[0].kind).toBe('bullets');expect(result.sections?.[0].lines[0]).toContain('**Discussion statement:**');
 });
 it('keeps rendered original PDF pages through an empty automatic refresh',()=>{
  const original={title:'Power-sharing',kind:'content',teacher_pdf:{path:'notes.pdf',page:1,file_name:'Power Sharing.pdf'},reference_visuals:[{storage_path:'notes.pdf#page=1',url:'data:image/jpeg;base64,original'}]}as Slide;
  expect(mergeLessonBookPictures([original],[{title:original.title,visuals:[]}])[0]).toBe(original);
 });
 it('keeps existing book images when another topic refresh has no images',()=>{
  const original={title:'Potential',kind:'content',reference_visuals:[{storage_path:'original.jpg',url:'data:image/jpeg;base64,original'}]}as Slide;
  expect(mergeLessonBookPictures([original],[{title:'Potential',visuals:[]}])[0].reference_visuals).toEqual(original.reference_visuals);
 });
 it('blocks filename-only original-page exports rather than saving blank slides',async()=>{
  const root=document.createElement('div');root.innerHTML='<article data-teacher-page="true">notes.pdf page 1</article>';
  await expect(prepareSlideExport(root)).rejects.toThrow('original chapter PDF page has not loaded');
 });
 it('retains historical dates ranges and cross references',()=>{
  const text='Between 1970 and 1993, Belgium amended its constitution. See Chapter 2 for 1956 Sinhala policy and the period 2018-19.';
  const clean=cleanNcertLine(text);for(const expected of ['1970','1993','1956','2018-19','Chapter 2'])expect(clean).toContain(expected);
 });
 it('removes spaced print furniture without deleting historical dates',()=>{
  const line='4 D EMOCRATIC P OLITICS In 1956 Sinhala became the official language.';
  expect(cleanSocialNoteText(line)).toBe('In 1956 Sinhala became the official language.');
 });
 it('recognises junior Science headings without their subject suffix',()=>{
  const scoped=scopeTextbookPages([{page_number:1,text:'METALS AND NON-METALS This chapter discusses their properties.'},{page_number:2,text:'CARBON AND ITS COMPOUNDS Another chapter begins.'}],'Chapter 3: Metals and Non-metals (Chemistry)',['Chapter 3: Metals and Non-metals (Chemistry)','Chapter 4: Carbon and its Compounds (Chemistry)']);
  expect(scoped).toHaveLength(1);
 });
 it('does not manufacture quizzes from page footers or random vocabulary',()=>{
  expect(sourceQuizItems(['Exercises 2018-19 Power-sharing 115.','Panchayat Raj enables democratic decentralisation.'],'Social Science')).toEqual([]);
 });
 it('uses only source definition subjects as answers and explains the full evidence',()=>{
  const lines=['Democracy is a form of government in which people elect representatives.','Federalism is a system of government with powers divided between levels.','Coalition is an alliance of parties that cooperate to form a government.'];
  const items=sourceQuizItems(lines,'Social Science');expect(items.length).toBeGreaterThan(0);expect(items.length).toBeLessThanOrEqual(lines.length);
  for(const item of items){expect(lines).toContain(item.explanation);expect(item.options.find(option=>option.key===item.answer)?.text).toMatch(/^(Democracy|Federalism|Coalition)$/);expect(item.options.some(option=>/Option \d|Unrelated|None of/.test(option.text))).toBe(false);}
 });
});

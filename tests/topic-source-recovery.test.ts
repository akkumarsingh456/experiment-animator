import {it,expect,vi} from 'vitest';
import {recoverTopicFromSources,adequateTopicEvidence} from '@/lib/topic-source-recovery';
import {trustedChapterHtmlText,trustedChapterSource} from '@/lib/trusted-chapter-source.server';
import {recoverSparseTopicNotes} from '@/lib/sparse-topic-recovery.server';
import type {Slide} from '@/lib/generate.functions';
import {verifiedNcertRecovery} from '@/lib/verified-ncert-recovery';
import {topicSourceComplete} from '@/lib/sparse-topic-recovery.server';
import {autoFixAndVerifyNotes,normalizeForGrounding} from '@/lib/notes-verification';
import {seniorStudyContent,seniorActivityConclusions} from '@/lib/senior-study-notes';
import {learningScaffold,sourceDiscussion} from '@/lib/learning-design';
import {sequenceChemistryNotes} from '@/lib/chemistry-note-sequence';
it.each(['Nature of C-X bond','Nature of C–X bond'])('repairs the reported %s generation failure without network access',async title=>{
 const spy=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Source unavailable'));
 try{
  const slide={title,kind:'content',bullets:[],notes:[],key_terms:[],visual:'book',sections:[]} as Slide;
  const result=await recoverSparseTopicNotes([slide],{klass:'12',subject:'Chemistry',chapter:'Chapter 6: Haloalkanes and Haloarenes',sources:[]});
  expect(topicSourceComplete(result.slides[0])).toBe(true);
  expect(result.slides[0].source_recovery?.kind).toBe('official-ncert-mirror');
  expect(result.extraEvidence.join(' ')).toContain('partial positive charge');
  expect(result.extraEvidence.join(' ')).not.toContain('prepared from alcohols');
  // Exercise the same verification and teaching-note stages used after recovery.
  const [verified]=await autoFixAndVerifyNotes([result.slides[0].sections],normalizeForGrounding(result.extraEvidence.join('\n')),{subject:'Chemistry',chapter:'Haloalkanes and Haloarenes'});
  const study=seniorStudyContent(title,verified.sections);
  const discussion=sourceDiscussion(title,study,'Chemistry','12');
  const finalSections=sequenceChemistryNotes(learningScaffold(title,seniorActivityConclusions(title,discussion?[...study,discussion]:study),true),'Chemistry','Haloalkanes and Haloarenes');
  expect(verified.check.pass).toBe(true);
  expect(topicSourceComplete({...result.slides[0],sections:finalSections})).toBe(true);
  expect(spy).toHaveBeenCalled();
 }finally{spy.mockRestore();}
});
it('never uses the reviewed bond passage for another class, chapter, subject or topic',()=>{
 for(const args of [['11','Chemistry','Haloalkanes and Haloarenes','Nature of C-X bond'],['12','Physics','Haloalkanes and Haloarenes','Nature of C-X bond'],['12','Chemistry','Alcohols','Nature of C-X bond'],['12','Chemistry','Haloalkanes and Haloarenes','Methods of preparation']])expect(verifiedNcertRecovery(...args as [string,string,string,string])).toBeNull();
});
const bondSource='6.3 Nature of C-X Bond\nA carbon-halogen bond is polar because the bonded atoms attract electrons unequally. The carbon end carries a partial positive charge while the halogen end carries a partial negative charge. The size of the halogen atom increases down the group. Bond length therefore increases from the carbon-fluorine bond to the carbon-iodine bond.\n6.4 Methods of Preparation\nAn unrelated preparation section must not enter these bond notes.';
it.each(['-','‐','‑','‒','–','—','−'])('recovers the bond topic when the title uses the %s dash',dash=>{
 const result=recoverTopicFromSources(`Nature of C${dash}X bond`,[bondSource]);
 expect(result.complete).toBe(true);
 expect(result.lines.join(' ')).toContain('partial positive charge');
 expect(result.lines.join(' ')).not.toContain('unrelated preparation');
});
it('counts separate explanations in a saved single-line paragraph without lowering the minimum',()=>{
 const result=recoverTopicFromSources('Polar covalent bond',['A polar covalent bond has an unequal sharing of electrons between its bonded atoms. The difference in attraction produces partial charges on the bonded atoms. The more electronegative atom attracts the shared electron pair more strongly. The bond has a positive end and a negative end, rather than equal charge distribution.']);
 expect(result.complete).toBe(true);expect(result.lines.length).toBeGreaterThanOrEqual(3);
 expect(adequateTopicEvidence('Polar covalent bond',['A polar covalent bond has an unequal sharing of electrons.'])).toBe(false);
});
const preparation='Potassium dichromate K2Cr2O7\nThis first source paragraph describes the preparation of potassium dichromate from a suitable chromium compound. The next source paragraph explains the separation stage and the preparation conditions for potassium dichromate.\nPotassium permanganate KMnO4\nThis source paragraph describes the preparation of potassium permanganate using a manganese compound. A further source paragraph explains the conversion stage and the conditions needed to obtain potassium permanganate.\n4.5 The lanthanoids\nUnrelated material stays outside the preparation topic.';
it('recovers the reported formula-named topic from unnumbered named subsections',()=>{
 const result=recoverTopicFromSources('Preparation Of KMnO₄ And K₂Cr₂O₇',[preparation]);
 expect(result.complete).toBe(true);expect(result.attempts).toBe(2);
 expect(result.lines.join(' ')).toContain('potassium dichromate');expect(result.lines.join(' ')).toContain('potassium permanganate');
 expect(result.lines.join(' ')).not.toContain('Unrelated');
});
it('exhausts exactly three strategies without fabricating a missing topic',()=>{
 const result=recoverTopicFromSources('Some missing topic',['No matching topic is present in these supplied pages.']);
 expect(result.attempts).toBe(3);expect(result.complete).toBe(false);expect(result.lines).toEqual([]);
});
it('does not treat one preparation application as complete notes',()=>{
 expect(adequateTopicEvidence('Preparation of KMnO4 and K2Cr2O7',['Pyrolusite ore is used for preparation of potassium permanganate.'])).toBe(false);
});
it('retains chapter HTML headings and removes executable/navigation markup',()=>{
 const text=trustedChapterHtmlText('<nav>Navigation</nav><div class="td-content"><h2>Potassium dichromate</h2><p>Source explanation.</p><script>bad()</script><footer>Footer</footer></div>');
 expect(text).toContain('Potassium dichromate');expect(text).not.toContain('bad()');expect(text).not.toContain('Footer');
});
it('uses only an exact chapter in the requested class mirror',async()=>{
 const base='https://sathee.iitk.ac.in/sathee-neet/ncert-books/neet-ncert-books/neet-nb-che-12/';
 const url=base+'chem-12-unit-8-the-d-and-f-block-elements/';
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>new Response(String(input)===base?`<a href="${url}">Unit 8 The D And F Block Elements</a><a href="https://untrusted.test/">Other source</a>`:`<article id="content-section"><p>${'A source explanation of the selected chapter. '.repeat(20)}</p></article>`));
 try{const result=await trustedChapterSource('12','Chemistry','Chapter 4: The d- and f-Block Elements');expect(result?.url).toBe(url);expect(fetcher).toHaveBeenCalledTimes(2);}finally{fetcher.mockRestore();}
});
it('retries a temporary mirror failure instead of treating it as a missing source',async()=>{
 const base='https://sathee.iitk.ac.in/sathee-neet/ncert-books/neet-ncert-books/neet-nb-phy-11/';
 const url=base+'phy-11-chapter-7-gravitation/';let chapterCalls=0;
 const spy=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{
  if(String(input)===base)return new Response(`<a href="${url}">Chapter 7 Gravitation</a>`);
  chapterCalls++;return chapterCalls===1?new Response('',{status:503}):new Response(`<article id="content-section">${'An authentic chapter source paragraph with readable supporting explanation. '.repeat(12)}</article>`);
 });
 try{const result=await trustedChapterSource('11','Physics','Chapter 7: Gravitation');expect(result?.url).toBe(url);expect(chapterCalls).toBe(2);}finally{spy.mockRestore();}
});
it('does not save a blank topic when no adequate source can be recovered',async()=>{
 const slide={title:'Missing topic',bullets:[],notes:[],key_terms:[],visual:'book',sections:[]} as Slide;
 const result=await recoverSparseTopicNotes([slide],{klass:'11',subject:'Computer Science',chapter:'Missing chapter',sources:[]});
 expect(result.slides[0].topic_recovery?.status).toBe('missing');expect(result.slides[0].sections).toEqual([]);
});
it('repairs a sparse source slide while retaining its existing useful fact',async()=>{
 const slide={title:'Preparation of KMnO4 and K2Cr2O7',bullets:['An existing source-supported preparation point remains available.'],notes:[],key_terms:[],visual:'book',sections:[{heading:'Applications',kind:'bullets',lines:['An existing source-supported preparation point remains available.']}]} as Slide;
 const result=await recoverSparseTopicNotes([slide],{klass:'12',subject:'Chemistry',chapter:'The d- and f-Block Elements',sources:[preparation]});
 expect(result.slides[0].source_recovery?.kind).toBe('uploaded-ncert');
 expect(result.slides[0].sections?.flatMap(section=>section.lines).join(' ')).toContain('existing source-supported');
});
it('leaves adequately sourced topics unchanged',async()=>{
 const slide={title:'Preparation of KMnO4 and K2Cr2O7',bullets:[],notes:[],key_terms:[],visual:'book',sections:[{heading:'Topic notes',kind:'bullets',lines:recoverTopicFromSources('Preparation of KMnO4 and K2Cr2O7',[preparation]).lines}]} as Slide;
 const spy=vi.spyOn(globalThis,'fetch');
 const result=await recoverSparseTopicNotes([slide],{klass:'12',subject:'Chemistry',chapter:'The d- and f-Block Elements',sources:[]});
 expect(result.slides[0]).toBe(slide);expect(spy).not.toHaveBeenCalled();spy.mockRestore();
});

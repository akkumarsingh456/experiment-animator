import {it,expect,vi} from 'vitest';
import {recoverTopicFromSources,adequateTopicEvidence} from '@/lib/topic-source-recovery';
import {trustedChapterHtmlText,trustedChapterSource} from '@/lib/trusted-chapter-source.server';
import {recoverSparseTopicNotes} from '@/lib/sparse-topic-recovery.server';
import type {Slide} from '@/lib/generate.functions';
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
it('does not save a blank topic when no adequate source can be recovered',async()=>{
 const slide={title:'Missing topic',bullets:[],notes:[],key_terms:[],visual:'book',sections:[]} as Slide;
 await expect(recoverSparseTopicNotes([slide],{klass:'11',subject:'Computer Science',chapter:'Missing chapter',sources:[]})).rejects.toThrow('lesson was not saved');
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

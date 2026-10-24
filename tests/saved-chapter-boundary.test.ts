import {it,expect} from 'vitest';
import {boundSavedChapterPages} from '@/lib/saved-chapter-boundary';
it('stops at a later legacy chapter even when it is absent from the current syllabus',()=>{const pages=['14.1 Carbohydrates\nCarbohydrates are discussed in this chapter.','14.2 Proteins\nProteins are discussed here.','15.1 Drugs\nGlucocorticoids control carbohydrate metabolism.','15.2 Drugs and receptors\nMore unrelated material.'];expect(boundSavedChapterPages(pages)).toEqual(pages.slice(0,2));});
it('rejects dense alphabetical page indexes',()=>{const index=Array.from({length:40},(_,i)=>'Index entry '+(300+i)).join(' ');expect(boundSavedChapterPages(['14.1 Carbohydrates\nSource explanation.',index])).toHaveLength(1);});
it('does not use a numerical value as a chapter transition',()=>{const pages=['14.1 Carbohydrates\nSource explanation.','The measured quantity is 15.2 and another value is 16.5.'];expect(boundSavedChapterPages(pages)).toEqual(pages);});
it('keeps unnumbered chapter excerpts',()=>{expect(boundSavedChapterPages(['A source passage with no numbered headings.'])).toHaveLength(1);});

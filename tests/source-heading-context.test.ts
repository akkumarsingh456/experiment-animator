import {describe,it,expect} from 'vitest';
import {hasSourcePrintIntrusion,cleanSourceNoteLine} from '../src/lib/source-note-quality';
import {repairSourceMathSlide} from '../src/lib/source-math-repair';
import {topicScienceDrawing} from '../src/lib/topic-science-visuals';
import {toNoteBlocks} from '../src/lib/notes-paging';
import {guidedGroups} from '../src/lib/guided-notes';
import type {Slide} from '../src/lib/generate.functions';
describe('shared heading and exercise context guards',()=>{
 const damaged='**Formula:** we have 0 cos 60 E E H B = 0 Magnetism and Matter 189 5.5 M AGNETISATION AND MAGNETIC I NTENSITY The earth abounds with elements.';
 it('recognises a split textbook heading inside a relation',()=>{expect(hasSourcePrintIntrusion(damaged)).toBe(true);expect(cleanSourceNoteLine(damaged)).toBe('');});
 it('retains clean mathematical notation',()=>{expect(cleanSourceNoteLine('**Formula:** $F = ma$')).toBe('**Formula:** $F = ma$');});
 it('preserves flagged text as review material rather than a fact',()=>{
 const slide:Slide={title:"Earth'S Magnetism",bullets:[],notes:[],key_terms:[],visual:'',sections:[{heading:'Teacher Notes',kind:'bullets',lines:[damaged]},{heading:'Key points',kind:'bullets',lines:['First source option.','Second source option.','(c) A third source option.']}]};
 const fixed=repairSourceMathSlide(slide);expect(fixed.title).toBe("Earth's Magnetism");
 const review=fixed.sections?.find(s=>s.heading==='Source review — original extraction');expect(review?.lines).toContain(damaged);expect(review?.lines).toContain('First source option.');
 expect(toNoteBlocks(fixed.sections).flatMap(b=>b.lines)).toContain(damaged);
 expect(guidedGroups(fixed.sections).find(g=>g.heading==='Source review — original extraction')?.lines).toContain(damaged);
 });
 it('does not use an induction coil for Earth magnetism',()=>{expect(topicScienceDrawing({title:"Earth's Magnetism"},'Physics')?.id).not.toBe('magnetic-induction');});
});

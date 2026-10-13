import {describe,it,expect} from 'vitest';
import {renderLessonIllustration} from '@/lib/napkin-infographic';
import {classroomDiscussionVisual,keyPointIconCards} from '@/lib/classroom-visuals';
import {prosePoints} from '@/lib/note-points';
describe('shared discussion, icon and bullet presentation',()=>{
  it.each(['Physics','Chemistry','Biology','History'])('shows students for %s discussion pages',subject=>{
    const input={title:'Discussion',subject,sections:[{heading:'Classroom discussion',lines:['**Discussion:** Compare your evidence with a partner.']}]};
    expect(classroomDiscussionVisual(input)?.id).toBe('classroom-group-discussion');
    expect(renderLessonIllustration(input)).toContain('Share · Listen · Explain · Compare');
  });
  it('uses short icons instead of repeating lengthy source paragraphs',()=>{
    const paragraph='The capacitance changes when a dielectric is inserted between the plates. '.repeat(8);
    const svg=keyPointIconCards([paragraph]);
    expect(svg).toContain('Dielectric response');
    expect(svg).not.toContain(paragraph);
    expect(svg).toContain('<path');
  });
  it('splits semicolons and lowercase sentence starts while retaining wording',()=>{
    const first='A source sentence describes the first concept in sufficient detail for a student.';
    const second='the next sentence describes another concept and its practical interpretation.';
    expect(prosePoints(`${first} ${second}`)).toEqual([first,second]);
    expect(prosePoints('The first observation concerns a change in the material; the second observation concerns its response to the field.')).toHaveLength(2);
  });
  it('preserves formula and derivation blocks',()=>{
    const line='**Formula:** $V=IR$; this condition applies at fixed temperature. '.repeat(4);
    expect(prosePoints(line)).toEqual([line]);
  });
});

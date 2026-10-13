import {describe,it,expect} from 'vitest';
import {renderLessonIllustration} from '@/lib/napkin-infographic';
import {wrapTextbookDrawing} from '@/lib/current-electricity-diagrams';
describe('shared notebook illustration style',()=>{
  it.each([
    ['Science','Light'],['Science','Structure of the Atom'],['Science','Life Processes'],
    ['Physics','Thermodynamics'],['Chemistry','Chemical Bonding'],['Biology','Cell cycle'],
    ['Physics','Gauss law'],['Chemistry','SN2 mechanism'],['Biology','Inheritance'],
  ])('styles %s — %s without changing the input',(subject,title)=>{
    const input={subject,title,chapter:title,notes:['Keep original notes'],sections:[{heading:'Teacher Notes',kind:'formula',lines:['**Formula:** $E=F/q$']}]};
    const before=JSON.stringify(input);
    const svg=renderLessonIllustration(input);
    expect(svg).toContain('data-visual-style="study-notebook"');
    expect(svg).toContain('1. ');
    expect(JSON.stringify(input)).toBe(before);
  });
  it('retains drawing coordinates and escapes notebook titles',()=>{
    const drawing='<circle cx="380" cy="275" r="60"/>';
    const svg=wrapTextbookDrawing(drawing,'safe','A < B & C');
    expect(svg).toContain(drawing);
    expect(svg).toContain('A &lt; B &amp; C');
    expect(svg).toContain('viewBox="0 -65 760 605"');
  });
});

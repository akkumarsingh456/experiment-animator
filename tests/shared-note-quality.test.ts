import {describe,it,expect} from 'vitest';
import {cleanSourceNoteLine,collapsedSourceTable,validStudyTerm} from '@/lib/source-note-quality';
import {isUnitStatement,isDefinitionStatement} from '@/lib/note-labels';
import {keyPointIconCards} from '@/lib/classroom-visuals';
import {renderLessonIllustration,lessonIllustrationCaption} from '@/lib/napkin-infographic';
import {topicEvidence} from '@/lib/topic-evidence';
import {NCERT_SYLLABUS,subtopicsFor} from '@/lib/ncert-syllabus';

describe('shared source and subject safeguards',()=>{
  it('cleans repeated PDF banners without deleting the explanation',()=>{
    const line='**Explanation:** Example 8.2 Example 8.2 Example 8.2 Solution Solution Solution There is an increase in ionisation enthalpy along the series.';
    const cleaned=cleanSourceNoteLine(line);
    expect(cleaned).not.toContain('Example 8.2');expect(cleaned).not.toContain('Solution');expect(cleaned).toContain('increase in ionisation enthalpy');
  });
  it('preserves authored quoted repetition and mathematical steps',()=>{
    expect(cleanSourceNoteLine('**Explanation:** The speaker says “Never never never give up.”')).toContain('“Never never never give up.”');
    expect(cleanSourceNoteLine('**Derivation step 1:** $a+a=2a$')).toContain('$a+a=2a$');
  });
  it('quarantines lost chemistry table alignment',()=>{
    expect(collapsedSourceTable('Sc Ti V Cr Mn Fe Co Ni Cu Zn +2 +2 +2 +2 +2 +2 +3 +3 +3')).toBe(true);
    expect(cleanSourceNoteLine('Lattice structures hcp hcp bcc bcc ccp ccp ccp hcp bcc')).toBe('');
    expect(collapsedSourceTable('An oxidation-state difference can be a unit of two.')).toBe(false);
  });
  it('distinguishes scientific units, questions and definitions',()=>{
    expect(isUnitStatement('Oxidation states normally differ by a unit of two.')).toBe(false);
    expect(isUnitStatement('The SI unit of force is newton.')).toBe(true);
    expect(isUnitStatement('The cell is the unit of life.')).toBe(false);
    expect(isUnitStatement('The interpretation is expressed in words.')).toBe(false);
    expect(isDefinitionStatement('How can you say that it is a transition element?')).toBe(false);
    expect(cleanSourceNoteLine('**Definition:** How can you say that it is a transition element?')).toMatch(/^\*\*Check your understanding:/);
    expect(cleanSourceNoteLine('**Formula:** Calculate the magnetic moment for the ion ($Z=27$).')).toMatch(/^\*\*Check your understanding:/);
  });
  it('does not reuse outer-transition evidence for inner-transition topics',()=>{
    const lines=['The transition elements show a variety of oxidation states in their compounds.','The inner transition elements include the lanthanoids and actinoids.'];
    expect(topicEvidence('Inner Transition Elements (Lanthanoids and Actinoids)',lines)).toEqual([lines[1]]);
  });
  it('does not mistake chemistry series for an electrical series circuit',()=>{
    expect(keyPointIconCards(['The first transition series has a range of oxidation states.'],'Chemistry')).toBe('');
    const input={title:'Transition Elements Properties',subject:'Chemistry',sections:[{heading:'Key points',lines:['The transition series has variable oxidation states.']}]};
    expect(renderLessonIllustration(input)).not.toContain('Series combination');
    expect(renderLessonIllustration(input)).toContain('No suitable diagram');
    expect(lessonIllustrationCaption(input.title,input.subject,input)).toContain('Check Google');
  });
  it('rejects non-terms and clipped question fragments',()=>{
    for(const term of ['They','There','How Can You Say That It'])expect(validStudyTerm(term,'A sufficiently long extracted meaning for this term.')).toBe(false);
    expect(validStudyTerm('Oxidation state','A source-supported description of the oxidation state.')).toBe(true);
  });
  it('checks every configured non-physics subject topic for electrical-series icon leakage',()=>{
    let audited=0;
    for(const [klass,subjects] of Object.entries(NCERT_SYLLABUS))for(const [subject,chapters] of Object.entries(subjects)){
      for(const chapter of chapters)for(const topic of [chapter.chapter,...subtopicsFor(klass,subject,chapter.chapter)]){
        const svg=renderLessonIllustration({title:topic,subject,chapter:chapter.chapter});
        if(subject!=='Physics'&&!(subject==='Science'&&/\(Physics\)/i.test(chapter.chapter)))expect(svg,`${klass} ${subject} ${topic}`).not.toContain('Series combination');
        expect(svg).toContain('<svg');audited++;
      }
    }
    console.info(`Catalog audit: ${audited} configured chapter/subtopic labels checked.`);
    expect(audited).toBeGreaterThan(500);
  });
});

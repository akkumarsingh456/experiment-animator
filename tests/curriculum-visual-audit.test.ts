import {it,expect} from 'vitest';
import {NCERT_SYLLABUS,subtopicsFor} from '../src/lib/ncert-syllabus';
import {renderLessonIllustration} from '../src/lib/napkin-infographic';
import {notesQualityPolicy} from '../src/lib/notes-quality-policy';
import {writeFileSync} from 'node:fs';
it('audits the configured curriculum visual routes',()=>{
const chapters:any[]=[];let subjects=0,subtopics=0,labels=0,missing=0;
for(const [klass,streams] of Object.entries(NCERT_SYLLABUS))for(const [subject,entries] of Object.entries(streams)){
 subjects++;
 for(const entry of entries){const topics=subtopicsFor(klass,subject,entry.chapter);subtopics+=topics.length;
 const unavailable:string[]=[];
 for(const title of [entry.chapter,...topics]){labels++;const svg=renderLessonIllustration({title,subject,chapter:entry.chapter});if(svg.includes('No suitable diagram')){unavailable.push(title);missing++;}}
 chapters.push({class:klass,subject,chapter:entry.chapter,subtopics:topics.length,titleMatches:[entry.chapter,...topics].length-unavailable.length,unavailable,qualityRules:notesQualityPolicy(subject,entry.chapter)});
 }
}
const report={scope:'Static configured chapter/subtopic title audit; not factual validation of uploaded books or generated lessons. A matched schematic is not a verified exact illustration of every subtopic.',classes:Object.keys(NCERT_SYLLABUS).length,subjectStreams:subjects,chapters:chapters.length,expandedSubtopics:subtopics,labelsAudited:labels,explicitUnavailable:missing,chapterResults:chapters};
if(process.env.EDUPLAN_WRITE_AUDIT==='1')writeFileSync('docs/CURRICULUM_VISUAL_AUDIT.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,chapterResults:undefined}));

expect(report.chapters).toBeGreaterThan(0);expect(report.labelsAudited).toBeGreaterThan(500);
});

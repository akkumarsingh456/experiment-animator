import catalogue from './cbse-pyq-catalogue.json';
import {z} from 'zod';
export const cbsePapers=catalogue.papers;
export const cbseArchive=catalogue.source;
export const cbseCheckedAt=catalogue.checkedAt;
/** Apply the same catalogue identity check to cached and cloud-saved readings. */
export function isOfficialPyqReading(reading:{url:string;klass:string;subject:string;year:number;exam:string;file:string}){
 return /\.pdf$/i.test(reading.file)&&cbsePapers.some(paper=>paper.url===reading.url&&paper.klass===reading.klass&&paper.subject===reading.subject&&paper.year===reading.year&&paper.exam===reading.exam);
}
export const pyqScopeSchema=z.object({klass:z.enum(['9','10','11','12']),subject:z.string().min(1).max(120),chapter:z.string().max(300),topic:z.string().max(300),year:z.number().int().min(2000).max(2100)}).strict();
export type PyqScope=z.infer<typeof pyqScopeSchema>;
export const pyqNoteSchema=z.object({scope:pyqScopeSchema,text:z.string().max(12000),revision:z.string().uuid(),updatedAt:z.string().datetime()}).strict();
export type PyqNote=z.infer<typeof pyqNoteSchema>;
export const pyqKey=(scope:PyqScope)=>JSON.stringify([scope.klass,...[scope.subject,scope.chapter,scope.topic].map(value=>value.trim().toLowerCase().replace(/\s+/g,' ')),scope.year]);
export const pyqDraftKey=(email:string,scope:PyqScope)=>'eduplan-pyq-draft-v1:'+JSON.stringify([email.toLowerCase(),pyqKey(scope)]);
export function pyqYears(){const current=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date()));return Array.from({length:5},(_,i)=>current-i);}
const normal=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export function pyqSubjectMatches(source:string,subject:string){
 const a=normal(source),b=normal(subject);return a===b||b==='mathematics'&&['mathematicsbasic','mathematicsstandard','mathsbasic','mathsstandard'].includes(a);
}

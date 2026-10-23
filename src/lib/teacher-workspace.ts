import { z } from 'zod';
import type { GenerationResult } from './generate.functions';
import { blankSlideRecordSchema, blankSlidesKey } from './saved-blank-slides';
import { teachingBookmarkSchema } from './teaching-bookmark';
import { emptyBlankRecord } from './saved-blank-slides';

export const workspaceScopeSchema = z.object({ klass: z.string().min(1).max(20), subject: z.string().min(1).max(100), chapter: z.string().max(500), topic: z.string().min(1).max(500), subtopics: z.string().max(10000), mode: z.enum(['topic','chapter']) }).strict();
export type WorkspaceScope = z.infer<typeof workspaceScopeSchema>;
export const workspaceVisualSchema = z.object({ url: z.string().max(8_000_000).regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/), width: z.number().min(10).max(100), x: z.number().min(0).max(90), y: z.number().min(0).max(85), shape: z.enum(['rectangle','rounded','circle']), showAuto: z.boolean(), credit: z.object({ title:z.string(), author:z.string(), license:z.string(), page:z.string(), licenseUrl:z.string() }).optional() }).refine(v=>v.x+v.width<=100.01);
const slide = z.object({ title:z.string(), visual:z.string(), bullets:z.array(z.string()), notes:z.array(z.string()), key_terms:z.array(z.object({term:z.string(),meaning:z.string()})) }).passthrough();
export const workspaceLessonSchema = z.object({ slides:z.array(slide).max(3000), source_books:z.array(z.object({id:z.string(),chapter:z.string(),class:z.string(),subject:z.string()})), context_chars:z.number(), activities:z.array(z.unknown()), activity_matches:z.array(z.unknown()), video:z.object({title:z.string(),scenes:z.array(z.unknown())}) }).passthrough();
export const workspaceSnapshotSchema = z.object({ version:z.literal(1), scope:workspaceScopeSchema, lesson:workspaceLessonSchema, blanks:blankSlideRecordSchema, bookmark:teachingBookmarkSchema.nullable(), images:z.array(z.object({key:z.string().max(5000),visual:workspaceVisualSchema})).max(200),planLessonId:z.string().uuid().optional() });
export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>;
export const workspaceMetaSchema = z.object({ id:z.string().uuid(), revision:z.string().uuid(), title:z.string(), scope:workspaceScopeSchema, savedAt:z.string().datetime(), slides:z.number().int().min(0) });
export type WorkspaceMeta = z.infer<typeof workspaceMetaSchema>;
export const workspaceActionSchema=z.enum(['open','present','pdf']);
export type WorkspaceAction=z.infer<typeof workspaceActionSchema>;
export function lectureActionSearch(item:WorkspaceMeta,action:WorkspaceAction){return {...item.scope,workspaceId:item.id,workspaceAction:action,go:''};}
/** History contains this newly prepared result only, never unrelated device edits. */
export function preparedLectureSnapshot(lesson:GenerationResult,scope:WorkspaceScope){return workspaceSnapshotSchema.parse({version:1,scope,lesson,blanks:emptyBlankRecord(),bookmark:null,images:[]});}
export function workspaceDeviceKey(scope:WorkspaceScope){return blankSlidesKey([scope.klass,scope.subject,scope.chapter||scope.topic,scope.topic,scope.subtopics,scope.mode]);}
/** Only exact selected-lesson image keys can be included in its private backup. */
export function imageBelongsToWorkspace(key:string,scope:WorkspaceScope,titles:Set<string>,planLessonId?:string){
  if(!key.startsWith('topic-visual:'))return false;
  try{const parts=JSON.parse(key.slice('topic-visual:'.length));const norm=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
    return Array.isArray(parts)&&parts.length===6&&parts[0]===1&&parts[1]===norm(scope.klass).replace(/^class\s+/,'')&&parts[2]===norm(scope.subject)&&parts[3]===norm(scope.chapter||scope.topic)&&(parts[4]==='next class plan'?!!planLessonId&&parts[5]===`next-class-plan:${planLessonId}`:[...titles].some(title=>norm(title)===parts[4]));
  }catch{return false;}
}
export function workspaceLesson(snapshot:WorkspaceSnapshot){return snapshot.lesson as unknown as GenerationResult;}

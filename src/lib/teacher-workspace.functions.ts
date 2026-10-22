import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {workspaceSnapshotSchema} from './teacher-workspace';
export const saveTeacherLesson=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({id:z.string().uuid().optional(),snapshot:workspaceSnapshotSchema}).strict().parse(raw)).handler(async({data})=>{
  const {savePrivateLesson}=await import('./teacher-workspace-store.server');return savePrivateLesson(data.snapshot,data.id);
});
export const listTeacherLessons=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({offset:z.number().int().min(0).max(100000).default(0)}).strict().parse(raw)).handler(async({data})=>{
  const {listPrivateLessons}=await import('./teacher-workspace-store.server');return listPrivateLessons(data.offset);
});
export const loadTeacherLesson=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({id:z.string().uuid()}).strict().parse(raw)).handler(async({data})=>{
  const {loadPrivateLesson}=await import('./teacher-workspace-store.server');const loaded=await loadPrivateLesson(data.id);return {snapshotJson:JSON.stringify(loaded.snapshot),meta:loaded.meta,ownerId:loaded.ownerId};
});

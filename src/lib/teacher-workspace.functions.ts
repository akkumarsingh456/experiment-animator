import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {workspaceSnapshotSchema} from './teacher-workspace';
import {teacherTeachingPlanSchema} from './teacher-teaching-plan';
export const saveTeacherLesson=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({id:z.string().uuid().optional(),expectedEmail:z.string().email().max(320).optional(),snapshot:workspaceSnapshotSchema}).strict().parse(raw)).handler(async({data})=>{
  const {savePrivateLesson}=await import('./teacher-workspace-store.server');return savePrivateLesson(data.snapshot,data.id,data.expectedEmail);
});
export const listTeacherLessons=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({offset:z.number().int().min(0).max(100000).default(0)}).strict().parse(raw)).handler(async({data})=>{
  const {listPrivateLessons}=await import('./teacher-workspace-store.server');return listPrivateLessons(data.offset);
});
export const loadTeacherLesson=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({id:z.string().uuid()}).strict().parse(raw)).handler(async({data})=>{
  const {loadPrivateLesson}=await import('./teacher-workspace-store.server');const loaded=await loadPrivateLesson(data.id);return {snapshotJson:JSON.stringify(loaded.snapshot),meta:loaded.meta,ownerId:loaded.ownerId};
});
export const listTeacherTeachingPlans=createServerFn({method:'POST'}).handler(async()=>{const {listPrivateTeachingPlans}=await import('./teacher-workspace-store.server');return listPrivateTeachingPlans();});
export const saveTeacherTeachingPlan=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({id:z.string().uuid(),plan:teacherTeachingPlanSchema,expectedRevision:z.union([z.string().uuid(),z.literal('')]),expectedEmail:z.string().email().max(320)}).strict().parse(raw)).handler(async({data})=>{
  const {savePrivateTeachingPlan}=await import('./teacher-workspace-store.server');return savePrivateTeachingPlan(data.id,data.plan,data.expectedRevision,data.expectedEmail);
});

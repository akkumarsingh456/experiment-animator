import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {pyqScopeSchema} from './cbse-pyq';
export const readPyqNote=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>pyqScopeSchema.parse(raw)).handler(async({data})=>{const {loadPrivatePyqNote}=await import('./teacher-workspace-store.server');return loadPrivatePyqNote(data);});
export const savePyqNote=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({scope:pyqScopeSchema,text:z.string().max(12000),expectedRevision:z.union([z.string().uuid(),z.literal('')]),expectedEmail:z.string().email().max(320)}).strict().parse(raw)).handler(async({data})=>{const {savePrivatePyqNote}=await import('./teacher-workspace-store.server');return savePrivatePyqNote(data);});
export const findPyqPassages=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({url:z.string().url(),topic:z.string().min(3).max(300),klass:z.enum(['10','12']),year:z.number().int(),subject:z.string().min(1).max(120),file:z.string().max(500).optional()}).strict().parse(raw)).handler(async({data})=>{const {searchOfficialPyq}=await import('./cbse-pyq-read.server');return searchOfficialPyq(data);});

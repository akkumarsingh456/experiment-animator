import {z} from 'zod';
import type {PyqReading} from './cbse-pyq-questions';
const question=z.object({id:z.string().max(64),number:z.string().max(20),page:z.number().int().positive(),endPage:z.number().int().positive(),text:z.string().max(14000),ocr:z.boolean(),chapter:z.string().max(300),topics:z.array(z.string().max(500)).max(100),mapping:z.enum(['suggested','teacher','unmapped'])}).strict();
const reading=z.object({url:z.string().url(),file:z.string().max(500),klass:z.string().max(10),subject:z.string().max(120),year:z.number().int(),exam:z.string().max(60),pages:z.number().int().positive(),ocrPages:z.number().int().nonnegative(),questions:z.array(question).max(1000),readAt:z.string(),sourceCheckedAt:z.string(),warnings:z.array(z.string().max(1000)).max(200)}).strict();
export const pyqBankScope=z.object({klass:z.enum(['9','10','11','12']),subject:z.string().min(1).max(120),chapter:z.string().max(300),year:z.string().regex(/^(?:all|20\d{2})$/),search:z.string().max(500),showUnmapped:z.boolean()}).strict();
export const pyqBankSnapshot=z.object({version:z.literal(1),scope:pyqBankScope,readings:z.array(reading).max(1000)}).strict();
export type PyqBankSnapshot={version:1;scope:z.infer<typeof pyqBankScope>;readings:PyqReading[]};
export const pyqBankMeta=z.object({id:z.string().uuid(),savedAt:z.string().datetime(),title:z.string().max(500),scope:pyqBankScope,questions:z.number().int().nonnegative()}).strict();
export type PyqBankMeta=z.infer<typeof pyqBankMeta>;

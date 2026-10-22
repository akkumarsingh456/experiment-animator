import {createFileRoute} from '@tanstack/react-router';
import {TeacherWorkspace} from '@/components/TeacherWorkspace';
export const Route=createFileRoute('/workspace')({head:()=>({meta:[{title:'My teaching workspace — EduPlan'},{name:'robots',content:'noindex,nofollow'}]}),component:TeacherWorkspace});

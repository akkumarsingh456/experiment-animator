import {expect,it} from 'vitest';
import {emptyTeachingFilters,filterTeachingLectures,groupTeachingLectures,teacherTeachingPlanSchema,upcomingTeachingLectures} from '@/lib/teacher-teaching-plan';
import type {WorkspaceMeta} from '@/lib/teacher-workspace';
const lecture=(id:string,klass:string,subject:string,chapter:string):WorkspaceMeta=>({id,revision:id,title:chapter,scope:{klass,subject,chapter,topic:'Properties',subtopics:'Examples',mode:'topic'},slides:10,savedAt:new Date().toISOString()});
const items=[lecture('a','12','Chemistry','Coordination'),lecture('b','9','Science','Matter'),lecture('c','12','Physics','Magnetism')];
const plans={a:{lessonId:'a',revision:'a',updatedAt:new Date().toISOString(),plan:{status:'planned' as const,date:'2026-10-25',nextTopics:'Secondary valency',notes:'Bring models'}},c:{lessonId:'c',revision:'c',updatedAt:new Date().toISOString(),plan:{status:'taught' as const,date:'2026-10-24',nextTopics:'Domains',notes:''}}};
it('separates classes and subjects and filters chapter and status exactly',()=>{
 expect(groupTeachingLectures(items).map(group=>[group.klass,group.subject])).toEqual([['9','Science'],['12','Chemistry'],['12','Physics']]);
 expect(filterTeachingLectures(items,plans,{...emptyTeachingFilters(),klass:'12',subject:'Chemistry',chapter:'Coordination',status:'planned'})).toEqual([items[0]]);
 expect(filterTeachingLectures(items,plans,{...emptyTeachingFilters(),klass:'9',subject:'Chemistry'})).toEqual([]);
});
it('finds topics and teacher reminders and omits taught lectures from upcoming',()=>{
 expect(filterTeachingLectures(items,plans,{...emptyTeachingFilters(),query:'valency models'})).toEqual([items[0]]);
 expect(upcomingTeachingLectures(items,plans)).toEqual([items[0]]);
});
it('rejects invalid calendar dates and allows an undated plan',()=>{
 expect(teacherTeachingPlanSchema.safeParse({...plans.a.plan,date:'2026-02-31'}).success).toBe(false);
 expect(teacherTeachingPlanSchema.safeParse({...plans.a.plan,date:''}).success).toBe(true);
});

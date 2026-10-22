import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({cache:new Map(),save:vi.fn(),load:vi.fn(async()=>{})}));
vi.mock('@/lib/manual-visuals',()=>({manualVisualCache:mocks.cache,loadManualVisuals:mocks.load,saveManualVisual:mocks.save}));
import {restoreWorkspace,captureWorkspace} from '@/lib/teacher-workspace-device';
import {workspaceSnapshotSchema,workspaceDeviceKey,workspaceLesson} from '@/lib/teacher-workspace';
import {sharedVisualKey} from '@/lib/shared-topic-visual';
import {captureBlankSlides} from '@/lib/saved-blank-slides';
import type {Slide} from '@/lib/generate.functions';
const scope={klass:'12',subject:'Chemistry',chapter:'Coordination Compounds',topic:"Werner's Theory",subtopics:'',mode:'topic' as const};
const original:Slide={title:scope.topic,visual:'book',kind:'content',bullets:['Original NCERT explanation'],notes:[],key_terms:[]};
const blank:Slide={title:'Teacher slide 1',visual:'book',kind:'content',teacher_blank:{id:'11111111-1111-4111-8111-111111111111',topic:scope.topic},bullets:['Cloud teacher notes'],notes:[],key_terms:[],sections:[]};
const cover:Slide={title:'Cover',visual:'cover',kind:'break',bullets:[],notes:[],key_terms:[]};
const visual={url:'data:image/png;base64,AAAA',width:96,x:2,y:2,shape:'rectangle' as const,showAuto:false};
const imageKey='topic-visual:'+sharedVisualKey({...scope,topic:blank.title,slideId:'teacher-blank:'+blank.teacher_blank!.id});
function snapshot(){return workspaceSnapshotSchema.parse({version:1,scope,lesson:{slides:[original,blank],source_books:[],context_chars:0,activities:[],activity_matches:[],video:{title:'Lesson',scenes:[]}},blanks:captureBlankSlides([cover,original,blank],null),bookmark:{version:1,view:'slides',title:blank.title,section:'Notes',occurrence:0,index:2,savedAt:new Date().toISOString()},images:[{key:imageKey,visual}]});}
beforeEach(()=>{localStorage.clear();mocks.cache.clear();mocks.save.mockReset();mocks.save.mockImplementation(async(key,value)=>{mocks.cache.set(key,value);});});
it('restores notes, bookmark and UUID-linked images on a new device',async()=>{
 const saved=snapshot(),result=await restoreWorkspace(saved);
 expect(result.warnings).toEqual([]);expect(result.lesson.slides).toEqual([original,blank]);
 expect(mocks.save).toHaveBeenCalledWith(imageKey,visual);
 expect(JSON.parse(localStorage.getItem('eduplan-teaching-bookmark-v1:'+workspaceDeviceKey(scope))!)).toEqual(saved.bookmark);
 expect(saved.lesson.slides[0]).toEqual(original);
});
it('retains newer device blank text and never overwrites an existing imported image',async()=>{
 const local={...blank,bullets:['Newer device notes']};localStorage.setItem(workspaceDeviceKey(scope),JSON.stringify(captureBlankSlides([cover,original,local],null)));
 mocks.cache.set(imageKey,{...visual,url:'data:image/png;base64,BBBB'});
 const result=await restoreWorkspace(snapshot());
 expect(result.lesson.slides.find(slide=>slide.teacher_blank)?.bullets).toEqual(['Newer device notes']);
 expect(mocks.save).not.toHaveBeenCalled();expect(result.lesson.slides[0]).toEqual(original);
});
it('keeps a locally deleted blank slide deleted after opening an older backup',async()=>{
 const saved=snapshot();localStorage.setItem(workspaceDeviceKey(scope),JSON.stringify({version:1,blanks:[],deleted:saved.blanks.blanks[0]}));
 const result=await restoreWorkspace(saved);expect(result.lesson.slides).toEqual([original]);
});
it('captures only this selected lesson and omits the generated wrapper cover',async()=>{
 const saved=snapshot();mocks.cache.set(imageKey,visual);mocks.cache.set('unrelated-image',visual);
 const result=await captureWorkspace(scope,workspaceLesson(saved),[cover,original,blank],null,saved.bookmark);
 expect(result.images).toEqual([{key:imageKey,visual}]);expect(result.lesson.slides).toEqual([original,blank]);expect(original.bullets).toEqual(['Original NCERT explanation']);
});
it('keeps the lesson readable and reports device image restore failure',async()=>{
 mocks.save.mockRejectedValue(new Error('storage full'));
 const result=await restoreWorkspace(snapshot());expect(result.lesson.slides).toEqual([original,blank]);expect(result.warnings.join(' ')).toContain('images');
});

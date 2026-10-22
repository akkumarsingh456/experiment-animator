import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({identity:vi.fn(),getBucket:vi.fn(),createBucket:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/library-access.server',()=>({readLibraryIdentity:mocks.identity}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{storage:{getBucket:mocks.getBucket,createBucket:mocks.createBucket,from:mocks.from}}}));
import {savePrivateLesson,listPrivateLessons,loadPrivateLesson,listPrivateTeachingPlans,savePrivateTeachingPlan} from '@/lib/teacher-workspace-store.server';
import {workspaceSnapshotSchema,imageBelongsToWorkspace} from '@/lib/teacher-workspace';
import {libraryReturnPath} from '@/lib/library-login';
import {sharedVisualKey} from '@/lib/shared-topic-visual';
const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
const scope={klass:'12',subject:'Chemistry',chapter:'Coordination Compounds',topic:"Werner's Theory",subtopics:'',mode:'topic' as const};
const snapshot=()=>workspaceSnapshotSchema.parse({version:1,scope,lesson:{slides:[{title:scope.topic,visual:'book',kind:'content',bullets:['Original explanation'],notes:[],key_terms:[]}],source_books:[],context_chars:0,activities:[],activity_matches:[],video:{title:'Lesson',scenes:[]}},blanks:{version:1,blanks:[],deleted:null},bookmark:null,images:[]});
let files:Map<string,string>,exists:boolean,failIndex:boolean,corrupt:boolean;
const plan={status:'planned' as const,date:'2026-10-24',nextTopics:'Primary and secondary valency',notes:'Bring molecular models'};
it('saves teaching plans separately and preserves them when the lecture is updated',async()=>{
 const original=snapshot(),meta=await savePrivateLesson(original);
 const saved=await savePrivateTeachingPlan(meta.id,plan,'','teacher@example.com');
 expect(await listPrivateTeachingPlans()).toEqual([saved]);
 await savePrivateLesson(original,meta.id);
 expect(await listPrivateTeachingPlans()).toEqual([saved]);
 expect((await loadPrivateLesson(meta.id)).snapshot).toEqual(original);
 await expect(savePrivateTeachingPlan(meta.id,{...plan,notes:'Stale edit'},'','teacher@example.com')).rejects.toThrow('another device');
 expect(await listPrivateTeachingPlans()).toEqual([saved]);
 const changed=await savePrivateTeachingPlan(meta.id,{...plan,status:'taught'},saved.revision,'teacher@example.com');
 expect(changed.plan.status).toBe('taught');
});
it('isolates teaching plans by verified teacher and rejects account changes',async()=>{
 const meta=await savePrivateLesson(snapshot());
 await savePrivateTeachingPlan(meta.id,plan,'','teacher@example.com');
 await expect(savePrivateTeachingPlan(meta.id,plan,'','wrong@example.com')).rejects.toThrow('account changed');
 mocks.identity.mockResolvedValue({id:second,email:'second@example.com',admin:false});
 expect(await listPrivateTeachingPlans()).toEqual([]);
 await expect(savePrivateTeachingPlan(meta.id,plan,'','second@example.com')).rejects.toThrow('not found');
 mocks.identity.mockResolvedValue(null);
 await expect(listPrivateTeachingPlans()).rejects.toThrow('Sign in');
 await expect(savePrivateTeachingPlan(meta.id,plan,'','teacher@example.com')).rejects.toThrow('Sign in');
});
beforeEach(()=>{
 vi.clearAllMocks();files=new Map();exists=false;failIndex=false;corrupt=false;
 mocks.identity.mockResolvedValue({id:first,email:'teacher@example.com',admin:false,name:'Teacher'});
 mocks.getBucket.mockImplementation(async()=>exists?{data:{public:false},error:null}:{data:null,error:{status:404,message:'Not found'}});
 mocks.createBucket.mockImplementation(async()=>{exists=true;return {error:null};});
 mocks.from.mockReturnValue({
  upload:vi.fn(async(path:string,body:Blob)=>{if(failIndex&&path.includes('/index/'))return {error:{message:'failed'}};files.set(path,await body.text());return {error:null};}),
  download:vi.fn(async(path:string)=>files.has(path)?{error:null,data:{text:async()=>corrupt&&path.includes('/lessons/')?'corrupt':files.get(path)!}}:{data:null,error:{status:404}}),
  list:vi.fn(async(prefix:string,{offset,limit}:{offset:number;limit:number})=>({error:null,data:[...files.keys()].filter(path=>path.startsWith(prefix+'/')).slice(offset,offset+limit).map(path=>({name:path.split('/').at(-1)!}))})),
 });
});
it('rejects signed-out access before touching privileged storage',async()=>{
 mocks.identity.mockResolvedValue(null);
 await expect(savePrivateLesson(snapshot())).rejects.toThrow('Sign in');
 await expect(listPrivateLessons(0)).rejects.toThrow('Sign in');
 await expect(loadPrivateLesson(first)).rejects.toThrow('Sign in');
 expect(mocks.getBucket).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled();
});
it('rejects history saving if the account changed during preparation',async()=>{
 await expect(savePrivateLesson(snapshot(),undefined,'different@example.com')).rejects.toThrow('account changed');
 expect(mocks.getBucket).not.toHaveBeenCalled();
});
it('keeps older lectures accessible through paginated history',async()=>{
 for(let index=0;index<21;index++)await savePrivateLesson(snapshot());
 const firstPage=await listPrivateLessons(0),secondPage=await listPrivateLessons(20);
 expect(firstPage.items).toHaveLength(20);expect(firstPage.nextOffset).toBe(20);
 expect(secondPage.items).toHaveLength(1);expect(secondPage.nextOffset).toBeNull();
 expect(new Set([...firstPage.items,...secondPage.items].map(item=>item.id)).size).toBe(21);
});
it('creates private storage, confirms a backup, and round trips the full lesson',async()=>{
 const original=snapshot(),meta=await savePrivateLesson(original);
 expect(mocks.createBucket).toHaveBeenCalledWith('teacher-private-workspace',expect.objectContaining({public:false}));
 expect((await listPrivateLessons(0)).items).toEqual([meta]);
 expect((await loadPrivateLesson(meta.id)).snapshot).toEqual(original);
 expect([...files.keys()].every(path=>path.startsWith(first+'/'))).toBe(true);
});
it('isolates two teachers even when the second supplies the first teacher lesson ID',async()=>{
 const original=snapshot(),meta=await savePrivateLesson(original);
 mocks.identity.mockResolvedValue({id:second,email:'second@example.com',admin:false});
 expect((await listPrivateLessons(0)).items).toEqual([]);
 await expect(loadPrivateLesson(meta.id)).rejects.toThrow('not found');
 const different=snapshot();different.lesson.slides[0].bullets=['Second teacher notes'];await savePrivateLesson(different,meta.id);
 mocks.identity.mockResolvedValue({id:first,email:'teacher@example.com',admin:false});
 expect((await loadPrivateLesson(meta.id)).snapshot).toEqual(original);
});
it('refuses a publicly configured bucket without uploading lesson data',async()=>{
 mocks.getBucket.mockResolvedValue({data:{public:true},error:null});
 await expect(savePrivateLesson(snapshot())).rejects.toThrow('privacy');
 expect(files.size).toBe(0);
});
it('does not publish a listing for an unconfirmed backup',async()=>{
 corrupt=true;await expect(savePrivateLesson(snapshot())).rejects.toThrow('confirmed');
 expect([...files.keys()].some(path=>path.includes('/index/'))).toBe(false);
});
it('retains the previous working backup if a later index update fails',async()=>{
 const original=snapshot(),meta=await savePrivateLesson(original);failIndex=true;
 const changed=snapshot();changed.lesson.slides[0].bullets=['Changed'];
 await expect(savePrivateLesson(changed,meta.id)).rejects.toThrow('listed');
 expect((await loadPrivateLesson(meta.id)).snapshot).toEqual(original);
});
it('rejects path traversal and keeps Google callback destinations allowlisted',async()=>{
 await expect(loadPrivateLesson('../another-user/index')).rejects.toThrow();
 expect(mocks.getBucket).not.toHaveBeenCalled();
 expect(libraryReturnPath('/workspace')).toBe('/workspace');
 expect(libraryReturnPath('https://example.com/workspace')).toBe('/upload');
 expect(libraryReturnPath('//example.com')).toBe('/upload');
});
it('selects imported images by exact class, subject, chapter and selected topic',()=>{
 const key=(klass:string,chapter:string,topic:string)=>'topic-visual:'+sharedVisualKey({klass,subject:scope.subject,chapter,topic,slideId:'teacher-blank:one'});
 const titles=new Set([scope.topic]);
 expect(imageBelongsToWorkspace(key('12',scope.chapter,scope.topic),scope,titles)).toBe(true);
 expect(imageBelongsToWorkspace(key('11',scope.chapter,scope.topic),scope,titles)).toBe(false);
 expect(imageBelongsToWorkspace(key('12','Other chapter',scope.topic),scope,titles)).toBe(false);
 expect(imageBelongsToWorkspace(key('12',scope.chapter,'Other topic'),scope,titles)).toBe(false);
});

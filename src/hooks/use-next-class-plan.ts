import {useEffect,useState} from 'react';
import {useTeacherAccount} from './use-teacher-account';
import {loadTeacherTeachingPlan} from '@/lib/teacher-workspace.functions';
import {emptyTeachingPlan,teacherPlanDraftKey,teacherPlanDraftSchema,type TeacherTeachingPlan,type TeacherPlanRecord} from '@/lib/teacher-teaching-plan';
const EMPTY_PLAN=emptyTeachingPlan();

export function useNextClassPlan(initialId:string){
 const {account,checking}=useTeacherAccount(),owner=account?.signedIn?account.email:'';
 const [lessonId,setLessonId]=useState(initialId),[attempt,retry]=useState(0);
 const key=owner&&lessonId?JSON.stringify([owner,lessonId]):'';
 const [state,setState]=useState<{key:string;plan:TeacherTeachingPlan;record?:TeacherPlanRecord;loading:boolean;error:string}>({key:'',plan:emptyTeachingPlan(),loading:false,error:''});
 useEffect(()=>{setLessonId(initialId);},[owner,initialId]);
 useEffect(()=>{
  if(!key)return;let active=true;setState({key,plan:emptyTeachingPlan(),loading:true,error:''});
  void loadTeacherTeachingPlan({data:{id:lessonId}}).then(record=>{
   if(!active)return;let plan=record?.plan||emptyTeachingPlan();
   try{const raw=localStorage.getItem(teacherPlanDraftKey(owner,lessonId));if(raw)plan=teacherPlanDraftSchema.parse(JSON.parse(raw)).plan;}catch{/* The editor displays a device-storage warning. */}
   setState({key,plan,record:record||undefined,loading:false,error:''});
  }).catch(error=>{if(active)setState({key,plan:emptyTeachingPlan(),loading:false,error:error instanceof Error?error.message:'Teaching plan could not be loaded.'});});
  return()=>{active=false;};
 },[key,attempt]);
 useEffect(()=>{if(!key)return;const changed=(event:StorageEvent)=>{if(event.key!==teacherPlanDraftKey(owner,lessonId))return;if(event.newValue){try{const draft=teacherPlanDraftSchema.parse(JSON.parse(event.newValue));setState(current=>current.key===key?{...current,plan:draft.plan}:current);}catch{/* Keep the current plan when another tab supplies an invalid draft. */}}else retry(value=>value+1);};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[key]);
 const current=state.key===key&&!!key;
 return {lessonId,setLessonId,owner,checking,plan:current?state.plan:EMPTY_PLAN,record:current?state.record:undefined,
  loading:!!lessonId&&(checking||!!owner&&(!current||state.loading)),error:current?state.error:lessonId&&!checking&&!owner?'Sign in to confirm this lecture’s private teaching plan before presenting or downloading.':'',retry:()=>retry(value=>value+1),
  change:(plan:TeacherTeachingPlan)=>setState(value=>value.key===key?{...value,plan}:value),
  saved:(record:TeacherPlanRecord)=>setState(value=>value.key===key?{...value,record}:value)};
}

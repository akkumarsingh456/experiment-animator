import { prepareScannedReferenceBooks } from './prepare-reference-books';

type State={initialized:boolean;busy:boolean;failed:boolean;message:string;revision:number};
let state:State={initialized:false,busy:false,failed:false,message:'Book preparation has not started.',revision:0};
const listeners=new Set<()=>void>();
let pending:Promise<void>|undefined;
let stopped=false;
let completed=false;
let libraryVersion=0;
let selectedChapter='';
let selectedRequest:{klass:string;subject:string;chapter:string}|undefined;
const chapterJobs=new Map<string,Promise<void>>();
const readyChapters=new Set<string>();
const publish=(patch:Partial<State>)=>{state={...state,...patch};listeners.forEach(listener=>listener());};
export const bookPreparationSnapshot=()=>state;
export function subscribeBookPreparation(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
export function pauseBookPreparation(){stopped=true;publish({message:'Pausing book preparation. Saved pages will be reused.'});}
export function initializeBookPreparation(){publish({initialized:true});}
export function invalidateBookPreparation(){libraryVersion++;completed=false;readyChapters.clear();publish({revision:state.revision+1});}
export function resumeBookPreparation(){return selectedRequest?startChapterPreparation(selectedRequest.klass,selectedRequest.subject,selectedRequest.chapter):startBookPreparation();}
export function startChapterPreparation(klass:string,subject:string,chapter:string):Promise<void>{
 if(!/11|12/.test(klass)||!chapter||!/physics|chemistry|biology|botany|zoology/i.test(subject))return Promise.resolve();
 const key=`${klass}|${subject}|${chapter}`;selectedChapter=key;selectedRequest={klass,subject,chapter};
 if(completed||readyChapters.has(key)){publish({busy:false,failed:false,message:'Reusing saved chapter pictures.',revision:state.revision+1});return Promise.resolve();}
 if(chapterJobs.has(key))return chapterJobs.get(key)!;
 const previous=pending||Promise.resolve();if(pending)stopped=true;
 const cancelled=()=>selectedChapter!==key||stopped;
 const job=previous.then(async()=>{
  if(selectedChapter!==key)return;
  stopped=false;publish({busy:true,failed:false,message:`Checking saved pictures for ${chapter}…`});
  try{
   const summaries=await prepareScannedReferenceBooks(klass,subject,message=>{if(!cancelled())publish({message});},cancelled,async()=>publish({revision:state.revision+1}),chapter,{medEasyOnly:true,chapterOnly:true});
   if(!cancelled()){
    const error=summaries.find(summary=>summary.error)?.error;
    if(!error&&summaries.some(summary=>summary.pages>0))readyChapters.add(key);
    publish({failed:!!error,message:error||'Saved chapter pictures are available. Lesson generation stays ready.'});
   }
  }catch(error){if(!cancelled())publish({failed:true,message:error instanceof Error?error.message:'Chapter pictures could not be checked.'});}
  finally{if(selectedChapter===key)publish({initialized:true,busy:false,revision:state.revision+1});}
 }).finally(()=>{chapterJobs.delete(key);});
 chapterJobs.set(key,job);return job;
}

/** One reader survives client-side navigation; generation never starts a second scan. */
export function startBookPreparation():Promise<void>{
 if(pending)return pending;
 if(completed)return Promise.resolve();
 stopped=false;publish({busy:true,failed:false,message:'Preparing uploaded Med Easy books before lessons…'});
 const startedVersion=libraryVersion;
 pending=(async()=>{
  let failures=false,books=0;
  try{
   for(const subject of ['Chemistry','Physics','Biology']){
    if(stopped)break;
    const summaries=await prepareScannedReferenceBooks('11',subject,message=>publish({message}),()=>stopped,async()=>publish({revision:state.revision+1}),undefined,{medEasyOnly:true});
    failures ||= summaries.some(summary=>!!summary.error);
    books+=summaries.length;
   }
   completed=!stopped&&!failures&&startedVersion===libraryVersion;publish({failed:failures});
   publish({message:stopped?'Preparation paused. Completed pages are saved.':failures?'Some books need another attempt. Completed pages are saved.':!books?'No uploaded Med Easy books were found.':'Med Easy preparation complete. Saved pictures are ready for matching lessons.',revision:state.revision+1});
  }catch(error){publish({failed:true,message:error instanceof Error?error.message:'Book preparation could not finish. Resume to retry.'});}
  finally{pending=undefined;publish({initialized:true,busy:false});}
 })();
 return pending;
}

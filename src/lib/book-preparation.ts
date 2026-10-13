import { prepareScannedReferenceBooks } from './prepare-reference-books';

type State={initialized:boolean;busy:boolean;failed:boolean;message:string;revision:number};
let state:State={initialized:false,busy:false,failed:false,message:'Book preparation has not started.',revision:0};
const listeners=new Set<()=>void>();
let pending:Promise<void>|undefined;
let stopped=false;
let completed=false;
let libraryVersion=0;
const publish=(patch:Partial<State>)=>{state={...state,...patch};listeners.forEach(listener=>listener());};
export const bookPreparationSnapshot=()=>state;
export function subscribeBookPreparation(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
export function pauseBookPreparation(){stopped=true;publish({message:'Pausing book preparation. Saved pages will be reused.'});}
export function invalidateBookPreparation(){libraryVersion++;completed=false;publish({revision:state.revision+1});const wait=pending||Promise.resolve();void wait.then(()=>{if(!stopped)void startBookPreparation();});}

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

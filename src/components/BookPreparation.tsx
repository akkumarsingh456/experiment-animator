import {useEffect,useSyncExternalStore} from 'react';
import {bookPreparationSnapshot,subscribeBookPreparation,initializeBookPreparation,resumeBookPreparation,pauseBookPreparation} from '@/lib/book-preparation';

export function BookPreparation(){
 const state=useSyncExternalStore(subscribeBookPreparation,bookPreparationSnapshot,bookPreparationSnapshot);
 useEffect(()=>{
  // Use the same existing library permissions as generation. Do not require
  // a separate login just to prepare books already available to this site.
  initializeBookPreparation();
 },[]);
 if(!state.busy&&!state.failed)return null;
 return <aside className="book-preparation-status" aria-label="Med Easy library preparation"><strong>Med Easy chapter pictures · free · generation stays available</strong><span role="status">{state.message}</span><button onClick={()=>state.busy?pauseBookPreparation():void resumeBookPreparation()}>{state.busy?'Pause preparation':'Resume preparation'}</button></aside>;
}

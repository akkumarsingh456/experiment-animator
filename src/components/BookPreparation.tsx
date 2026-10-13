import {useEffect,useSyncExternalStore} from 'react';
import {bookPreparationSnapshot,subscribeBookPreparation,startBookPreparation,pauseBookPreparation} from '@/lib/book-preparation';

export function BookPreparation(){
 const state=useSyncExternalStore(subscribeBookPreparation,bookPreparationSnapshot,bookPreparationSnapshot);
 useEffect(()=>{
  // Use the same existing library permissions as generation. Do not require
  // a separate login just to prepare books already available to this site.
  void startBookPreparation();
 },[]);
 if(!state.busy&&!state.failed)return null;
 return <aside className="book-preparation-status" aria-label="Med Easy library preparation"><strong>Preparing Med Easy pictures · free</strong><span role="status">{state.message}</span><button onClick={()=>state.busy?pauseBookPreparation():void startBookPreparation()}>{state.busy?'Pause preparation':'Resume preparation'}</button></aside>;
}

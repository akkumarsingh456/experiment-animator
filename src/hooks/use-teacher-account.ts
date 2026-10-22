import {useCallback,useEffect,useRef,useState} from 'react';
import {getLibraryAccess} from '@/lib/library-access.functions';
import {supabase} from '@/integrations/supabase/client';
export function useTeacherAccount(){
  const [account,setAccount]=useState<Awaited<ReturnType<typeof getLibraryAccess>>|null>(null),[checking,setChecking]=useState(true),[error,setError]=useState('');
  const active=useRef(true),revision=useRef(0);
  const refresh=useCallback(async()=>{const run=++revision.current;setChecking(true);try{await supabase.auth.getSession();const value=await getLibraryAccess();if(active.current&&run===revision.current){setAccount(value);setError('');}}catch{if(active.current&&run===revision.current){setAccount(null);setError('Your sign-in could not be checked. Please retry.');}}finally{if(active.current&&run===revision.current)setChecking(false);}},[]);
  useEffect(()=>{active.current=true;void refresh();const {data}=supabase.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)){revision.current++;setAccount(null);setChecking(true);setTimeout(()=>{if(active.current)void refresh();},0);}});return()=>{active.current=false;revision.current++;data.subscription.unsubscribe();};},[refresh]);
  return {account,checking,error,refresh};
}

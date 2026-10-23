import {useState} from 'react';
import type {PyqQuestion,PyqReading} from '@/lib/cbse-pyq-questions';
import {Button} from './ui/button';

export function PyqPdfButton({rows,title,label='Download PYQs PDF',disabled=false}:{rows:{question:PyqQuestion;reading:PyqReading}[];title:string;label?:string;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function download(){setBusy(true);setMessage('Preparing PDF…');try{const {downloadPyqPdf}=await import('@/lib/pyq-pdf');await downloadPyqPdf(rows,title,(done,total)=>setMessage(`Preparing ${done}/${total} questions…`));setMessage('PDF download prepared.');}catch(error){setMessage(error instanceof Error?error.message:'PDF download failed. Please retry.');}finally{setBusy(false);}}
 return <div className="space-y-1"><Button type="button" size="sm" variant="outline" disabled={disabled||busy||!rows.length} onClick={()=>void download()}>{busy?'Preparing PDF…':label}</Button><p className="text-xs text-slate-600" role="status" aria-live="polite">{message}</p></div>;
}

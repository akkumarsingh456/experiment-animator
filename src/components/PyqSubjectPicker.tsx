import {useState} from 'react';
import {Check,ChevronsUpDown} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from './ui/popover';
import {Command,CommandEmpty,CommandInput,CommandItem,CommandList} from './ui/command';

export function PyqSubjectPicker({subjects,value,disabled,onChange}:{subjects:string[];value:string;disabled?:boolean;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 const normal=(subject:string)=>subject.trim().toLowerCase().replace(/\s+/g,' ');
 const options=subjects.filter((subject,index)=>subjects.findIndex(other=>normal(other)===normal(subject))===index);
 return <Popover open={open} onOpenChange={setOpen}>
   <PopoverTrigger asChild><button type="button" role="combobox" aria-label="PYQ subject" aria-expanded={open} disabled={disabled} className="mt-1 flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"><span className="min-w-0 break-words">{value||'Choose a subject'}</span><ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500"/></button></PopoverTrigger>
   <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0">
     <Command><CommandInput placeholder="Search subjects…" aria-label="Search PYQ subjects"/><CommandList className="max-h-64"><CommandEmpty>No matching subject. Try another name.</CommandEmpty>{options.map(subject=><CommandItem key={subject} value={subject} onSelect={()=>{if(normal(value)!==normal(subject))onChange(subject);setOpen(false);}}><Check aria-hidden="true" className={`mr-2 h-4 w-4 shrink-0 ${normal(value)===normal(subject)?'opacity-100':'opacity-0'}`}/><span className="break-words">{subject}</span></CommandItem>)}</CommandList></Command>
   </PopoverContent>
 </Popover>;
}

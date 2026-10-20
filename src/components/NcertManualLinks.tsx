import { BookOpen, FileText } from 'lucide-react';
import { ncertManualsFor } from '@/lib/ncert-manuals';
import { NCERT_LABS } from '@/lib/experiment-activities';

export function NcertManualLinks({klass,subject,chapter,topic}:{klass:string;subject:string;chapter:string;topic:string}) {
  const resources=ncertManualsFor(klass,subject,chapter,topic);
  return <div className="rounded-2xl border bg-white p-5 sm:p-6">
    <h3 className="flex items-center gap-2 font-semibold"><BookOpen size={19}/> NCERT manual PDFs · Class {resources.grade} {resources.subject}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{chapter||topic}</p>
    {resources.recommended.length>0?<>
      <p className="mt-4 text-sm font-medium">Experiment PDFs connected to this chapter</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{resources.recommended.map(item=><a key={item.url} href={`${item.url}#page=${item.page}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 transition hover:bg-cyan-100/60">
        <span className="flex items-center gap-2 text-sm font-semibold text-primary"><FileText size={17}/> Open PDF · page {item.page}</span>
        <span className="mt-2 block text-sm leading-relaxed">{item.experiment}</span><span className="mt-3 block border-t border-cyan-200 pt-3 text-sm text-slate-700">{item.connection}</span><span className="mt-2 block text-xs text-muted-foreground">Class {item.klass} · {item.subject} · {item.title}</span>
      </a>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">These are shared laboratory-manual sections. The page number refers to the PDF page, which may differ from the printed page.</p>
    </>:<p className="mt-4 text-sm text-muted-foreground">{resources.all.length?'No chapter-specific experiment PDF was identified. You can look for more material in the official catalog.':'NCERT does not list a laboratory manual for this class and subject in the linked catalog.'}</p>}

    <a href={NCERT_LABS} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs text-primary underline">Official NCERT manual catalog and experiment videos</a>
  </div>;
}

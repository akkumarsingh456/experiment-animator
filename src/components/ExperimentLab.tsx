import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Download, Eye, FlaskConical, Play, Pause, RotateCcw, Volume2, Wind, Maximize2, Minimize2 } from 'lucide-react';
import type { Activity } from '@/lib/generate.functions';
import { displayExperiments, NCERT_LABS, type ExperimentActivity } from '@/lib/experiment-activities';
import { experimentCues } from '@/lib/experiment-drawing';
import { NcertManualLinks } from './NcertManualLinks';
import { ExperimentVideos } from './ExperimentVideos';
import { apparatusPhotos, loadApparatusPhotos, drawPhotographicExperiment, type PhotoImages } from '@/lib/experiment-photographs';

function usePhotos(activity: ExperimentActivity) {
  const [images,setImages]=useState<PhotoImages>(new Map());
  const [ready,setReady]=useState(false);
  useEffect(()=>{let active=true;setReady(false);setImages(new Map());loadApparatusPhotos(apparatusPhotos(activity)).then(loaded=>{if(active){setImages(loaded);setReady(true);}});return()=>{active=false;};},[activity]);
  return {images,ready};
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function Frame({ activity, step }: { activity: ExperimentActivity; step: number }) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const {images,ready}=usePhotos(activity);
  useEffect(()=>{if(canvas.current&&ready)drawPhotographicExperiment(canvas.current,activity,step,2.5,images);},[activity,step,images,ready]);
  if(!ready)return <div className="grid aspect-video place-items-center rounded-xl bg-slate-50 text-sm">Preparing the illustrated procedure…</div>;
  return <canvas ref={canvas} className="w-full rounded-xl border bg-white" role="img" aria-label={`${activity.name}: ${activity.steps[step]?.description || activity.observation}`} />;
}

function ExperimentPlayer({ activity }: { activity: ExperimentActivity }) {
  const player=useRef<HTMLDivElement>(null),presentButton=useRef<HTMLButtonElement>(null);
  const [presenting,setPresenting]=useState(false);
  async function togglePresentation(){
    if(presenting){
      if(document.fullscreenElement===player.current)await document.exitFullscreen().catch(()=>{});
      setPresenting(false);presentButton.current?.focus();return;
    }
    setPresenting(true);
    // Keep an in-page presentation available if browser fullscreen is blocked.
    await player.current?.requestFullscreen?.().catch(()=>{});
  }
  useEffect(()=>{
    const changed=()=>{if(!document.fullscreenElement){setPresenting(false);presentButton.current?.focus();}};
    document.addEventListener('fullscreenchange',changed);
    return()=>document.removeEventListener('fullscreenchange',changed);
  },[]);
  useEffect(()=>{
    if(!presenting)return;
    const before=document.body.style.overflow;document.body.style.overflow='hidden';
    const exit=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&!document.fullscreenElement){setPresenting(false);presentButton.current?.focus();}
      if(event.key==='Tab'){
        const controls=Array.from(player.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')||[]);
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener('keydown',exit);
    return()=>{document.body.style.overflow=before;window.removeEventListener('keydown',exit);};
  },[presenting]);
  const {images,ready}=usePhotos(activity);
  const canvas=useRef<HTMLCanvasElement>(null), recorder=useRef<MediaRecorder|null>(null), stream=useRef<MediaStream|null>(null);
  const [playing,setPlaying]=useState(false),[elapsed,setElapsed]=useState(0),[speed,setSpeed]=useState(1),[voice,setVoice]=useState(false),[recording,setRecording]=useState(false),[error,setError]=useState('');
  const durations=useMemo(()=>[...activity.steps.map(step=>step.description),activity.observation].map(text=>Math.max(8,Math.ceil(text.split(/\s+/).length/2.4))),[activity]);
  const starts=useMemo(()=>durations.map((_,index)=>durations.slice(0,index).reduce((sum,value)=>sum+value,0)),[durations]);
  const total=durations.reduce((sum,value)=>sum+value,0);
  const sceneAt=(time:number)=>{const index=durations.findIndex((duration,index)=>time<starts[index]+duration);return index<0?durations.length-1:index;};
  const scene=sceneAt(elapsed);
  const state=useRef({elapsed,playing,speed});state.current={elapsed,playing,speed};
  useEffect(()=>{
    let frame=0,last=0,clock=0,lastDraw=-1;
    const draw=(now:number)=>{
      const s=state.current;
      if(s.playing&&last){const next=Math.min(total,s.elapsed+Math.min(.1,(now-last)/1000)*s.speed);s.elapsed=next;
        if(now-clock>80||next===total){clock=now;setElapsed(next);}
        if(next===total){setPlaying(false);if(recorder.current?.state==='recording')recorder.current.stop();}
      }
      last=now;
      if(ready && canvas.current && s.elapsed!==lastDraw){drawPhotographicExperiment(canvas.current,activity,sceneAt(s.elapsed),s.elapsed-starts[sceneAt(s.elapsed)],images);lastDraw=s.elapsed;}
      frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop());};
  },[activity,total,starts,durations,images,ready]);
  useEffect(()=>{
    if(!voice||!playing||!('speechSynthesis' in window))return;
    const text=scene===activity.steps.length?`${activity.observation} ${activity.conclusion}`:activity.steps[scene].description;
    window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-IN';utterance.rate=speed*.9;window.speechSynthesis.speak(utterance);
    return()=>window.speechSynthesis.cancel();
  },[scene,voice,playing,speed,activity]);
  function record(){
    setError('');const node=canvas.current;
    if(!node?.captureStream||typeof MediaRecorder==='undefined'){setError('Video saving is unavailable in this browser. Use Play to watch the full animation.');return;}
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
    if(!mime){setError('This browser cannot save WebM video. Use a current Chrome or Edge browser.');return;}
    try{
      const capture=node.captureStream(24);stream.current=capture;const media=new MediaRecorder(capture,{mimeType:mime});const chunks:BlobPart[]=[];recorder.current=media;
      media.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      media.onstop=()=>{capture.getTracks().forEach(track=>track.stop());setRecording(false);if(chunks.length)saveBlob(new Blob(chunks,{type:mime}),`${activity.name.replace(/[^a-z0-9-]/gi,'-')}-animation.webm`);};
      media.onerror=()=>{setError('The browser could not finish saving this animation.');capture.getTracks().forEach(track=>track.stop());setRecording(false);};
      setVoice(false);setSpeed(1);setElapsed(0);state.current.elapsed=0;setRecording(true);media.start(1000);setPlaying(true);
    }catch{setError('Video saving could not start. Playback is still available.');stream.current?.getTracks().forEach(track=>track.stop());setRecording(false);}
  }
  return <div ref={player} role={presenting?'dialog':undefined} aria-modal={presenting?true:undefined} aria-label="Experiment animation player" className={presenting?'fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-auto bg-white':'overflow-hidden rounded-2xl border bg-white shadow-sm'}>
    <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-900 p-4 text-white"><div><p className="text-xs uppercase tracking-widest text-cyan-200">Watch • understand • explain</p><h3 className="mt-1 font-semibold">Step-by-step animated experiment · English subtitles</h3></div><div className="flex items-center gap-3"><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{Math.ceil(total/60)} min · captions included · free</span><button ref={presentButton} type="button" aria-pressed={presenting} onClick={togglePresentation} className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-sm hover:bg-white/10">{presenting?<Minimize2 size={17}/>:<Maximize2 size={17}/>} {presenting?'Exit presentation':'Present'}</button></div></div>
    <div className={presenting?'min-h-0 flex-1 bg-slate-950':''}><canvas ref={canvas} className={presenting?'block h-full w-full object-contain':'block w-full'} role="img" aria-label={`Animated apparatus and captions for ${activity.name}`} /></div>
    <div className="flex flex-wrap items-center gap-3 shrink-0 border-t p-4">
      <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={()=>{if(elapsed>=total){setElapsed(0);state.current.elapsed=0;}setPlaying(!playing);}} disabled={recording||!ready}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pause':'Play full experiment'}</button>
      <button title="Restart animation" aria-label="Restart animation" className="rounded-lg border p-2" disabled={recording||!ready} onClick={()=>{setElapsed(0);state.current.elapsed=0;setPlaying(true);}}><RotateCcw size={17}/></button>
      <label className="text-sm">Speed <select className="rounded border p-1" value={speed} disabled={recording||!ready} onChange={event=>setSpeed(Number(event.target.value))}>{[.75,1,1.5,2].map(value=><option key={value} value={value}>{value}×</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={voice} disabled={recording||!ready} onChange={event=>setVoice(event.target.checked)}/><Volume2 size={16}/> Read aloud</label>
      <button className="ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" disabled={recording||!ready} onClick={record}><Download size={16}/>{recording?'Saving as it plays…':'Save animation video'}</button>
      {recording&&<button className="text-sm underline" onClick={()=>{recorder.current?.stop();setPlaying(false);}}>Finish clip now</button>}
    </div>
    <div className="shrink-0 px-4 pb-4"><input aria-label="Animation position" className="w-full" type="range" min={0} max={total} step={.1} value={elapsed} disabled={recording||!ready} onChange={event=>{const value=Number(event.target.value);setElapsed(value);state.current.elapsed=value;}}/><p className="text-xs text-muted-foreground">{Math.floor(elapsed)} / {total}s · Animated procedure with English subtitles. This is an instructional animation. Saved WebM includes captions; browser read-aloud is not recorded.</p>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>
    <div className="flex flex-wrap gap-2 shrink-0 border-t bg-slate-50 p-3">{[...activity.steps.map(step=>step.title),'Observe & explain'].map((title,index)=><button key={index} disabled={recording||!ready} className={`rounded-lg border px-3 py-2 text-xs ${index===scene?'bg-primary text-primary-foreground':'bg-white'}`} onClick={()=>{setElapsed(starts[index]);state.current.elapsed=starts[index];setPlaying(true);}}>{index+1}. {title}</button>)}</div>
  </div>;
}

export function ExperimentLab({ activities, topic, klass, subject, chapter }: { activities: Activity[]; topic: string; klass: string; subject: string; chapter: string }) {
  const experiments=useMemo(()=>displayExperiments(activities||[],topic),[activities,topic]);
  const [selected,setSelected]=useState(0),[checked,setChecked]=useState<Record<string,boolean>>({});
  const activity=experiments[Math.min(selected,experiments.length-1)];
  const cues=activity?experimentCues(activity):null;
  return <section className="mb-10 space-y-5" aria-label="NCERT experiment studio">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-100 p-3 text-cyan-800"><FlaskConical size={23}/></span><div><h2 className="text-xl font-semibold">NCERT Experiment Studio</h2><p className="text-sm text-muted-foreground">Follow the illustrated actions, recognise real equipment, then play the complete subtitled animation.</p></div></div>
    <NcertManualLinks klass={klass} subject={subject} chapter={chapter} topic={topic}/>
    {!activity?<div className="rounded-2xl border bg-white p-6"><h3 className="font-semibold">A complete experiment procedure was not found for this topic</h3><p className="my-3 text-sm text-muted-foreground">Exercise questions are not shown as lab instructions. Upload or re-ingest the matching NCERT activity / laboratory-manual pages to build this guide.</p><p className="text-sm font-medium">Open the class-specific manual PDFs listed above.</p><a className="mt-3 block text-primary underline" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`NCERT ${topic} experiment OLabs`)}`} target="_blank" rel="noopener noreferrer">Search YouTube for this topic’s demonstrations</a></div>:<>
      {experiments.length>1&&<label className="block text-sm font-medium">Choose activity <select className="ml-2 max-w-full rounded-lg border bg-white p-2" value={selected} onChange={event=>{setSelected(Number(event.target.value));setChecked({});}}>{experiments.map((item,index)=><option key={index} value={index}>{item.name}</option>)}</select></label>}
      <article className="rounded-2xl border bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-semibold">{activity.name}</h3><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">{activity.procedure_source==='manual'?'NCERT manual supplement':'Matched textbook procedure'}</span></div>
        <p className="mt-3 text-sm"><strong>Goal:</strong> {activity.objective}</p>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><h4 className="mb-3 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={17}/> Apparatus checklist</h4><div className="flex flex-wrap gap-2">{activity.apparatus.length?activity.apparatus.map((tool,index)=><label key={index} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><input type="checkbox" checked={!!checked[tool]} onChange={event=>setChecked(current=>({...current,[tool]:event.target.checked}))}/>{tool}</label>):<p className="text-sm text-muted-foreground">Refer to the source passage for the apparatus list.</p>}</div></div>
        {activity.precautions?.length? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><strong>Before you begin</strong>{activity.precautions.map((line,index)=><p key={index} className="mt-1">{line}</p>)}</div>:null}
        <ol className="my-6 grid gap-4 md:grid-cols-2">{activity.steps.map((step,index)=><li key={index} className="rounded-xl border p-4"><div className="mb-3 flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index+1}</span><h4 className="font-semibold">{step.title}</h4></div><Frame activity={activity} step={index}/><p className="mt-3 text-sm leading-relaxed">{step.description}</p></li>)}</ol>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-cyan-50 p-4"><h4 className="mb-2 flex items-center gap-2 font-semibold text-sm"><Eye size={18}/> What to observe</h4><p className="text-sm leading-relaxed">{activity.observation}</p>{cues?.colour&&<span className="mt-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs"><span className="h-4 w-4 rounded-full border" style={{background:cues.colour}}/>{cues.colourName} • source-reported</span>}{cues?.odour&&<p className="mt-3 flex items-center gap-2 text-sm"><Wind size={19}/> Odour is described in the source. Do not inhale gases directly.</p>}</div><div className="rounded-xl bg-emerald-50 p-4"><h4 className="mb-2 font-semibold text-sm">Why it happens / conclusion</h4><p className="text-sm leading-relaxed">{activity.conclusion}</p></div></div>
        <details className="mt-4 rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Predict → observe → explain</summary><label className="mt-3 block text-sm">What do you expect to change?<textarea className="mt-2 w-full rounded border p-2" placeholder="Write your prediction, then compare it with the observation."/></label><p className="mt-2 text-sm text-muted-foreground">Which observation supports your conclusion? What would you keep constant when repeating the activity?</p></details>
        <details className="mt-4 border-t pt-4 text-sm"><summary className="cursor-pointer font-medium">Source and procedure evidence</summary><p className="mt-2 text-muted-foreground">{activity.procedure_source==='manual'?'This reviewed supplement is linked to the NCERT laboratory manual; it is not claimed to have been extracted from your uploaded chapter.':'Procedure steps are selected from one matched textbook activity. Missing results are labelled explicitly.'}</p>{activity.source_excerpt&&<p className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3">{activity.source_excerpt}</p>}<a className="mt-3 inline-flex items-center gap-2 text-primary underline" href={activity.source_url||NCERT_LABS} target="_blank" rel="noopener noreferrer"><BookOpen size={16}/>{activity.source_url?'Open matching NCERT manual':'NCERT manuals & recorded demonstrations'}</a></details>
      </article>
      <ExperimentPlayer key={`${selected}:${activity.name}`} activity={activity}/>
    </>}
    <ExperimentVideos klass={klass} subject={subject} chapter={chapter} topic={topic} activity={activity?.name}/>
  </section>;
}

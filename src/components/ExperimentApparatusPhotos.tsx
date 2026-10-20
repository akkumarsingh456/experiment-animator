import { useMemo, useState } from 'react';
import type { ExperimentActivity } from '@/lib/experiment-activities';
import { apparatusPhotos, type ApparatusPhoto } from '@/lib/experiment-photographs';

function ApparatusPhotoCard({photo}:{photo:ApparatusPhoto}) {
  const [failed,setFailed]=useState(false);
  return <figure className="overflow-hidden rounded-xl border bg-white">
    {failed?<div className="grid h-40 place-items-center p-4 text-sm text-muted-foreground">Photograph unavailable</div>:<a href={photo.file} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge ${photo.label}`}><img src={photo.file} alt={photo.label} loading="lazy" decoding="async" onError={()=>setFailed(true)} className="h-40 w-full bg-white object-contain p-3 transition hover:scale-105"/></a>}
    <figcaption className="border-t p-3"><p className="text-sm font-semibold">{photo.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Photo: {photo.author} · <a className="underline" href={photo.source} target="_blank" rel="noopener noreferrer">Source</a> · <a className="underline" href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></p></figcaption>
  </figure>;
}

/** Local, attributed photographs support recognition without blocking the animation. */
export function ExperimentApparatusPhotos({activity}:{activity:ExperimentActivity}) {
  const photos=useMemo(()=>apparatusPhotos(activity),[activity]);
  return <section className="mt-5 rounded-xl border bg-slate-50/60 p-4" aria-label="Real apparatus photographs">
    <h4 className="font-semibold">Recognise the real apparatus</h4>
    <p className="mt-1 text-sm text-muted-foreground">{photos.length?'Photographs of the listed apparatus or specimen. Tap a photograph to enlarge it. Models and scales may differ from your laboratory; follow the source procedure for connections and readings.':'An exact photograph is not available for the listed apparatus. Use the source manual for its appearance and setup.'}</p>
    {photos.length>0&&<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{photos.map(photo=><ApparatusPhotoCard key={`${activity.name}:${photo.id}`} photo={photo}/>)}</div>}
  </section>;
}

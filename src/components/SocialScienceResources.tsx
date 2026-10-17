import {useMemo,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Link} from "@tanstack/react-router";
import {listLibraryBooks,type LibraryBook} from "@/lib/library-books.functions";
import {signDownload} from "@/lib/ingest.functions";
import {SOCIAL_SCIENCE_CHAPTERS,socialBookSubject,socialTitle,socialChapterPart,socialKey} from "@/lib/social-science-chapters";

export function SocialScienceResources({klass,chapter}:{klass:string;chapter:string}){
 const library=useQuery<{books:LibraryBook[]}>({queryKey:["public-social-science-library"],queryFn:()=>listLibraryBooks(),staleTime:0,refetchOnWindowFocus:true});
 const [pending,setPending]=useState<string|null>(null),[error,setError]=useState("");
 const [ready,setReady]=useState<Record<string,string>>({});
 const matches=useMemo(()=>{
  const part=socialChapterPart(chapter),wanted=socialKey(socialTitle(chapter));
  const known=Object.values(SOCIAL_SCIENCE_CHAPTERS).flat().map(c=>socialKey(socialTitle(c.chapter)));
  const selected=(library.data?.books||[]).filter(book=>{
   if(String(book.class||"").replace(/[^0-9]/g,"")!==klass)return false;
   const name=socialKey(`${book.file_name} ${book.chapter||""}`),subject=socialBookSubject(book);
   const named=known.filter(title=>name.includes(title));
   if(!subject&&!named.length)return false;
   if(!chapter)return true;
   const volume=/contemporary india|contemporary world|democratic politics|understanding economic development|arthashas|arthik vikas|samkalin bharat|samkalin vishv|loktantrik/i.test(`${book.file_name} ${book.chapter||""}`.replace(/_/g," "));
   if(!volume&&named.length)return named.includes(wanted);
   return subject===part||subject==="Social Science";
  });
  const unique=new Map<string,typeof selected[number]>();
  for(const book of selected){const key=socialKey(book.file_name);const previous=unique.get(key);if(!previous||book.num_pages>previous.num_pages)unique.set(key,book);}
  return [...unique.values()];
 },[library.data,klass,chapter]);
 async function open(id:string,path:string){setPending(id);setError("");try{const {signedUrl}=await signDownload({data:{path}});setReady(value=>({...value,[id]:signedUrl}));}catch{setError("This PDF link could not be prepared. Please retry or open Uploaded books.");}finally{setPending(null);}}
 return <section className="social-source-panel sm:col-span-2" aria-label="Uploaded Social Science materials"><h3>Uploaded books & revision PDFs</h3><p>{klass==="9"?"Chapter names follow the older four-volume books in your library. Check your school’s prescribed edition; this is not the revised Class 9 curriculum.":"History, Geography, Democratic Politics and Economics. Exam coverage can differ from the full textbook."}</p>
 {library.isPending?<p role="status">Finding uploaded materials…</p>:library.isError?<p role="alert">The library could not be loaded. <button type="button" onClick={()=>void library.refetch()}>Retry</button></p>:<><p>{matches.length} matching PDF{matches.length===1?"":"s"}. Teacher notes and PDF presentations remain separate from NCERT-generated text.</p><div className="social-source-list">{matches.map(book=><article key={book.id}><div><strong>{book.file_name}</strong><small>{socialBookSubject(book)||"Chapter-matched PDF"} · {book.status||"Uploaded"}</small></div>{ready[book.id]?<a href={ready[book.id]} target="_blank" rel="noreferrer">Open PDF</a>:<button type="button" disabled={pending===book.id} onClick={()=>void open(book.id,book.storage_path)}>{pending===book.id?"Preparing link…":"Get PDF link"}</button>}</article>)}</div>{!matches.length&&<p>No matching saved PDF was found for this selection. Check Uploaded books for its filename, class and subject; files have not been removed.</p>}</>}
 {error&&<p role="alert">{error}</p>}<Link to="/history">Browse all uploaded books and notes</Link><button type="button" onClick={()=>{setReady({});void library.refetch();}} disabled={library.isFetching}>Refresh materials</button>
 </section>;
}

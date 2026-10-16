import {useState,type ReactNode} from "react";
import {useQuery,useQueryClient,useMutation} from "@tanstack/react-query";
import {BookOpen,MessageSquare,RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {listBookRequests,reviewBookRequest} from "@/lib/book-requests.functions";

function BookRequests(){
 const [page,setPage]=useState(0);
 const client=useQueryClient();
 const requests=useQuery({queryKey:["admin-book-requests",page],queryFn:()=>listBookRequests({data:{page}}),refetchInterval:30000});
 const review=useMutation({mutationFn:reviewBookRequest,onSuccess:()=>client.invalidateQueries({queryKey:["admin-book-requests"]})});
 return <section className="book-requests-panel" aria-labelledby="book-requests-title">
  <div className="book-requests-header"><div><h1 id="book-requests-title">Book requests</h1><p>Suggestions submitted through the website. Your email inbox stays separate.</p></div><Button variant="outline" disabled={requests.isFetching} onClick={()=>void requests.refetch()}><RefreshCw size={16}/>Refresh</Button></div>
  {requests.isPending?<p role="status">Loading requests…</p>:requests.isError?<p role="alert">{requests.error.message}</p>:<><p>{requests.data.total} request{requests.data.total===1?"":"s"}</p>{!requests.data.requests.length?<p>No requests on this page. New submissions will appear here.</p>:requests.data.requests.map(request=><article className="book-request-card" key={request.id}><header><div><h2>{request.requester_name}</h2><span>{request.verified_email}</span></div><span className="book-request-status">{request.status==="new"?"New":"Reviewed"}</span></header><time dateTime={request.created_at}>{new Date(request.created_at).toLocaleString()}</time><p className="book-request-message">{request.message}</p><Button variant="outline" disabled={review.isPending} onClick={()=>review.mutate({data:{id:request.id,status:request.status==="new"?"reviewed":"new"}})}>{request.status==="new"?"Mark reviewed":"Mark as new"}</Button></article>)}<div className="book-request-pagination"><Button variant="outline" disabled={page===0} onClick={()=>setPage(value=>value-1)}>Previous</Button><span>Page {page+1}</span><Button variant="outline" disabled={(page+1)*25>=requests.data.total} onClick={()=>setPage(value=>value+1)}>Next</Button></div></>}
  {review.isError&&<p role="alert">{review.error.message}</p>}
 </section>;
}

export function LibraryAdminDashboard({children}:{children:ReactNode}){
 const [section,setSection]=useState<"uploads"|"requests">("uploads");
 return <><nav className="library-admin-sections" aria-label="Administrator sections"><Button variant={section==="uploads"?"default":"outline"} aria-pressed={section==="uploads"} onClick={()=>setSection("uploads")}><BookOpen size={18}/>Upload books & notes</Button><Button variant={section==="requests"?"default":"outline"} aria-pressed={section==="requests"} onClick={()=>setSection("requests")}><MessageSquare size={18}/>Book requests</Button></nav><div hidden={section!=="uploads"}>{children}</div>{section==="requests"&&<BookRequests/>}</>;
}

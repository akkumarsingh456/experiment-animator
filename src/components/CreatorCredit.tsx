import {useState} from "react";
import {X} from "lucide-react";

/** Site owner credit, separate from platform/editor controls. */
export function CreatorCredit(){
 const [dismissed,setDismissed]=useState(false);
 if(dismissed)return null;
 return <aside className="creator-credit" aria-label="Website creator"><span className="creator-credit-monogram" aria-hidden="true">AK</span><span>Aman Kumar</span><button type="button" aria-label="Dismiss creator credit" onClick={()=>setDismissed(true)}><X size={14}/></button></aside>;
}

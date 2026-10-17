import { LESSON_REQUEST_TIMEOUT_MS, preparationClock } from "@/lib/generation-timing";
import {useEffect,useState} from "react";
import {BookOpen,Pause,Play} from "lucide-react";

type Motif = "matrix"|"charge"|"circuit"|"pendulum"|"optics"|"waves"|"field"|"measure"|"elements"|"molecule"|"flask"|"graph"|"geometry"|"stack"|"database"|"network"|"leaf"|"book";
function preparationTheme(subject:string,chapter:string):{subject:string;family:string;motif:Motif;label:string}{
 const s=subject.toLowerCase(), c=chapter.toLowerCase();
 const family=/chemistry/.test(s)?"chemistry":/physics/.test(s)?"physics":/math/.test(s)?"mathematics":/computer|informatics/.test(s)?"computing":/biology|botany|zoology/.test(s)?"biology" :/^science$/.test(s)?(/chemical|acid|metal|carbon|atom|molecule|periodic/.test(c)?"chemistry":/motion|force|work|energy|sound|light|electric|magnet|gravitation/.test(c)?"physics":/life|organism|reproduction|heredity|tissue|cell/.test(c)?"biology":"general"):"general";
 if(family==="physics"){
  if(/optic|light|ray/.test(c))return {subject:"Physics",family,motif:"optics",label:"Light & lenses"};
  if(/wave|sound/.test(c))return {subject:"Physics",family,motif:"waves",label:"Waves & oscillations"};
  if(/magnet/.test(c) && !/induction/.test(c))return {subject:"Physics",family,motif:"field",label:"Magnetic field sketch"};
  if(/electrostatic|electric charges|electric potential|capacitance/.test(c))return {subject:"Physics",family,motif:"charge",label:"Electric field study"};
  if(/current electricity|electricity|alternating current/.test(c))return {subject:"Physics",family,motif:"circuit",label:"Circuit notebook"};
  if(/oscillation/.test(c))return {subject:"Physics",family,motif:"pendulum",label:"Motion study"};
  return {subject:"Physics",family,motif:/units|measurement/.test(c)?"measure":"book",label:"Physics chapter notebook"};
 }
 if(family==="chemistry")return {subject:"Chemistry",family,motif:/block|periodic|classification of elements/.test(c)?"elements":"book",label:/block|periodic/.test(c)?"Elements notebook":/organic|carbon|compound|molecule/.test(c)?"Bonds & structures":"Laboratory notebook"};
 if(family==="mathematics")return {subject:"Mathematics",family,motif:/determinant|matrices|matrix/.test(c)?"matrix":/quadratic/.test(c)?"graph":"book",label:/determinant|matrices|matrix/.test(c)?"Rows & columns":"Mathematics chapter notebook"};
 if(family==="computing")return {subject:"Computer Science",family,motif:/sql|database/.test(c)?"database":/network/.test(c)?"network":/stack/.test(c)?"stack":"book",label:/sql|database/.test(c)?"Data & queries":/network/.test(c)?"Connections & systems":"Code & logic"};
 if(family==="biology")return {subject:"Biology",family,motif:/plant|photosynth|leaf/.test(c)?"leaf":"book",label:"Life science notebook"};
 return {subject:subject||"Your subject",family,motif:"book",label:"Chapter notebook"};
}

/** Authored editorial sketches; motion indicates waiting, never measured progress. */
function PreparationSketch({motif}:{motif:Motif}){
 return <svg viewBox="0 0 360 210" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
 {motif==="matrix"&&<><path d="M95 36H80V178H95 M265 36H280V178H265"/>{[0,1,2].flatMap(row=>[0,1,2].map(col=><text key={`${row}:${col}`} x={111+col*62} y={70+row*43}>a<tspan baselineShift="sub" fontSize="12">{row+1}{col+1}</tspan></text>))}<text x="108" y="207">Schematic · rows and columns</text></>}
 {motif==="charge"&&<><circle cx="180" cy="104" r="23" fill="var(--prep-soft)"/><text x="174" y="111">+</text>{[0,1,2,3,4,5,6,7].map(i=><g key={i} transform={`rotate(${i*45} 180 104)`}><path className="prep-draw" d="M213 104H273 M265 97L273 104L265 111"/></g>)}<text x="102" y="207">Positive charge · field direction</text></>}
 {motif==="circuit"&&<><path d="M52 65H115V51H212V79H115V65 M212 65H310V160H190 M168 160H52V65 M168 145V175 M190 151V169"/><circle className="prep-charge" cx="0" cy="0" r="5" fill="currentColor"/><text x="130" y="38">Resistor</text><text x="151" y="197">Cell</text></>}
 {motif==="pendulum"&&<><path d="M110 28H250 M180 28V174" strokeDasharray="4 7"/><g className="prep-pendulum"><path d="M180 28V160"/><circle cx="180" cy="173" r="15" fill="var(--prep-soft)"/></g><text x="128" y="15">Pivot</text><path d="M110 180Q180 216 250 180" strokeDasharray="3 7"/></>}
 {motif==="optics"&&<><path d="M25 108H335" strokeDasharray="4 7"/><path d="M180 30Q210 108 180 185Q150 108 180 30Z" fill="var(--prep-soft)"/><path className="prep-draw" d="M30 60H177L300 157 M30 156H177L300 60"/><text x="151" y="204">Lens</text></>}
 {motif==="waves"&&<><path d="M24 108H336" strokeDasharray="5 7"/><path className="prep-draw" d="M25 108Q64 15 103 108T181 108T259 108T337 108"/><text x="103" y="183">Wave sketch</text></>}
 {motif==="field"&&<><rect x="122" y="88" width="116" height="40" rx="4" fill="var(--prep-soft)"/><text x="140" y="114">N</text><text x="207" y="114">S</text>{[30,48,66].map(y=><path className="prep-draw" key={y} d={`M132 88C65 ${y-20} 290 ${y-20} 228 88 M132 128C65 ${230-y} 290 ${230-y} 228 128`}/>)}<text x="104" y="201">Bar magnet</text></>}
 {motif==="measure"&&<><path d="M48 65H312V125H48Z" fill="var(--prep-soft)"/>{Array.from({length:13},(_,i)=><path key={i} d={`M${60+i*20} 65v${i%5===0?35:20}`}/>)}<path className="prep-draw" d="M63 162H295 M63 154V170 M295 154V170"/><text x="109" y="198">Read. Measure. Relate.</text></>}
 {motif==="elements"&&<>{[{x:52,y:45,n:"24",s:"Cr"},{x:145,y:45,n:"29",s:"Cu"},{x:238,y:45,n:"26",s:"Fe"},{x:98,y:126,n:"58",s:"Ce"},{x:192,y:126,n:"64",s:"Gd"}].map((a,i)=><g className="prep-tile" key={a.s} style={{animationDelay:`${i*.35}s`}}><rect x={a.x} y={a.y} width="70" height="66" rx="4" fill="var(--prep-soft)"/><text x={a.x+8} y={a.y+18} className="prep-small">{a.n}</text><text x={a.x+21} y={a.y+48} className="prep-element">{a.s}</text></g>)}</>}
 {motif==="molecule"&&<g className="prep-molecule"><path d="M113 115L180 76L247 115 M180 76V34 M113 115V166 M247 115V166"/>{[[113,115],[180,76],[247,115],[180,34],[113,166],[247,166]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i<3?15:9} fill="var(--prep-soft)"/>)}<text x="86" y="203">Structure study · illustrative</text></g>}
 {motif==="flask"&&<><path d="M151 25H209 M157 25V80L108 162Q99 184 124 184H236Q261 184 252 162L203 80V25"/><path d="M130 137H230L249 169Q252 180 235 180H125Q108 180 112 169Z" fill="var(--prep-soft)"/>{[0,1,2].map(i=><circle key={i} className="prep-bubble" style={{animationDelay:`${i*.8}s`}} cx={163+i*17} cy="151" r="4"/>)}<text x="133" y="207">Lab sketch</text></>}
 {motif==="graph"&&<><path d="M40 164H320 M180 188V25"/>{[80,130,230,280].map(x=><path key={x} d={`M${x} 160v8`}/>)}<path className="prep-draw" d="M77 40Q180 290 283 40"/><text x="299" y="186">x</text><text x="192" y="35">y</text><text x="235" y="34">y = x²</text></>}
 {motif==="geometry"&&<><path className="prep-draw" d="M75 162V45L284 162Z"/><path d="M75 140H97V162" fill="var(--prep-soft)"/><text x="45" y="110">a</text><text x="167" y="189">b</text><text x="193" y="87">c</text><text x="151" y="32">a² + b² = c²</text></>}
 {motif==="stack"&&<><path d="M112 30V183H247V30"/>{[0,1,2].map(i=><g className="prep-tile" style={{animationDelay:`${i*.4}s`}} key={i}><rect x="122" y={45+i*43} width="115" height="35" rx="3" fill="var(--prep-soft)"/><text x="173" y={69+i*43}>{['C','B','A'][i]}</text></g>)}<path className="prep-draw" d="M282 40V100 M274 91L282 100L290 91"/><text x="112" y="206">Stack · last in, first out</text></>}
 {motif==="database"&&<><ellipse cx="180" cy="51" rx="85" ry="23" fill="var(--prep-soft)"/><path d="M95 51V159C95 192 265 192 265 159V51 M95 93C95 126 265 126 265 93 M95 132C95 165 265 165 265 132"/><path className="prep-draw" d="M290 102H333 M324 94L333 102L324 110"/><text x="130" y="207">Tables & queries</text></>}
 {motif==="network"&&<><path className="prep-draw" d="M180 104L70 48 M180 104L290 48 M180 104L70 167 M180 104L290 167"/>{[[180,104],[70,48],[290,48],[70,167],[290,167]].map(([x,y],i)=><rect key={i} x={x-20} y={y-15} width="40" height="30" rx="4" fill="var(--prep-soft)"/>)}<text x="119" y="207">Connected systems</text></>}
 {motif==="leaf"&&<><path className="prep-draw" d="M103 168Q67 52 253 36Q266 173 103 168Z" fill="var(--prep-soft)"/><path d="M83 190L231 58 M129 145L124 100 M160 116L204 119 M187 89L184 63"/><text x="153" y="203">Observe & connect</text></>}
 {motif==="book"&&<><path d="M180 58Q116 30 51 51V171Q116 150 180 178Q244 150 309 171V51Q244 30 180 58V178" fill="var(--prep-soft)"/>{[80,109,138].map(y=><path key={y} className="prep-draw" d={`M73 ${y}Q119 ${y-12} 157 ${y+3} M202 ${y+3}Q247 ${y-12} 285 ${y}`}/>)}</>}
 </g></svg>;
}

export function LessonPreparation({subject="",chapter="",topic="",startedAt}:{subject?:string;chapter?:string;topic?:string;startedAt:number}){
 const theme=preparationTheme(subject,chapter||topic);
 const [paused,setPaused]=useState(false);
 const [now,setNow]=useState(startedAt);
 const [online,setOnline]=useState(true);
 useEffect(()=>{
  const tick=()=>setNow(Date.now());
  const connection=()=>setOnline(navigator.onLine);
  tick();connection();
  const interval=window.setInterval(tick,1000);
  document.addEventListener("visibilitychange",tick);
  window.addEventListener("online",connection);
  window.addEventListener("offline",connection);
  return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",tick);window.removeEventListener("online",connection);window.removeEventListener("offline",connection);};
 },[startedAt]);
 const elapsed=Math.max(0,now-startedAt);
 const remaining=Math.max(0,LESSON_REQUEST_TIMEOUT_MS-elapsed);

 return <section className={`lesson-preparation prep-${theme.family}${paused?" prep-paused":""}`} aria-busy="true" aria-label="Lesson preparation">
  <div className="prep-illustration"><div className="prep-sketch-label">{theme.label}</div><PreparationSketch motif={theme.motif}/><span className="prep-sketch-foot">EDUPLAN / CHAPTER STUDY</span></div>
  <div className="prep-copy"><span className="prep-eyebrow">{theme.subject} · NCERT workspace</span><h2>Preparing your lesson<span className="prep-dots" aria-hidden="true">…</span></h2><p className="prep-topic">{topic||chapter||"Your selected chapter"}</p><p role="status" aria-live="polite">Your PPT and teacher notes are being prepared from the matching saved NCERT chapter.</p><div className="prep-timing" role="timer" aria-live="off" aria-label="Request timing"><div><span>Time elapsed</span><strong>{preparationClock(elapsed)}</strong></div><div><span>Time before timeout</span><strong>{preparationClock(Math.ceil(remaining/1000)*1000)}</strong></div></div><p className="prep-request-status" role="status">{!online?"Your device appears offline. Check your internet connection.":remaining===0?"The request time limit has been reached. Checking the result…":"Waiting for the server’s response. This timer shows the request limit, not an exact finishing time."}</p><div className="prep-materials"><BookOpen size={18}/><span>Notes · diagrams · classroom presentation</span></div><small>You can prepare and view lessons without signing in.</small></div>
  <button className="prep-motion-toggle" type="button" onClick={()=>setPaused(value=>!value)} aria-pressed={paused} aria-label={paused?"Resume decorative animation":"Pause decorative animation"}>{paused?<Play size={16}/>:<Pause size={16}/>}<span>{paused?"Resume animation":"Pause animation"}</span></button>
 </section>;
}

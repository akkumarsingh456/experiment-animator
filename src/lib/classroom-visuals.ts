import type {ConceptMapInput} from './source-concept-map';
import type {TopicDrawing} from './topic-science-visuals';
export function classroomDiscussionVisual(input:ConceptMapInput):TopicDrawing|null {
  const lines=(input.sections||[]).flatMap(section=>section.lines);
  const discussion=(input.sections||[]).some(section=>/classroom discussion|investigate and discuss/i.test(section.heading))
    || lines.length>0 && lines.filter(line=>/^\*\*(?:discussion|activity steps|activity outcome):/i.test(line)).length>=lines.length/2;
  if(!discussion)return null;
  const students=[[200,190,'#96c6d9'],[550,190,'#d9b3c8'],[200,380,'#9bc5a7'],[550,380,'#e9c58a']].map(([px,py,color])=>{
    const x=Number(px),y=Number(py);
    return `<circle cx="${x}" cy="${y-30}" r="27" fill="#edc6a8" stroke="#173d50" stroke-width="2"/><path d="M${x-27} ${y-40}Q${x} ${y-80} ${x+27} ${y-40}" fill="#36434b"/><path d="M${x-45} ${y+70}V${y+20}Q${x} ${y-8} ${x+45} ${y+20}V${y+70}Z" fill="${color}" stroke="#173d50" stroke-width="2"/><circle cx="${x-8}" cy="${y-30}" r="2" fill="#173d50"/><circle cx="${x+8}" cy="${y-30}" r="2" fill="#173d50"/><path d="M${x-8} ${y-18}Q${x} ${y-10} ${x+8} ${y-18}" fill="none" stroke="#173d50" stroke-width="2"/>`;
  }).join('');
  return {id:'classroom-group-discussion',caption:'Students share ideas, compare evidence and explain their reasoning together.',drawing:
    students+`<rect x="270" y="210" width="210" height="200" rx="30" fill="#f3dfbd" stroke="#247f91" stroke-width="3"/><path d="M330 270H375V340H330Z M375 270H420V340H375Z" fill="#fffef9" stroke="#247f91" stroke-width="2"/><path d="M340 285H365 M340 300H365 M385 285H410 M385 300H410" stroke="#a2b8c8" stroke-width="2"/><path d="M305 115H445Q460 115 460 135V170H400L380 190V170H305Q290 170 290 150V135Q290 115 305 115Z" fill="#e8f3f7" stroke="#247f91" stroke-width="2"/><circle cx="335" cy="143" r="5" fill="#247f91"/><circle cx="375" cy="143" r="5" fill="#247f91"/><circle cx="415" cy="143" r="5" fill="#247f91"/><text x="380" y="505" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#173d50">Share · Listen · Explain · Compare</text>`};
}

export function isKeyPointPage(input:ConceptMapInput):boolean {
  return (input.sections||[]).some(section=>/^key points?$/i.test(section.heading))
    || (input.sections||[]).flatMap(section=>section.lines).some(line=>/^\*\*(?:key point|important point):/i.test(line));
}

/** Brief visual labels, not replacements for the complete lesson sentences. */
export function keyPointIconCards(facts:string[]):string {
  const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
  return facts.slice(0,4).map((fact,index)=>{
    const x=index%2?415:70,y=index<2?115:305;
    const label=/series/i.test(fact)?'Series combination':/parallel/i.test(fact)?'Parallel combination':/direction.*field|field.*direction/i.test(fact)?'Electric field direction':/dielectric|polaris|polariz/i.test(fact)?'Dielectric response':/charge|capacitor/i.test(fact)?'Charge and capacitance':/potential|voltage/i.test(fact)?'Potential difference':/reaction/i.test(fact)?'Chemical reaction':/cell|organ/i.test(fact)?'Biological structure':fact.replace(/^\*\*[^*]+:\*\*\s*/,'').split(/\s+/).slice(0,5).join(' ');
    const icon=/charge|capacitor|potential|field/i.test(fact)?'<path d="M-23 -28V28 M23 -28V28 M-45 0H-23 M23 0H45" stroke="#247f91" stroke-width="5"/><text x="-35" y="-35" font-size="22">+</text><text x="25" y="-35" font-size="22">−</text>':/reaction|atom|molecul/i.test(fact)?'<path d="M-20 15L0 -20L25 15Z" fill="none" stroke="#247f91" stroke-width="4"/><circle cx="-20" cy="15" r="12" fill="#e9c58a"/><circle cx="0" cy="-20" r="12" fill="#9bc5a7"/><circle cx="25" cy="15" r="12" fill="#96c6d9"/>':/cell|organ|plant|life/i.test(fact)?'<ellipse rx="42" ry="27" fill="#d4e8d8" stroke="#247f91" stroke-width="3"/><circle r="12" fill="#d9b3c8"/>':'<path d="M0 -35L10 -10L36 -10L16 6L24 33L0 17L-24 33L-16 6L-36 -10L-10 -10Z" fill="#fff0a5" stroke="#247f91" stroke-width="3"/>';
    const short=label.length>30?label.slice(0,27)+'…':label;
    return `<rect x="${x}" y="${y}" width="275" height="165" rx="14" fill="${index%2?'#fff5e3':'#eaf5f4'}" stroke="#c3dce0"/><g transform="translate(${x+137} ${y+65})" fill="#173d50" font-family="Arial,sans-serif">${icon}</g><text x="${x+137}" y="${y+132}" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" fill="#173d50">${escape(short)}</text>`;
  }).join('');
}

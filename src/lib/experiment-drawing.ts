import type { ExperimentActivity } from './experiment-activities';

export function experimentCues(activity: ExperimentActivity) {
  const observation = activity.observation;
  const positive = observation.split(/[.;]|\bwhereas\b|\bbut\b/i).filter(line => !/\b(?:not|no|never|doesn.t)\b|\?/.test(line));
  const palette: Record<string, string> = { 'blue-black': '#20234e', 'brick-red': '#a63c25', 'reddish-brown': '#95452e', 'yellow': '#e9c22c', 'pink': '#ed79aa', 'purple': '#8b5aba', 'violet': '#8b5aba', 'green': '#429574', 'blue': '#3488bf', 'white': '#e8e8e8', 'brown': '#95683d', 'red': '#cc4d4d', 'orange': '#e69336' };
  const colours = Object.keys(palette).filter(colour => positive.some(line => new RegExp(`\\b${colour}\\b`, 'i').test(line) && /turn|becom|colour|color|precipitate|solution|region|deposit/i.test(line)));
  return { colour: colours[0] ? palette[colours[0]] : undefined, colourName: colours[0],
    gas: positive.some(line => /effervescence|bubbles|gas (?:is )?(?:evolved|released|produced)/i.test(line)),
    precipitate: positive.some(line => /precipitate|solid (?:is )?formed/i.test(line)),
    odour: /smell|odou?r|pungent|rotten egg|fruity/i.test(observation) && !/not stated|does not state|no (?:smell|odou?r)/i.test(observation) };
}

export function experimentKind(activity: ExperimentActivity) {
  if (activity.visual_kind) return activity.visual_kind;
  const text = `${activity.name} ${activity.apparatus.join(' ')} ${activity.steps.map(step => step.description).join(' ')}`;
  if (/ohm/i.test(text) && /resistor|resistance/i.test(text)) return 'circuit';
  if (/microscope|onion peel|cover slip/i.test(text)) return 'microscope';
  if (/test tube|beaker|reagent|litmus|solution|precipitate/i.test(text)) return 'chemistry';
  if (/coil/i.test(text) && /magnet/i.test(text)) return 'magnet';
  if (/lens|mirror|prism/i.test(text)) return 'optics';
  if (/pendulum|bob/i.test(text)) return 'pendulum';
  return 'apparatus';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines = 5) {
  const words=text.split(/\s+/),rows:string[]=[];let line='';
  for(const word of words){if(line&&ctx.measureText(`${line} ${word}`).width>width){rows.push(line);line=word;}else line=line?`${line} ${word}`:word;}
  if(line)rows.push(line);
  rows.slice(0,maxLines).forEach((row,index)=>{
    if(index===maxLines-1&&rows.length>maxLines){while(row.length&&ctx.measureText(`${row}…`).width>width)row=row.slice(0,-1);row+='…';}
    ctx.fillText(row,x,y+index*lineHeight);
  });
}

/** Locally drawn apparatus animation; labels/captions are included in video exports. */
export function drawExperiment(canvas: HTMLCanvasElement, activity: ExperimentActivity, scene: number, phase: number) {
  const c = canvas.getContext('2d'); if (!c) return;
  canvas.width = 1280; canvas.height = 720;
  const cues = experimentCues(activity), kind = experimentKind(activity);
  const result = scene >= activity.steps.length, setup = scene === 0 || /key.*open|open.*key/i.test(activity.steps[scene]?.description||'');
  const title = result ? 'Observe & explain' : activity.steps[scene]?.title || 'Prepare';
  const description = result ? activity.observation : activity.steps[scene]?.description || activity.objective;
  c.fillStyle = '#eff6fb'; c.fillRect(0, 0, 1280, 720);
  c.fillStyle = '#102b43'; c.fillRect(0, 0, 1280, 105);
  c.font = 'bold 27px sans-serif'; c.fillStyle = '#fff'; c.fillText(activity.name.length>85?`${activity.name.slice(0,82)}…`:activity.name,35,44);
  c.font = '17px sans-serif'; c.fillStyle = '#aee0ea'; c.fillText(`ANIMATED PROCEDURE  •  ${result ? 'RESULT' : `STEP ${scene + 1} / ${activity.steps.length}`}`, 35, 81);
  c.fillStyle = '#fff'; c.beginPath(); c.roundRect(28, 130, 805, 445, 22); c.fill();
  c.strokeStyle = '#237c91'; c.lineWidth = 5; c.fillStyle = '#237c91';
  const path = (points: number[][]) => { c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.stroke(); };
  const label = (text: string, x: number, y: number) => { c.font = '18px sans-serif'; c.fillStyle = '#193a50'; c.fillText(text, x, y); };
  const circle = (x: number,y: number,r: number,colour: string) => { c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fillStyle=colour; c.fill(); c.stroke(); };
  // A small offset shadow gives apparatus depth without implying a photorealistic lab.
  c.fillStyle = '#e7eef2'; c.beginPath(); c.ellipse(427, 510, 295, 20, 0, 0, Math.PI * 2); c.fill();
  if (kind === 'circuit') {
    path([[170,390],[130,390],[130,245],[620,245],[620,450],[170,450],[170,410]]);
    c.fillStyle='#fff'; c.fillRect(300,230,110,30); c.strokeRect(300,230,110,30); label('Resistor R',305,215);
    circle(510,245,30,'#e5f6fa'); label('A',503,252); label('Ammeter in series',465,187);
    path([[300,245],[300,340],[410,340],[410,245]]); circle(355,340,27,'#fff1d3'); label('V',348,347); label('Voltmeter across R',282,394);
    path([[170,373],[170,422]]); path([[185,386],[185,410]]); label('Low-voltage cells',86,494);
    c.clearRect(595,428,45,32); c.fillStyle='#fff'; c.fillRect(595,428,45,32);
    path(setup ? [[595,450],[635,425]] : [[595,450],[635,450]]); label(setup?'Key open':'Key closed briefly',526,492);
    if (!setup) for(let i=0;i<8;i++){const x=145+((i*57+phase*100)%455);circle(x,245,4,'#e59725');} // direction is conventional current in this schematic
    label('Illustrative circuit • meter readings come from the real experiment',85,548);
  } else if (kind === 'chemistry') {
    const observeAt=activity.steps.findIndex(step=>/observ|measur|compar|result|record/i.test(step.title));
    const observing=result||(observeAt>=0&&scene>=observeAt);
    const adding=!observing&&/add|drop|pour|mix/i.test(description);
    const preparing=scene===0;
    const transfer=!preparing&&!observing&&/sample|transfer|place|pipett/i.test(description);
    const progress=Math.min(1,phase/3);
    const reagentText=activity.apparatus.find(tool=>/ceric|reagent|iodine|bromine|indicator/i.test(tool))||'Source-specified reagent';
    const ceric=/ceric ammonium nitrate/i.test(`${activity.name} ${activity.apparatus.join(' ')} ${description}`);
    const reagentColour=ceric?'#ebc728':'#aac8d9';
    const tube=(x:number,y:number,fill:number,colour:string)=>{
      c.save();c.strokeStyle='#608a99';c.lineWidth=3;
      const glass=c.createLinearGradient(x,0,x+90,0);glass.addColorStop(0,'#c5dce580');glass.addColorStop(.3,'#ffffffcc');glass.addColorStop(.8,'#e1eff455');glass.addColorStop(1,'#8aafc099');
      c.beginPath();c.roundRect(x,y,90,230,[3,3,43,43]);c.fillStyle=glass;c.fill();
      c.save();c.clip();c.fillStyle=colour;c.fillRect(x+4,y+230-fill,82,fill);c.restore();c.stroke();
      c.beginPath();c.ellipse(x+45,y,48,8,0,0,Math.PI*2);c.stroke();
      c.strokeStyle='#ffffffb0';c.lineWidth=7;path([[x+14,y+18],[x+14,y+175]]);c.restore();
    };
    // Reference and sample are shown as the same sample before / after, not an
    // additional control tube unless the source procedure actually specifies one.
    c.fillStyle='#dae4e9';c.fillRect(95,470,650,14);
    tube(175,225,preparing?0:85,'#b8dbe9');
    label('Starting sample',137,526);
    const fill=preparing?0:transfer?85*progress:85;
    const colour=observing&&cues.colour?cues.colour:'#b8dbe9';
    tube(475,225,fill,colour);
    label(observing?'After the stated test':'Test sample',448,526);
    if(preparing){
      c.fillStyle='#81512e';c.fillRect(350,277,70,135);c.fillStyle='#233745';c.fillRect(365,250,40,28);
      c.fillStyle='#fff';c.fillRect(353,320,64,50);label('Sample',354,350);
      label('Prepare the solution specified in the source',115,190);
    } else if(adding||transfer){
      const x=520+Math.sin(phase*.8)*3;
      c.save();c.translate(x,180);c.rotate(.25);c.fillStyle='#263f53';c.beginPath();c.ellipse(0,-48,16,30,0,0,Math.PI*2);c.fill();
      c.fillStyle='#d4e9ef';c.strokeStyle='#7195a3';c.lineWidth=2;c.fillRect(-6,-20,12,58);c.strokeRect(-6,-20,12,58);c.restore();
      c.fillStyle=adding?reagentColour:'#a3d4e4';c.beginPath();c.ellipse(520,220+(phase%1)*105,5,8,0,0,Math.PI*2);c.fill();
      label(adding?'Add the stated drops':'Transfer the stated volume',405,166);
      c.font='16px sans-serif';wrap(c,adding?reagentText:description.match(/\d+(?:\.\d+)?\s*m[lL]/)?.[0]||'Use the source amount',590,240,180,24,3);
      path([[610,320],[580,350],[554,350]]);
    } else if(observing){
      c.strokeStyle='#e3a031';path([[295,335],[410,335],[395,323]]);
      label('Compare before → after',280,193);
      if(cues.colour){c.fillStyle=cues.colour;c.fillRect(620,285,30,30);label(cues.colourName||'',665,309);}
      if(cues.gas)for(let i=0;i<5;i++)circle(495+i%3*18,430-((phase*45+i*25)%90),4,'#fff');
      if(cues.odour){label('Odour: source-reported',565,380);label('Never inhale directly',565,408);}
      if(/record|compar/i.test(title)||result){c.fillStyle='#fff5d9';c.fillRect(605,425,170,55);c.font='16px sans-serif';c.fillStyle='#4f4225';c.fillText('Record observation',615,449);c.fillText('and conclusion',615,471);}
    }
    c.font='16px sans-serif';c.fillStyle='#325466';
    wrap(c,observing&&cues.colour?`Expected ${cues.colourName} response · reported by the source`:'Illustrated apparatus · liquid shading is not a measured result',100,560,680,22,1);
  } else if (kind === 'leaf') {
    c.beginPath();c.ellipse(400,345,185,97,-.35,0,Math.PI*2);c.fillStyle=result?'#20234e':'#65a877';c.fill();c.stroke();
    c.save();c.translate(400,345);c.rotate(-.35);c.fillStyle=result?'#c5b280':'#29333a';c.fillRect(-40,-95,80,190);c.restore();
    path([[220,410],[590,280]]);label(result?'Blue-black: starch detected':'Part of leaf exposed to light',440,220);
    label(result?'Covered area: starch not detected':'Opaque cover on both sides',140,490); label('Compare after iodine treatment • not to scale',145,540);
  } else if (kind === 'microscope') {
    path([[220,460],[410,460],[360,410],[360,270],[310,230],[340,200]]);path([[245,365],[410,365]]);
    c.strokeRect(310,220,55,80);c.fillStyle='#e0edf4';c.fillRect(260,345,130,12);label('Slide / specimen',190,510);label('Microscope',210,185);
    circle(600,340,115,'#f5edf8');
    if(/onion|plant cell/i.test(`${activity.name} ${activity.apparatus.join(' ')} ${description}`)) {
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){const x=530+col*48,y=280+row*43;c.strokeRect(x,y,43,38);circle(x+24,y+19,5,'#8c68a1');}
      label('Illustrative plant-cell view',492,510);
    } else label('Observe prepared specimen',490,510);
  } else if (kind === 'magnet') {
    const offset=setup?0:Math.sin(phase)*40;c.fillStyle='#df7777';c.fillRect(160+offset,300,85,65);c.fillStyle='#6e9ecb';c.fillRect(245+offset,300,85,65);label('N',190+offset,340);label('S',275+offset,340);
    for(let i=0;i<6;i++){c.beginPath();c.ellipse(440+i*18,335,17,70,0,0,Math.PI*2);c.stroke();}label('Coil',460,445);label('Magnet',195,445);label('Watch the relative motion described in the step',160,530);
  } else if (kind === 'optics') {
    const opticalText=`${activity.name} ${activity.apparatus.join(' ')}`;
    path([[150,360],[680,360]]);
    if(/prism/i.test(opticalText))path([[420,240],[350,440],[490,440],[420,240]]);
    else if(/mirror/i.test(opticalText)){c.beginPath();c.arc(280,350,150,-.8,.8);c.stroke();}
    else {c.beginPath();c.ellipse(420,360,20,120,0,0,Math.PI*2);c.stroke();}
    label(/prism/i.test(opticalText)?'Prism':/mirror/i.test(opticalText)?'Mirror':'Lens',375,205); label('Align apparatus as specified in the procedure',150,525);
    path([[200,360],[200,270]]);label('Object',172,400);path([[650,230],[650,470]]);label('Screen',620,510);
    // No invented focal length/image position or unsupported ray construction.
  } else if (kind === 'pendulum') {
    const a=setup?0:Math.sin(phase)*.35,x=410+Math.sin(a)*190,y=240+Math.cos(a)*190;
    path([[270,220],[550,220]]);path([[410,220],[x,y]]);circle(x,y,25,'#dfad51');label('Fixed support',340,185);label('Bob',x+35,y);label('Schematic motion • follow the source timing instructions',110,535);
  } else {
    const tools=activity.apparatus.length?activity.apparatus:['Matched textbook diagram'];
    tools.slice(0,8).forEach((tool,i)=>{const x=65+(i%3)*245,y=205+Math.floor(i/3)*105;c.fillStyle='#e9f3f6';c.beginPath();c.roundRect(x,y,220,80,12);c.fill();label(`${i+1}. ${tool}`,x+12,y+43);});
    label('Follow the source-specific setup; no unsupported model is substituted',62,548);
  }
  c.fillStyle='#10374f';c.font='bold 24px sans-serif';wrap(c,title,865,170,375,30,2);
  c.font='21px sans-serif';c.fillStyle='#294959';wrap(c,description,865,248,365,30,8);
  c.fillStyle='#e0eef3';c.fillRect(28,596,1224,99);c.fillStyle='#173b50';c.font='18px sans-serif';wrap(c,result?activity.conclusion:description,48,626,1170,25,3);
}

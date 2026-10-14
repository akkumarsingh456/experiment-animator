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
  const words = text.split(/\s+/); let line = '', row = 0;
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`).width > width && line) {
      ctx.fillText(line, x, y + row++ * lineHeight); line = word;
      if (row === maxLines - 1) break;
    } else line = line ? `${line} ${word}` : word;
  }
  ctx.fillText(row === maxLines - 1 ? `${line} …` : line, x, y + row * lineHeight);
}

/** Locally drawn apparatus animation; labels/captions are included in video exports. */
export function drawExperiment(canvas: HTMLCanvasElement, activity: ExperimentActivity, scene: number, phase: number) {
  const c = canvas.getContext('2d'); if (!c) return;
  canvas.width = 1280; canvas.height = 720;
  const cues = experimentCues(activity), kind = experimentKind(activity);
  const result = scene >= activity.steps.length, setup = scene === 0;
  const title = result ? 'Observe & explain' : activity.steps[scene]?.title || 'Prepare';
  const description = result ? activity.observation : activity.steps[scene]?.description || activity.objective;
  c.fillStyle = '#eff6fb'; c.fillRect(0, 0, 1280, 720);
  c.fillStyle = '#102b43'; c.fillRect(0, 0, 1280, 105);
  c.font = 'bold 27px sans-serif'; c.fillStyle = '#fff'; wrap(c, activity.name, 35, 44, 1180, 32, 1);
  c.font = '17px sans-serif'; c.fillStyle = '#aee0ea'; c.fillText(`SCHEMATIC ANIMATION  •  ${result ? 'RESULT' : `STEP ${scene + 1} / ${activity.steps.length}`}`, 35, 81);
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
    const x=320,y=225,w=100,h=240;
    const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#e2eef2');g.addColorStop(.4,'#fff');g.addColorStop(1,'#d5e4eb');
    c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,[0,0,48,48]);c.fill();c.stroke();
    c.save();c.beginPath();c.roundRect(x+5,y+5,w-10,h-10,[0,0,44,44]);c.clip();
    c.fillStyle=result&&cues.colour?cues.colour:'#d5dfe5';c.fillRect(x+5,y+125,w-10,120);
    if(result&&cues.precipitate){c.fillStyle=cues.colour||'#c3c6c9';c.fillRect(x,y+h-35,w,35);}
    if(result&&cues.gas)for(let i=0;i<7;i++){const yy=y+h-25-((phase*115+i*29)%190);circle(x+25+i%3*23,yy,5,'#fff');}
    c.restore();c.strokeStyle='#237c91';
    if(!result&&/add|drop|pour|mix/i.test(description)){path([[360,165],[390,190],[385,218]]);circle(382,225+phase%1*70,6,'#8eabb7');label('Reagent / dropper',430,185);}
    label('Test sample',320,503); label(result&&cues.colour?`Reported colour: ${cues.colourName}`:'Neutral shading • actual colour not assumed',110,545);
    if(result&&cues.odour){label('≋  Odour reported in source',480,305);label('Do not directly inhale gases',480,338);}
    if(result&&cues.precipitate)label('Solid deposit / precipitate',480,400);
    if(result&&cues.gas)label('Gas evolution',480,444);
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

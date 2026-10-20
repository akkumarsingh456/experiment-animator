import type { ExperimentActivity } from './experiment-activities';

/** Physical apparatus views, without invented measurements or optical results. */
export function drawBenchStage(c:CanvasRenderingContext2D,kind:string,activity:ExperimentActivity,scene:number,phase:number) {
  c.save();c.translate(28,130);
  const result=scene>=activity.steps.length, desc=activity.steps[scene]?.description||'';
  const text=(s:string,x:number,y:number,size=20)=>{c.font=`${size}px Arial`;c.fillStyle='#193a50';c.fillText(s,x,y);};
  const line=(p:number[][],colour='#527285',width=4)=>{c.beginPath();c.strokeStyle=colour;c.lineWidth=width;c.lineJoin='round';p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  const block=(x:number,y:number,w:number,h:number,colour:string)=>{c.fillStyle='#18354a15';c.beginPath();c.roundRect(x+4,y+6,w,h,8);c.fill();c.fillStyle=colour;c.beginPath();c.roundRect(x,y,w,h,8);c.fill();};
  const disc=(x:number,y:number,r:number,colour:string|CanvasGradient)=>{c.fillStyle=colour;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
  c.fillStyle='#f8fbfe';c.fillRect(0,0,805,445);block(25,345,755,17,'#d8c7ac');
  if(kind==='microscope'){
    text('Optical microscope and specimen slide',35,40,25);
    block(105,316,270,28,'#344d61');
    c.strokeStyle='#617c8f';c.lineWidth=32;c.beginPath();c.moveTo(302,320);c.bezierCurveTo(360,220,330,135,260,125);c.stroke();
    c.save();c.translate(237,98);c.rotate(.35);block(-18,0,36,106,'#375569');block(-23,-10,46,23,'#253c4c');block(-12,105,24,25,'#b8c7d2');c.restore();
    block(170,226,155,13,'#344d61');block(196,216,84,9,'#bfdce9');disc(241,220,7,'#a16d97');
    disc(320,200,19,'#263e51');disc(320,200,9,'#a9bac6');
    disc(245,290,23,'#d9e8ee');line([[230,273],[255,305]],'#8eacbc',2);
    text('Eyepiece',75,87);line([[175,92],[222,98]],'#91a8b7',2);
    text('Slide + cover slip',55,192,18);line([[180,197],[225,215]],'#91a8b7',2);
    text('Focus knob',355,184,18);line([[353,189],[338,200]],'#91a8b7',2);
    disc(590,205,108,'#e7eef4');disc(590,205,96,'#fcf7ee');
    if(/onion|plant cell/i.test(`${activity.name} ${activity.apparatus.join(' ')}`)){
      c.save();c.beginPath();c.arc(590,205,92,0,Math.PI*2);c.clip();
      for(let row=0;row<5;row++)for(let col=0;col<4;col++){const x=483+col*61+(row%2)*25,y=108+row*42;c.strokeStyle='#a37b9c';c.lineWidth=2;c.strokeRect(x,y,57,38);disc(x+30,y+20,4,'#8c638b');}c.restore();
      text('Illustrative plant cells',476,336,19);
    }else{text('View the specimen',505,193,18);text('through the eyepiece',500,223,18);}
    text('Prepare → mount → focus → observe',170,402,22);
  }else if(kind==='magnet'){
    text('Bar magnet moving relative to a coil',35,40,25);
    const moving=scene>0&&!result&&/move|bring|insert|withdraw|push|pull/i.test(desc);
    const offset=moving?Math.sin(phase)*48:0;
    block(95+offset,172,105,61,'#c65250');block(200+offset,172,105,61,'#4b7eaa');
    text('N',135+offset,211,26);text('S',239+offset,211,26);
    block(388,293,128,45,'#6a7d8b');line([[410,293],[410,253]],'#657b8a',8);
    for(let i=0;i<8;i++){c.beginPath();c.ellipse(393+i*13,202,17,66,0,0,Math.PI*2);c.strokeStyle='#bd7d3b';c.lineWidth=4;c.stroke();}
    text('Copper-wire coil',353,109);text('Bar magnet',128,283);
    text(moving?'Move as directed by the step':'Check the source for direction and connections',70,390,20);
    text('Motion is illustrative; use the stated detector and readings',70,427,18);
  }else if(kind==='optics'){
    text('Align the optical apparatus on a level bench',32,40,24);
    const optical=`${activity.name} ${activity.apparatus.join(' ')}`;
    const prism=/prism/i.test(optical),mirror=!prism&&/mirror/i.test(optical);
    line([[60,325],[750,325]],'#8fa3b1',8);
    c.setLineDash([7,7]);line([[60,217],[750,217]],'#b9c8d2',2);c.setLineDash([]);
    const stand=(x:number)=>{block(x-45,312,90,18,'#425b6c');line([[x,312],[x,268]],'#677d8b',6);};
    const hasScreen=activity.apparatus.some(tool=>/\bscreen\b/i.test(tool));
    const screenX=mirror?270:665;
    stand(140);stand(410);if(hasScreen)stand(screenX);
    block(127,222,26,48,'#e0b986');
    const candle=/candle/i.test(optical);if(candle){c.fillStyle='#eda83d';c.beginPath();c.ellipse(140,204,7,16,0,0,Math.PI*2);c.fill();}else line([[140,220],[140,153],[131,165],[140,153],[149,165]],'#c75d4f',4);
    if(prism){c.fillStyle='#c3e2ec99';c.strokeStyle='#6697ac';c.lineWidth=3;c.beginPath();c.moveTo(410,122);c.lineTo(350,268);c.lineTo(470,268);c.closePath();c.fill();c.stroke();}
    else if(mirror){c.strokeStyle='#99b2c2';c.lineWidth=10;c.beginPath();if(/convex mirror/i.test(optical))c.arc(540,208,145,Math.PI-.7,Math.PI+.7);else c.arc(280,208,145,-.7,.7);c.stroke();}
    else{
      c.fillStyle='#c3e2ec99';c.strokeStyle='#6a9ab0';c.lineWidth=3;c.beginPath();
      if(/concave lens/i.test(optical)){c.moveTo(388,115);c.quadraticCurveTo(415,205,388,295);c.lineTo(432,295);c.quadraticCurveTo(405,205,432,115);c.closePath();}
      else c.ellipse(410,205,18,90,0,0,Math.PI*2);
      c.fill();c.stroke();
    }
    if(hasScreen){block(screenX-46,129,92,140,'#e3e9ed');block(screenX-40,135,80,128,'#fffdf1');}
    text(candle?'Candle':'Object',100,365);text(prism?'Prism':mirror?'Mirror':'Lens',374,365);if(hasScreen)text('Screen',screenX-39,365);
    text('Representative setup · follow all source distances and parts',78,410,19);
  }else if(kind==='pendulum'){
    text('Retort stand, clamp, thread and pendulum bob',30,40,24);
    block(170,324,330,26,'#405b6b');line([[210,323],[210,85],[430,85]],'#748d9b',10);
    block(393,73,45,25,'#354d5e');
    const moving=scene>0&&!result&&/oscillat|release|swing|time|count/i.test(desc),angle=moving?Math.sin(phase*2)*.18:0;
    const x=415+Math.sin(angle)*215,y=96+Math.cos(angle)*215;
    line([[415,96],[x,y]],'#738a97',2);const g=c.createRadialGradient(x-7,y-7,2,x,y,24);g.addColorStop(0,'#fbdf94');g.addColorStop(1,'#ac7b29');disc(x,y,24,g);
    text('Clamp',465,96);text('Thread',470,195);text('Bob',x+34,y+6);
    text('Use small oscillations and the source timing method',90,407,20);
  }
  c.restore();
}

import type { ExperimentActivity } from './experiment-activities';

/** Apparatus-only Ohm's law stage. Readings are deliberately left to the real experiment. */
export function drawCircuitStage(c: CanvasRenderingContext2D, activity: ExperimentActivity, scene: number, phase: number) {
  c.save(); c.translate(28,130);
  c.fillStyle='#f8fbff';c.fillRect(0,0,805,445);
  const text=(s:string,x:number,y:number,size=20)=>{c.fillStyle='#18354a';c.font=`${size}px Arial`;c.fillText(s,x,y);};
  const wire=(p:number[][],colour='#25889c')=>{c.strokeStyle=colour;c.lineWidth=5;c.lineJoin='round';c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  const desc=activity.steps[scene]?.description||'';
  const compare=/tabulate|plot|ratios|slope/i.test(desc)||scene>=activity.steps.length;
  if(compare){
    text('Compare your recorded readings',40,48,26);
    c.fillStyle='#fff';c.fillRect(40,80,300,255);c.strokeStyle='#d2dfe9';c.lineWidth=2;c.strokeRect(40,80,300,255);
    text('Voltage V',58,115);text('Current I',205,115);
    for(let i=0;i<4;i++){wire([[40,135+i*50],[340,135+i*50]],'#dbe6ee');text(i===0?'V₁':i===1?'V₂':i===2?'V₃':'…',80,168+i*50);text(i===0?'I₁':i===1?'I₂':i===2?'I₃':'…',245,168+i*50);}
    wire([[440,100],[440,330],[740,330]],'#456478');text('V',415,90);text('I',755,338);
    c.setLineDash([8,7]);wire([[440,330],[705,130]],'#218e83');c.setLineDash([]);
    text('Expected relationship',465,365,19);text('V = IR   ·   slope = R',465,400,24);
    text('Symbolic table · schematic graph, not measured data',40,435,18);
  }else{
    const closed=/close.*key|read.*voltage/i.test(desc)&&(!/then.*open/i.test(desc)||phase<4);
    text(scene===0?'Check ranges, zero and least count':scene===1?'Connect in series; measure across R':closed?'Close the key only briefly':'Open the key between readings',28,40,24);
    wire([[95,300],[55,300],[55,125],[250,125]]);
    wire([[355,125],[460,125]]);wire([[590,125],[735,125],[735,315],[660,315]]);
    wire([[595,315],[165,315]]);
    c.fillStyle='#fff3d8';c.strokeStyle='#b88a37';c.lineWidth=3;c.beginPath();c.roundRect(250,103,105,44,8);c.fill();c.stroke();text('R',293,132,24);text('Resistor',259,83);
    wire([[250,125],[220,125],[220,230],[348,230]],'#c38a28');wire([[478,230],[510,230],[510,170],[355,170],[355,125]],'#c38a28');
    const meter=(x:number,y:number,name:string,unit:string,colour:string)=>{
      c.fillStyle='#fff';c.strokeStyle=colour;c.lineWidth=3;c.beginPath();c.roundRect(x,y,130,91,13);c.fill();c.stroke();
      c.beginPath();c.arc(x+65,y+65,44,Math.PI*1.12,Math.PI*1.88);c.stroke();
      for(let i=0;i<7;i++){const a=Math.PI*(1.12+i*.76/6);wire([[x+65+Math.cos(a)*39,y+65+Math.sin(a)*39],[x+65+Math.cos(a)*44,y+65+Math.sin(a)*44]],colour);}
      // No fabricated numerical reading; a needle is shown only at rest.
      if(!closed)wire([[x+65,y+65],[x+27,y+48]],'#20374a');else text('read',x+43,y+67,17);
      text(unit,x+58,y+86,20);text(name,x+8,unit==='V'?y+118:y-12,20);
    };
    meter(460,79,'Ammeter','A','#25889c');meter(348,185,'Voltmeter','V','#c38a28');
    c.fillStyle='#dceaf2';c.strokeStyle='#526e80';c.lineWidth=2;c.beginPath();c.roundRect(95,277,70,72,10);c.fill();c.stroke();
    text('+',103,300,22);text('−',142,300,22);text('Cells',103,333,18);
    c.fillStyle='#e6eef4';c.beginPath();c.roundRect(575,294,105,42,9);c.fill();
    wire(closed?[[595,315],[660,315]]:[[595,315],[650,282]],closed?'#208678':'#d18b32');
    text(closed?'Key closed':'Key open',575,369,21);
    text('+',236,216,18);text('−',483,216,18);text('+',444,125,18);
    if(closed){for(let i=0;i<5;i++){const x=65+(phase*70+i*35)%175;c.fillStyle='#efb439';c.beginPath();c.arc(x,125,4,0,Math.PI*2);c.fill();}}
    text('A in series',65,400,21);text('V in parallel across R',310,400,21);
    text('Illustrative apparatus · use actual meter readings',130,433,18);
  }
  c.restore();
}

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
    // Wires terminate at visible binding posts on the bench apparatus.
    const terminal=(x:number,y:number,positive:boolean)=>{
      c.fillStyle=positive?'#d64943':'#273846';c.strokeStyle='#fff';c.lineWidth=2;
      c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#c6d2db';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();
    };
    const body=(x:number,y:number,w:number,h:number,colour:string)=>{
      c.fillStyle='#15354a18';c.beginPath();c.roundRect(x+5,y+7,w,h,12);c.fill();
      const gradient=c.createLinearGradient(x,y,x,y+h);gradient.addColorStop(0,colour);gradient.addColorStop(1,'#263b4b');
      c.fillStyle=gradient;c.beginPath();c.roundRect(x,y,w,h,12);c.fill();
    };
    // Warm bench surface makes the physical arrangement distinct from a circuit symbol.
    c.fillStyle='#edf0ec';c.beginPath();c.roundRect(20,65,765,315,18);c.fill();
    wire([[105,293],[55,293],[55,145],[235,145]],'#cf504b');
    wire([[365,145],[430,145],[430,206],[482,206]],'#cf504b');
    wire([[568,206],[740,206],[740,325],[680,325]],'#364d60');
    wire([[590,325],[171,325],[171,293]],'#364d60');
    wire([[235,145],[210,145],[210,305],[344,305]],'#db9d32');
    wire([[430,145],[415,145],[415,220],[470,220],[470,305],[430,305]],'#db9d32');
    body(226,105,148,71,'#a17b51');
    c.strokeStyle='#e6c68d';c.lineWidth=7;
    c.beginPath();for(let i=0;i<13;i++){const x=250+i*8;i?c.lineTo(x,132+(i%2)*21):c.moveTo(x,132);}c.stroke();
    terminal(235,145,true);terminal(365,145,false);text('Resistance wire / resistor R',198,92,19);
    const meter=(x:number,y:number,name:string,unit:string)=>{
      body(x,y,154,132,'#597184');
      c.fillStyle='#fffbed';c.beginPath();c.roundRect(x+10,y+10,134,86,8);c.fill();
      c.strokeStyle='#52616b';c.lineWidth=2;c.beginPath();c.arc(x+77,y+78,51,Math.PI*1.12,Math.PI*1.88);c.stroke();
      for(let i=0;i<9;i++){const angle=Math.PI*(1.12+i*.76/8);wire([[x+77+Math.cos(angle)*45,y+78+Math.sin(angle)*45],[x+77+Math.cos(angle)*51,y+78+Math.sin(angle)*51]],'#667681');}
      const angle=Math.PI*(closed?1.4+.12*Math.min(1,phase/2):1.12);
      wire([[x+77,y+78],[x+77+Math.cos(angle)*45,y+78+Math.sin(angle)*45]],'#bd4f40');
      text(unit,x+70,y+91,22);
      terminal(x+34,y+116,true);terminal(x+120,y+116,false);
      text('+',x+15,y+122,17);text('−',x+130,y+122,17);
      text(name,x+17,unit==='V'?y+160:y-12,20);
    };
    meter(448,90,'Ammeter','A');meter(310,189,'Voltmeter','V');
    body(83,251,110,85,'#6c8190');
    for(let i=0;i<2;i++){
      const x=100+i*43;c.fillStyle='#c79856';c.beginPath();c.roundRect(x,264,28,49,5);c.fill();
      c.fillStyle='#dbe2e6';c.fillRect(x+2,265,24,13);c.fillStyle='#677785';c.fillRect(x+9,260,10,5);
    }
    terminal(105,293,true);terminal(171,293,false);text('Low-voltage cells',64,363,19);
    body(570,292,130,54,'#9c7959');terminal(590,325,false);terminal(680,325,false);
    // Brass lever rotates down to bridge the two posts when the key is closed.
    const closeProgress=closed?Math.min(1,phase*2):0;
    wire([[590,325],[680,280+45*closeProgress]],'#ddb15f');
    c.fillStyle='#273846';c.beginPath();c.arc(680,280+45*closeProgress,8,0,Math.PI*2);c.fill();
    text(closed?'Key: closed briefly':'Key: open',560,371,19);
    if(closed){
      c.fillStyle='#1d7e6e';c.beginPath();c.arc(717,89,6,0,Math.PI*2);c.fill();text('Reading',635,96,18);
    }
    text('A in series',65,400,21);text('V in parallel across R',310,400,21);
    text('Illustrative needle movement · record actual readings',130,433,18);
  }
  c.restore();
}

import type { ConceptMapInput } from '@/lib/source-concept-map';
import { plainMathText } from '@/lib/latex-notation';
import { additionalTopicDrawing } from '@/lib/chapter-topic-diagrams';
import {classroomDiscussionVisual} from '@/lib/classroom-visuals';
import { currentElectricityDiagram } from '@/lib/current-electricity-diagrams';

export type TopicDrawing = { id: string; caption: string; drawing: string };
const ink = '#173d50', teal = '#247f91', orange = '#d97842';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const t = (x: number,y: number,text: string,size=23,color=ink) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" fill="${color}">${esc(text)}</text>`;
const line = (x1:number,y1:number,x2:number,y2:number,color=ink,arrow=false) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="4"${arrow?' marker-end="url(#tip)"':''}/>`;
const circle = (x:number,y:number,r:number,label='',fill='#e5f4f5') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${teal}" stroke-width="3"/>${label?t(x,y+7,label):''}`;
const box = (x:number,y:number,w:number,h:number,fill='#e5f4f5') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${teal}" stroke-width="3"/>`;
const axes = (xLabel:string,yLabel:string) => line(135,415,655,415,ink,true)+line(135,415,135,110,ink,true)+t(580,455,xLabel,22)+t(175,85,yLabel,22);
const graph = (path:string,xLabel:string,yLabel:string,caption:string) => ({drawing:axes(xLabel,yLabel)+`<path d="${path}" fill="none" stroke="${orange}" stroke-width="6"/>`+t(390,505,caption,19),caption});
const ions = () => circle(240,315,20,'+', '#fff0d8')+circle(310,360,20,'−')+circle(440,330,20,'+')+circle(530,370,20,'−');
const electrodeCell = (galvanic:boolean) => {
 const left=130,right=440;
 let s=box(left,250,185,180)+box(right,250,185,180)+box(205,205,26,170,'#aab8bf')+box(525,205,26,170,'#bd8c65');
 s+=`<path d="M220 205V140H540V205" fill="none" stroke="${ink}" stroke-width="4"/>`;
 s+=line(290,140,460,140,orange,true)+t(375,115,galvanic?'Electrons: Zn → Cu':'External power supply',22);
 if(galvanic){s+=`<path d="M285 290V220Q375 165 465 220V290" fill="none" stroke="${teal}" stroke-width="13"/>`+t(375,192,'Salt bridge',20);s+=t(219,190,'Zn',23)+t(539,190,'Cu',23)+t(220,465,'Anode (−): oxidation',20)+t(545,465,'Cathode (+): reduction',20)+t(220,325,'Zn²⁺',25)+t(540,325,'Cu²⁺',25)+t(380,507,'Daniell cell: chemical energy → electrical energy',19);}
 else{s+=box(320,115,110,52,'#fff0d8')+t(375,150,'DC supply',19)+t(220,465,'Anode (+)',22)+t(540,465,'Cathode (−)',22)+t(375,505,'Electrical energy drives a chemical reaction',20);}
 return s;
};
const benzene = (label:string) => {
 const pts=[[375,180],[465,230],[465,330],[375,380],[285,330],[285,230]];
 return `<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="#edf7f5" stroke="${ink}" stroke-width="5"/>`+circle(375,280,58,'','none')+line(375,180,375,120)+t(375,98,label,27)+t(375,470,'Aromatic ring: delocalised π electrons',21);
};

/** Topic selection is shared by all lesson views and exports. No copied paragraphs. */
export function topicScienceDrawing(input: ConceptMapInput, subject=''): TopicDrawing | null {
 if(/^science$/i.test(subject)){
  const discipline=input.chapter?.match(/\((Physics|Chemistry|Biology)\)/i)?.[1];
  if(discipline)return topicScienceDrawing(input,discipline);
 }
 const classroom=classroomDiscussionVisual(input);
 if(classroom)return classroom;
 if(/electric flux/i.test(input.title) && /^(physics|science)$/i.test(subject))return additionalTopicDrawing('Electric flux','Physics');
 const displayed=(input.sections||[]).filter(section=>section.kind!=='diagram' && !/^Reference notes/i.test(section.heading)).flatMap(section=>section.lines)
   .filter(line=>!/^\*\*(?:learning objective|prerequisite|exit ticket|practice|answer|activity|support practice|core practice|challenge practice)/i.test(line));
 // Paginated slides share their parent title and key terms, but their visible
 // notes differ. Resolve the actual page before those shared parent fields.
 if(displayed.length){
   const pageModels=displayed.map(line=>topicDrawingByTitle(plainMathText(line).slice(0,220),subject)).filter((model):model is TopicDrawing=>!!model);
   const pageUnique=new Map(pageModels.map(model=>[model.id,model]));
   if(pageUnique.size===1)return [...pageUnique.values()][0];
   return null;
 }
 const direct=topicDrawingByTitle(input.title,subject);
 if(direct)return direct;
 // A generic title must retain its chapter context in every render/export.
 // Key terms resolve a topic before falling back to a labelled chapter model.
 const candidates=(input.keyTerms||[]).map(term=>topicDrawingByTitle(term.term,subject)).filter((drawing):drawing is TopicDrawing=>!!drawing);
 const unique=new Map(candidates.map(drawing=>[drawing.id,drawing]));
 if(unique.size===1)return [...unique.values()][0];
 const evidence=[...(input.notes||[]),...(input.bullets||[]),...(input.sections||[]).filter(section=>!/^Reference notes/i.test(section.heading)).flatMap(section=>section.lines)].slice(0,4);
 const models=evidence.map(line=>topicDrawingByTitle(plainMathText(line).slice(0,180),subject)).filter((drawing):drawing is TopicDrawing=>!!drawing);
 const distinct=new Map(models.map(drawing=>[drawing.id,drawing]));
 if(distinct.size===1)return [...distinct.values()][0];
 if(!displayed.length && input.chapter){const chapter=topicDrawingByTitle(input.chapter,subject);if(chapter)return {...chapter,caption:`Chapter overview: ${chapter.caption}`};}
 return null;
}

function topicDrawingByTitle(heading:string, subject:string): TopicDrawing | null {
 if(/^(physics|science)$/i.test(subject) && !/alternating|magnet|capacitor|capacitance/i.test(heading) && /ohm|wheatstone|kirchhoff|drift|mobility|resist|series|parallel|current/i.test(heading)) {
  const current=currentElectricityDiagram(heading);
  if(current)return {id:'current-electricity',...current};
 }
 const title=heading.toLowerCase();
 const match=(pattern:RegExp)=>pattern.test(title);
 const mixed=/^science$/i.test(subject);
 const chem=/chem/i.test(subject) || mixed && /chemistry|atom|molecul|chemical|acid|metal|carbon|solution/.test(title), bio=/bio|botan|zoolog/i.test(subject) || mixed && /biology|life|cell|tissue|organism|animal|plant|kingdom|photosynth|respirat|inheritance|reproduct|heredit|environment/.test(title), phys=/phys/i.test(subject) || mixed && !chem && !bio;
 const specific=additionalTopicDrawing(heading,mixed ? bio ? 'Biology' : chem ? 'Chemistry' : 'Physics' : subject);
 if(specific)return specific;
 if(chem){
  if(match(/galvanic|daniell|electrochem/))return {id:'galvanic-cell',caption:'Daniell cell: zinc oxidises at the negative anode; copper ions reduce at the positive cathode. Electrons travel through the external wire.',drawing:electrodeCell(true)};
  if(match(/electrolys|faraday/))return {id:'electrolytic-cell',caption:'Electrolytic cell polarity differs from a galvanic cell. Oxidation remains at the anode and reduction at the cathode.',drawing:electrodeCell(false)};
  if(match(/nernst|cell potential/))return {id:'nernst-graph',...graph('M150 170L625 370','ln Q','Ecell','Fixed T and n; slope = −RT/(nF)')};
  if(match(/electrolytic conduct|molar conduct|conductivity cell|kohlrausch/))return {id:'conductivity-cell',caption:'Electrolyte ions carry charge between electrodes. Electrode separation l and cross-sectional area A define the cell constant l/A.',drawing:box(110,220,550,215)+box(175,195,24,205,'#9baeb7')+box(570,195,24,205,'#9baeb7')+ions()+line(210,160,558,160,orange,true)+line(558,160,210,160,orange,true)+t(380,135,'Electrode separation l',22)+t(130,195,'Area A',20)+line(300,315,340,315,orange,true)+line(470,370,425,370,teal,true)+t(380,475,'Cations and anions move in opposite directions',20)};
  if(match(/batter|fuel cell/))return {id:'battery-types',caption:'Primary cells are used once; secondary cells can be recharged. Fuel cells require continuing supplies of fuel and oxidant.',drawing:box(95,175,180,200)+box(290,175,180,200,'#fff0d8')+box(485,175,180,200)+t(185,215,'Primary',24)+t(380,215,'Secondary',24)+t(575,215,'Fuel cell',24)+t(185,275,'Discharge',21)+t(380,270,'Discharge',21)+t(380,310,'↔ Recharge',21)+line(490,280,555,280,orange,true)+line(600,280,660,280,teal,true)+t(575,345,'Continuous feed',18)+t(380,455,'Chemical energy → electrical energy',24)};
  if(match(/corrosion/))return {id:'corrosion',caption:'Under a water droplet on iron, anodic dissolution supplies electrons to cathodic oxygen reduction. The diagram shows the local electrochemical process.',drawing:box(110,355,540,45,'#b3c1c9')+`<path d="M180 355Q375 85 570 355Z" fill="#dceff6" stroke="${teal}" stroke-width="4"/>`+t(375,215,'Water + dissolved O₂',23)+line(210,375,540,375,orange,true)+t(375,440,'Electron flow through iron',22)+t(230,325,'Fe → Fe²⁺ + 2e⁻',20)+t(520,310,'O₂ reduction',20)+t(375,495,'Iron surface',23)};
  if(match(/reaction rate|reaction kinetic|rate of reaction|rate constant|order of reaction|arrhenius/))return {id:'reaction-rate',...graph('M150 145C260 270 345 375 625 397','Time','Reactant concentration','Qualitative decrease as reactant is consumed')};
  if(match(/equilibrium|le chatelier/))return {id:'chemical-equilibrium',caption:'At dynamic equilibrium, forward and reverse reactions continue at equal rates; concentrations remain constant.',drawing:box(90,170,230,160)+box(440,170,230,160,'#fff0d8')+t(205,235,'Reactants',26)+t(555,235,'Products',26)+line(315,220,445,220,orange,true)+line(445,280,315,280,teal,true)+t(380,390,'Forward rate = reverse rate',25)+t(380,450,'Dynamic equilibrium',25)};
  if(match(/thermodynam|enthalpy|gibbs|entropy/))return {id:'energy-transfer',caption:'Heat and work transfer energy between a thermodynamic system and its surroundings.',drawing:box(220,170,320,200)+t(380,265,'System',35)+line(95,230,210,230,orange,true)+t(120,205,'Heat q',22)+line(548,285,680,285,teal,true)+t(625,255,'Work',22)+t(380,430,'Surroundings',27)+t(380,488,'Specify the sign convention in the formula',19)};
  if(match(/haloaren|benzene|phenol|aromatic/))return {id:'aromatic-ring',caption:'Schematic aromatic ring; the circle denotes delocalised π electrons.',drawing:benzene(match(/phenol/)?'OH':match(/haloaren/)?'X':'H')};
  if(match(/nucleophilic|haloalkane/))return {id:'substitution',caption:'A nucleophile replaces a leaving group. R denotes the organic group and X the leaving group; actual reagents and conditions belong to the source notes.',drawing:t(220,265,'R—X',38)+t(95,265,'Nu⁻ +',30)+line(300,255,450,255,orange,true)+t(545,265,'R—Nu + X⁻',32)+t(380,340,'Substitution',28)+circle(220,150,35,'X')+circle(540,150,35,'Nu')+t(380,460,'Bond breaking and bond formation',24)};
  if(match(/solution|molar|molal|colligative|solubility|raoult|henry|vapour/))return {id:'solution-particles',caption:'Solute particles are dispersed in a solvent. This schematic is not to molecular scale.',drawing:box(180,175,400,265)+[ [240,235],[320,325],[450,255],[505,365],[405,385] ].map(([x,y])=>circle(x,y,18,'','white')).join('')+[ [300,240],[425,320],[530,230] ].map(([x,y])=>circle(x,y,24,'',' #f5c69c')).join('')+circle(230,480,13,'','white')+t(305,488,'Solvent',22)+circle(465,480,16,'','#f5c69c')+t(535,488,'Solute',22)};
  if(match(/atomic structure|chemical bonding|bohr model/))return {id:'atomic-bonding',caption:'Conceptual atom and shared-electron bond icons. Orbital shape and energy depend on the specific model described in the notes.',drawing:circle(220,280,55,'Nucleus')+`<ellipse cx="220" cy="280" rx="130" ry="90" fill="none" stroke="${teal}" stroke-width="4"/>`+circle(350,280,12,'','#f5c69c')+circle(490,270,48,'A')+circle(615,270,48,'B')+line(539,262,566,262)+line(539,280,566,280)+t(220,445,'Atomic structure',23)+t(555,445,'Chemical bond',23)};
 }
 if(phys){
  if(match(/coulomb|electric charge|electric field|gauss|electric flux/) && !match(/capacitor|capacitance/))return {id:'electric-field',caption:'Field lines point away from a positive charge and toward a negative charge. These schematic lines show direction, not a literal trajectory of every charge.',drawing:circle(240,265,45,'+')+circle(520,265,45,'−')+line(295,265,465,265,orange,true)+`<path d="M255 218Q380 90 505 218M255 312Q380 440 505 312" fill="none" stroke="${teal}" stroke-width="4" marker-end="url(#tip)"/>`+line(145,265,80,265,teal,true)+line(680,265,570,265,teal,true)+t(380,470,'Electric field: positive → negative',24)};
  if(match(/parallel[ -]plate/))return {id:'parallel-capacitor',caption:'Oppositely charged parallel plates create an approximately uniform field away from the edges.',drawing:box(225,125,20,290,'#eac79b')+box(515,125,20,290,'#c1dce6')+[170,250,330].map(y=>t(205,y,'+',28)+t(560,y,'−',28)+line(270,y,495,y,teal,true)).join('')+line(250,450,510,450,orange,true)+t(380,490,'Plate separation d',23)+t(380,80,'Area of each plate A',23)};
  if(match(/magnet|ampere|biot|lorentz|induction|faraday|alternating|transformer/))return {id:'magnetic-induction',caption:'A magnet and conducting coil are central to induction. An EMF is induced when magnetic flux linked with the coil changes.',drawing:box(90,220,220,95,'#e7bba0')+t(150,277,'N',35)+t(255,277,'S',35)+line(330,265,430,265,orange,true)+[460,490,520,550,580].map(x=>`<ellipse cx="${x}" cy="265" rx="28" ry="100" fill="none" stroke="${teal}" stroke-width="4"/>`).join('')+t(525,430,'Conducting coil',23)+t(205,430,'Magnet',23)};
  if(match(/optic|lens|refraction|snell|mirror/))return {id:'refraction',caption:'Refraction at an interface: angles are measured from the normal. The drawn bend is illustrative; direction depends on the refractive indices.',drawing:box(85,265,590,155)+line(90,265,670,265)+`<path d="M380 100V450" stroke="${ink}" stroke-width="2" stroke-dasharray="8 8"/>`+line(170,100,380,265,orange,true)+line(380,265,485,420,teal,true)+t(535,180,'Medium 1',23)+t(535,350,'Medium 2',23)+t(410,112,'Normal',21)+t(292,180,'i',28)+t(435,320,'r',28)};
  if(match(/wave|oscillat|harmonic|sound|interference/))return {id:'wave',caption:'Schematic periodic wave. Amplitude is measured from the equilibrium line and wavelength between corresponding points.',drawing:line(85,280,675,280)+`<path d="M90 280C140 90 190 90 240 280S340 470 390 280S490 90 540 280S640 470 675 280" fill="none" stroke="${teal}" stroke-width="5"/>`+line(163,105,462,105,orange,true)+t(310,80,'Wavelength λ',24)+line(240,280,240,140,orange,true)+t(290,210,'Amplitude',21)+t(380,490,'Equilibrium line',23)};
  if(match(/heat|thermal|thermodynam|kinetic theory|gas/))return {id:'heat-transfer',caption:'Heat flows spontaneously from higher to lower temperature. Temperature, heat and internal energy are distinct quantities.',drawing:box(95,170,220,190,'#f5cfaa')+box(445,170,220,190,'#d3e9f3')+t(205,260,'Hot body',26)+t(555,260,'Cold body',26)+line(330,270,430,270,orange,true)+t(380,325,'Heat',23)+t(380,465,'Higher T → lower T',25)};
  if(match(/atom|nuclear|nuclei|photoelectric|dual nature|semiconductor/))return {id:'energy-levels',caption:'Discrete energy levels and transitions. The diagram is schematic; actual spacings and selection rules depend on the system.',drawing:line(170,360,575,360)+line(170,245,575,245)+line(170,140,575,140)+line(320,355,320,150,orange,true)+line(445,150,445,355,teal,true)+t(625,150,'E₃',25)+t(625,255,'E₂',25)+t(625,370,'E₁',25)+t(280,445,'Absorption',22)+t(490,445,'Emission',22)+t(380,500,'Photon energy = energy-level difference',20)};
  if(match(/gravitat|orbit|circular/))return {id:'orbital-motion',caption:'For circular orbital motion, the gravitational force points toward the central body; velocity is tangent to the orbit.',drawing:circle(375,280,50,'M','#f5cfaa')+`<circle cx="375" cy="280" r="165" fill="none" stroke="${teal}" stroke-width="3"/>`+circle(540,280,23,'m')+line(512,280,430,280,orange,true)+line(540,250,540,155,teal,true)+t(585,185,'v',30)+t(465,318,'Force',21)+t(375,490,'Force toward the centre',24)};
  if(match(/motion|velocity|accelerat|newton|force|friction|work|energy|momentum|rotation|fluid|solid|elastic|stress|pressure|bernoulli/))return {id:'force-diagram',caption:'A schematic force diagram: identify the object and the forces before applying the chapter equations.',drawing:line(95,370,665,370)+box(290,220,180,145,'#f5cfaa')+line(380,210,380,100,teal,true)+line(380,365,380,465,orange,true)+line(480,280,650,280,teal,true)+line(280,280,110,280,orange,true)+t(380,80,'Normal reaction',23)+t(380,500,'Weight',24)+t(605,245,'Applied force',20)+t(165,245,'Opposing force',20)};
 }
 if(bio){
  if(match(/dna|inheritance|genetic|molecular basis|biotechnolog/))return {id:'dna',caption:'DNA strands run in opposite directions. Complementary bases connect the strands; the helix is shown schematically.',drawing:`<path d="M265 100C485 160 265 260 485 320S265 440 485 460M485 100C265 160 485 260 265 320S485 440 265 460" fill="none" stroke="${teal}" stroke-width="6"/>`+[135,190,245,300,355,410].map((y,i)=>line(295,y,455,y,i%2?teal:orange)).join('')+t(235,92,'5′',24)+t(505,92,'3′',24)+t(505,487,'5′',24)+t(235,487,'3′',24)+t(380,525,'Complementary base pairing',22)};
  if(match(/photosynth|plant|leaf|botan|transport|mineral|kingdom|morpholog|anatom/))return {id:'plant-leaf',caption:'A leaf is a major site of photosynthesis. Roots absorb water and mineral ions; light supplies energy for photosynthesis.',drawing:`<path d="M380 435C120 220 230 100 585 115C590 330 495 400 380 435Z" fill="#e0f0df" stroke="#458a55" stroke-width="5"/>`+line(285,490,545,145,'#458a55')+line(150,115,260,170,orange,true)+t(120,85,'Light',25)+line(140,335,265,335,teal,true)+t(135,315,'CO₂',25)+line(535,315,655,315,teal,true)+t(640,280,'O₂',25)+t(380,510,'Water supply from roots',22)};
  if(match(/plant cell|animal cell|eukaryotic cell|cell organelle|cell membrane|nucleus/))return {id:'biological-cell',caption:'A schematic eukaryotic cell with nucleus and membrane. Actual organelles depend on the organism and cell type.',drawing:`<ellipse cx="380" cy="285" rx="265" ry="180" fill="#e3f1e5" stroke="#4b9565" stroke-width="5"/>`+circle(355,270,68,'Nucleus','#f5cfaa')+`<ellipse cx="515" cy="215" rx="52" ry="26" fill="#fff" stroke="${teal}" stroke-width="4"/>`+line(555,180,650,95,teal,true)+t(620,80,'Membrane',22)+t(380,500,'Cell organisation',24)};
  if(match(/food chain|food web|energy flow/))return {id:'food-chain',caption:'Energy transfer in a simple food chain; the arrows show transfer from food to consumer. This is one example, not every ecosystem.',drawing:circle(150,255,70,'Plant','#e0f0df')+circle(380,255,70,'Herbivore')+circle(610,255,70,'Carnivore','#f5cfaa')+line(225,255,305,255,teal,true)+line(455,255,535,255,orange,true)+t(380,415,'Energy flow',28)+t(380,470,'Producer → primary → secondary consumer',20)};
  if(match(/blood circulation|circulat|transport.*blood|cardiovascular/))return {id:'body-systems',caption:'Body systems interact: exchanged materials are transported by blood. Use the source diagrams for the detailed anatomy of the selected topic.',drawing:box(90,195,180,135)+box(290,195,180,135,'#f5cfaa')+box(490,195,180,135)+t(180,270,'Exchange',24)+t(380,270,'Blood',24)+t(580,270,'Tissues',24)+line(270,250,287,250,teal,true)+line(470,250,487,250,orange,true)+line(578,375,185,375,teal,true)+t(380,455,'Transport and coordination',25)};
 }
 return null;
}

/** Concise symbolic overview for a topic without a verified detailed drawing. */
export function topicIconOverview(input: ConceptMapInput, subject=''): TopicDrawing {
 const terms=(input.keyTerms||[]).map(x=>plainMathText(x.term)).filter(x=>x.length>1&&x.length<32).slice(0,4);
 const labels=terms.length?terms:[plainMathText(input.title).slice(0,48)];
 const chem=/chem/i.test(subject),bio=/bio|botan|zoolog/i.test(subject);
 const glyph=chem?'⚗':bio?'✿':/math/i.test(subject)?'∠':/phys/i.test(subject)?'↗':'✎';
 const drawing=circle(380,190,75,glyph,'#edf7f5')+labels.map((label,i)=>t(380,310+i*42,label,24)).join('');
 return {id:'topic-icons',drawing,caption:'Topic icons and key terms. Detailed scientific diagrams are supplied by matching book pages when available.'};
}

import type { TopicDrawing } from './topic-science-visuals';
const ink = '#193d50', oxygen = '#c44141', nitrogen = '#3168ba', halogen = '#32835a';
const label = (x:number,y:number,value:string,color=ink,size=24) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" fill="${color}">${value}</text>`;
const bond = (x:number,y:number,a:number,b:number) => `<path d="M${x} ${y}L${a} ${b}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
const arrow = (x:number,y:number,a:number,b:number) => `<path d="M${x} ${y}L${a} ${b}" fill="none" stroke="#247f91" stroke-width="3" marker-end="url(#tip)"/>`;
const heading = (value:string) => label(380,55,value,ink,27);
const stage = (y:number,n:number,value:string) => `<circle cx="70" cy="${y-8}" r="18" fill="#edf7f6" stroke="#247f91"/>`+label(70,y,n.toString(),ink,19)+label(385,y,value,ink,22);

/** Standard illustrative structures. Labels explicitly identify representative examples. */
export function chemistryStructureDrawing(title:string):TopicDrawing|null {
  const topic = title.toLowerCase().replace(/₁/g,'1').replace(/₂/g,'2').replace(/[_{}^\s-]+/g,'');
  if (/sn2|bimolecularnucleophilic/.test(topic) && !/sn1/.test(topic)) return {
    id:'sn2-backside-attack',
    caption:'Representative SN2 reaction: hydroxide displaces bromide from bromomethane in one concerted step. Curved arrows show electron-pair movement; this methyl example has no chiral centre.',
    drawing:heading('SN2 · concerted substitution')+
      label(115,195,'HO⁻',oxygen)+label(345,195,'C')+label(345,110,'H')+label(270,290,'H')+label(420,290,'H')+label(585,195,'Br',halogen)+
      bond(345,163,345,125)+bond(327,207,285,268)+bond(363,207,405,268)+bond(367,187,550,187)+
      `<path d="M155 175Q245 100 320 173" fill="none" stroke="${oxygen}" stroke-width="3" marker-end="url(#tip)"/><path d="M460 187Q525 115 577 167" fill="none" stroke="${halogen}" stroke-width="3" marker-end="url(#tip)"/>`+
      label(205,80,'Backside attack',oxygen,20)+label(570,95,'Bond breaks',halogen,20)+
      arrow(160,360,600,360)+label(380,335,'Bond formation and cleavage occur together',ink,20)+
      label(245,440,'CH₃OH',oxygen,29)+label(390,440,'+')+label(535,440,'Br⁻',halogen,29)+label(380,505,'Example: HO⁻ + CH₃Br → CH₃OH + Br⁻',ink,21),
  };
  if (/sn1|unimolecularnucleophilic/.test(topic) && !/sn2/.test(topic)) return {
    id:'sn1-aqueous-stages',
    caption:'Representative SN1 hydrolysis of tert-butyl bromide: ionisation, water attack, then deprotonation. This schematic gives the reaction sequence; no stereochemistry is assigned to this achiral example.',
    drawing:heading('SN1 · carbocation pathway')+
      stage(110,1,'Ionisation: leaving group departs')+label(220,155,'(CH₃)₃C—Br',halogen)+arrow(340,148,410,148)+label(540,155,'(CH₃)₃C⁺ + Br⁻')+
      stage(245,2,'Water attacks the carbocation')+label(220,290,'(CH₃)₃C⁺ + H₂O',oxygen)+arrow(365,283,415,283)+label(550,290,'(CH₃)₃C—OH₂⁺',oxygen)+
      stage(380,3,'Deprotonation yields the alcohol')+label(220,425,'(CH₃)₃C—OH₂⁺ + H₂O',oxygen,21)+arrow(380,418,430,418)+label(565,425,'(CH₃)₃C—OH + H₃O⁺',oxygen,21)+label(380,505,'Example substrate: tert-butyl bromide',ink,21),
  };
  if (/functionalgroup|aldehyd.*ketone|ketone.*aldehyd/.test(topic)) return {
    id:'functional-group-comparison',
    caption:'General functional groups: an aldehyde has a hydrogen attached to the carbonyl carbon; a ketone has two carbon groups; a carboxylic acid has hydroxyl attached to the carbonyl carbon. R denotes an organic group.',
    drawing:heading('Recognise the functional group')+[180,380,580].map((x,i)=>
      label(x,190,'O',oxygen,29)+bond(x-5,207,x-5,262)+bond(x+5,207,x+5,262)+label(x,290,'C')+bond(x-15,299,x-60,340)+bond(x+15,299,x+60,340)+label(x-75,363,'R')+label(x+75,363,['H','R′','OH'][i],i===2?oxygen:ink)+label(x,435,['Aldehyde','Ketone','Carboxylic acid'][i],ink,20)
    ).join('')+label(380,500,'Red: oxygen · Dark bonds: shared electron pairs',ink,20),
  };
  if (/lewis.*water|water.*lewis/.test(topic))return {id:'water-lewis',caption:'Lewis structure of water: oxygen has two O–H single bonds and two lone pairs; the drawing is schematic.',drawing:heading('Water · Lewis structure')+label(380,265,'O',oxygen,38)+bond(355,285,280,350)+bond(405,285,480,350)+label(255,380,'H',ink,34)+label(505,380,'H',ink,34)+[[350,208],[363,196],[400,196],[413,208]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="${oxygen}"/>`).join('')+label(380,115,'Two lone pairs',oxygen)+label(380,470,'Two bonding pairs · Two nonbonding pairs',ink,22)};
  if (/lewis.*ammonia|ammonia.*lewis/.test(topic))return {id:'ammonia-lewis',caption:'Lewis structure of ammonia: nitrogen has three N–H single bonds and one lone pair. This is an electron-pair schematic, not a planar molecular geometry.',drawing:heading('Ammonia · Lewis structure')+label(380,270,'N',nitrogen,38)+bond(355,280,265,335)+bond(405,280,495,335)+bond(380,295,380,380)+label(240,365,'H',ink,32)+label(520,365,'H',ink,32)+label(380,420,'H',ink,32)+`<circle cx="370" cy="205" r="4" fill="${nitrogen}"/><circle cx="390" cy="205" r="4" fill="${nitrogen}"/>`+label(380,140,'One lone pair',nitrogen)+label(380,500,'Three bonding pairs · One nonbonding pair',ink,21)};
  return null;
}

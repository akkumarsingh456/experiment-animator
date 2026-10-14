import catalog from './experiment-video-catalog.json';
import { experimentVideoSource } from './experiment-video-sources';

export type ExperimentVideo = {
  id: string; title: string; referenceTitle?: string; channel: string; subject: string; grades: string[];
  source: string; channelId?: string; views: number | null; comments: number | null; commentsState: string;
  duration: number; checkedAt: string; playlist?: string; embeddable?: boolean;
};
type Family='Physics'|'Chemistry'|'Biology';
type Group={subject:Family;chapter:RegExp;video:RegExp};
const groups:Group[]=[
  {subject:'Chemistry',chapter:/matter.*surroundings/i,video:/melting|boiling|evaporat|sublimat/i},
  {subject:'Chemistry',chapter:/matter.*pure|mixture|separation/i,video:/true solution|suspension|colloid|mixture|crystal|separat/i},
  {subject:'Chemistry',chapter:/atoms and molecules|chemical combination/i,video:/conservation of mass/i},
  {subject:'Chemistry',chapter:/chemical reactions|equations|reaction types/i,video:/reaction|burning|decomposition|oxidation|electrolysis|magnesium/i},
  {subject:'Chemistry',chapter:/acids?.*bases?|salts|equilibrium/i,video:/\bpH\b|indicator|acid|base|salt analysis|equilibrium/i},
  {subject:'Chemistry',chapter:/metals.*non|reactivity|d.*f.block/i,video:/reactivity|metal|iron|copper|zinc/i},
  {subject:'Chemistry',chapter:/carbon.*compounds|organic|alcohol|phenol|ether|aldehyde|ketone|carboxylic|hydrocarbon|haloalkane|amine/i,video:/organic|functional group|ethanoic|acetic|ester|soap|alcohol|phenol|ketone|aldehyde|saponification/i},
  {subject:'Chemistry',chapter:/solutions/i,video:/solution|solubility|concentration|osmosis/i},
  {subject:'Chemistry',chapter:/chemical kinetics/i,video:/kinetics|reaction rate/i},
  {subject:'Chemistry',chapter:/electrochemistry/i,video:/emf.*cell|electrochem|electrolysis|conductivity/i},
  {subject:'Chemistry',chapter:/biomolecules/i,video:/carbohydrate|protein|fat|starch|sugar/i},
  {subject:'Chemistry',chapter:/surface chemistry|colloid/i,video:/colloid|sols|emulsion/i},
  {subject:'Chemistry',chapter:/thermodynamics/i,video:/enthalpy|heat.*neutral|calorimet|thermochem/i},
  {subject:'Physics',chapter:/units|measurement/i,video:/vernier|caliper|calliper|screw gauge|spherometer/i},
  {subject:'Physics',chapter:/electricity|current electricity/i,video:/ohm|resistan|metre.?bridge|meter.?bridge|potentiometer/i},
  {subject:'Physics',chapter:/electrostatic|electric charges|capacitance/i,video:/electrostat|charge|capacitor|capacitance/i},
  {subject:'Physics',chapter:/magnetic|magnetism|moving charges/i,video:/galvanometer|magnet|solenoid|compass/i},
  {subject:'Physics',chapter:/electromagnetic induction|alternating current/i,video:/induction|faraday|transformer|alternating/i},
  {subject:'Physics',chapter:/light|optics|human eye/i,video:/lens|mirror|refraction|prism|optical|diffraction|interference/i},
  {subject:'Physics',chapter:/sound|waves|oscillations/i,video:/sound|resonance|pendulum|wave|vibrat/i},
  {subject:'Physics',chapter:/gravitation/i,video:/archimedes|density|pendulum|gravity/i},
  {subject:'Physics',chapter:/motion|force|work.*energy|mechanical.*solid/i,video:/force|friction|spring|young|modulus|motion|pendulum/i},
  {subject:'Physics',chapter:/mechanical.*fluid/i,video:/viscosity|surface tension|capillary|density/i},
  {subject:'Physics',chapter:/thermal|thermodynamics|kinetic theory/i,video:/heat|cooling|calorimet|temperature/i},
  {subject:'Physics',chapter:/semiconductor|electronic devices/i,video:/diode|transistor|rectifier|logic gate/i},
  {subject:'Biology',chapter:/cell|fundamental unit|tissue/i,video:/cell|microscop|onion|tissue|plasmolysis|osmosis/i},
  {subject:'Biology',chapter:/life processes|photosynthesis|respiration|breathing|transport.*plant/i,video:/photosynth|respiration|breathing|stoma|osmosis|amylase|starch/i},
  {subject:'Biology',chapter:/reproduc|flower|sexual|plant growth/i,video:/flower|pollen|germination|reproduction|budding|fission|tropism/i},
  {subject:'Biology',chapter:/diversity|biological classification|plant kingdom|animal kingdom|morphology/i,video:/flower|earthworm|cockroach|moss|fern|pinus|monocot|dicot/i},
  {subject:'Biology',chapter:/health|disease|microbe/i,video:/disease|parasite|plasmodium|mosquito|organism|fermentation/i},
  {subject:'Biology',chapter:/environment|ecosystem|ecology|organisms.*population|biodiversity/i,video:/soil|ecolog|adaptation|water sample|organism/i},
  {subject:'Biology',chapter:/heredity|inheritance|molecular basis/i,video:/dna|inheritance|mendel|genetic|nucleic/i},
];
const stop=new Set('the and for with from this that using class grade chapter science ncert experiment experiments practical activity activities demonstration tutorial preparation prepare study determine determining verification verify verifying all working guide lab manual chemistry physics biology to of in on by a an'.split(' '));
function words(text:string){return text.toLowerCase().replace(/sulph/g,'sulf').replace(/isation/g,'ization').replace(/[^a-z0-9]+/g,' ').split(/\s+/).map(word=>word.length>5?word.replace(/ies$/,'y').replace(/s$/,''):word).filter(word=>word.length>2&&!stop.has(word)&&!/^\d+$/.test(word));}

export function relevantExperimentVideos(input:{klass:string;subject:string;chapter:string;topic:string;activity?:string},sort='relevance',institutionOnly=false) {
  const grade=input.klass.match(/(?:^|\D)(9|10|11|12)(?=\D|$)/)?.[1]||input.klass;
  const context=`${input.chapter} ${input.topic}`;
  const applicable=groups.filter(group=>group.chapter.test(context));
  const family:Family|undefined=/physics/i.test(input.subject)?'Physics':/chemistry/i.test(input.subject)?'Chemistry':/biology|botany|zoology/i.test(input.subject)?'Biology':
    /\(physics\)/i.test(context)?'Physics':/\(chemistry\)/i.test(context)?'Chemistry':/\(biology\)/i.test(context)?'Biology':applicable[0]?.subject;
  if(!family)return [];
  const focus=input.topic&&input.topic!==input.chapter?input.topic:input.chapter;
  const direct=[...new Set(words(focus))],active=[...new Set(words(input.activity||''))];
  const narrow=`${input.topic!==input.chapter?input.topic:''} ${input.activity||''}`;
  const frequencies=new Map<string,number>();
  (catalog as ExperimentVideo[]).filter(video=>video.subject===family).forEach(video=>new Set(words(`${video.title} ${video.referenceTitle||''}`)).forEach(word=>frequencies.set(word,(frequencies.get(word)||0)+1)));
  const matches=(catalog as ExperimentVideo[]).filter(video=>video.subject===family).map(video=>{
    const text=`${video.title} ${video.referenceTitle||''}`,tokens=new Set(words(text));
    const hits=direct.filter(word=>tokens.has(word)),activeHits=active.filter(word=>tokens.has(word));
    const groupMatch=applicable.some(group=>group.subject===family&&group.video.test(text));
    const distinctive=hits.some(word=>word.length>=7&&(frequencies.get(word)||0)<=5);
    let eligible=groupMatch||hits.length>=2||distinctive||activeHits.length>=2;
    // Do not substitute heating hydrated crystals for growing crystals, or a
    // different optical element / circuit connection for a selected experiment.
    if(/crystalli[sz]|prepar.*crystal|crystal.*prepar/i.test(narrow)&&!/crystalli[sz]|prepar.*crystal|crystal.*prepar/i.test(text))eligible=false;
    if(/concave mirror/i.test(narrow)&&!/concave mirror/i.test(text))eligible=false;
    if(/convex lens/i.test(narrow)&&!/convex lens/i.test(text))eligible=false;
    if(/parallel/i.test(narrow)&&!/series/i.test(narrow)&&!/parallel|combination/i.test(text))eligible=false;
    const a=(input.activity||'').match(/activity\s+(\d+\.\d+)/i),b=text.match(/activity\s+(\d+\.\d+)/i);
    const exactActivity=!!a&&!!b&&a[1]===b[1];
    const weight=(word:string)=>1+Math.log(1+30/((frequencies.get(word)||0)+1));
    const score=hits.reduce((sum,word)=>sum+weight(word)*3,0)+activeHits.reduce((sum,word)=>sum+weight(word)*4,0)+(groupMatch?8:0)+(video.grades.includes(grade)?6:0)+(exactActivity?20:0);
    const matchTier=exactActivity||activeHits.length>=2||hits.length>=2||distinctive?0:hits.length?1:2;
    return {...video,score,eligible,sameGrade:video.grades.includes(grade),matchTier,authority:experimentVideoSource(video)};
  }).filter(video=>video.eligible&&(!institutionOnly||video.authority.institution));
  // An exact experiment / topic and the selected class take precedence.
  // Among comparable matches prefer NCERT, then government-funded OLabs,
  // then university material. Popularity never overrides these priorities.
  return matches.sort((a,b)=>a.matchTier-b.matchTier||Number(b.sameGrade)-Number(a.sameGrade)||a.authority.priority-b.authority.priority||
    (sort==='views'? (b.views??-1)-(a.views??-1)||b.score-a.score:
    sort==='comments'?(b.comments??-1)-(a.comments??-1)||b.score-a.score:
    b.score-a.score||(b.views??-1)-(a.views??-1)||(b.comments??-1)-(a.comments??-1))).slice(0,9);
}

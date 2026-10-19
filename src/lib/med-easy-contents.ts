/** Contents supplied by the owner for the Team Kohinoor 2.0 editions.
 * Checked against visible chapter headings in the owner's 342 / 247 page PDFs.
 * A fixed offset is insufficient: duplicated pages and the organic supplement
 * change the offset partway through these books. Never offset an explicit page.
 */
type Entry = readonly [title: string, start: number, end: number, aliases?: string];
export const physicsContents: readonly Entry[] = [
 ['Basic Maths',1,16,'Basic Mathematics'],['Vector',17,23,'Vectors'],
 ['Units & Dimensions',24,36,'Units and Measurements'],['Motion in 1-D',37,47,'Motion in a Straight Line'],
 ['Motion in a Plane',48,55],['Newton’s Laws of Motion',56,65,'Laws of Motion'],['Friction',66,72],['Circular Motion',73,78],
 ['Work, Energy, and Power',79,86],['Center of Mass',87,91,'Centre of Mass|System of Particles and Rotational Motion'],
 ['Collision',92,97],['Rotational Motion',98,113],['Gravitation',114,123],['Elasticity',124,130,'Mechanical Properties of Solids'],
 ['Fluid Mechanics',131,145,'Mechanical Properties of Fluids'],['Thermal Properties of Matter',146,152],['Heat Transfer',153,156],
 ['KTG & Thermodynamics',157,170,'Kinetic Theory|Thermodynamics|Kinetic Theory of Gases'],
 ['Simple Harmonic Motion',171,179,'Oscillations'],['Wave and Sound Motion',180,191,'Waves'],
 ['Electrostatics',192,202,'Electric Charges and Fields'],['Electric Potential',203,209,'Electrostatic Potential and Capacitance'],
 ['Capacitor',210,218,'Capacitance'],['Current Electricity',219,228],
 ['Magnetic Effect of Electric Current',229,242,'Moving Charges and Magnetism'],['Magnetism & Matter',243,250],
 ['Electromagnetic Induction',251,260],['Alternating Current',261,270],['Electromagnetic Wave',271,275,'Electromagnetic Waves'],
 ['Ray Optics',276,290,'Ray Optics and Optical Instruments'],['Wave Optics',291,300],
 ['Dual Nature',301,310,'Dual Nature of Radiation and Matter'],['Atoms',311,317],['Nuclei',318,328],
 ['Semiconductor',329,340,'Semiconductor Electronics|Semiconductor Electronics Materials Devices and Simple Circuits'],
];
export const chemistryContents: readonly Entry[] = [
 ['Mole Concept',3,7,'Some Basic Concepts of Chemistry'],['Atomic Structure',8,14,'Structure of Atom'],['Gaseous State',15,21,'States of Matter'],
 ['Thermodynamics',22,30,'Chemical Thermodynamics'],['Thermochemistry',31,34],['Chemical Equilibrium',35,40,'Equilibrium'],
 ['Ionic Equilibrium',41,49],['Redox Reactions',50,55],['Solid State',56,65,'The Solid State'],['Solutions',66,69],
 ['Electrochemistry',70,74],['Chemical Kinetics',75,78],['Periodic Table',81,83,'Classification of Elements and Periodicity in Properties'],
 ['Chemical Bonding',84,88,'Chemical Bonding and Molecular Structure'],['Hydrogen',89,93],['s-Block',94,100,'The s Block Elements'],
 ['p-Block (Boron Family)',101,105,'The p Block Elements|p Block Elements'],['p-Block (Carbon Family)',106,110],
 ['p-Block (N + O Family)',111,122],['Halogens',123,126],['Inert Gases',127,128],
 ['d-Block',129,133,'The d and f Block Elements|d and f Block Elements'],['f-Block',134,135],['Metallurgy',136,140,'General Principles and Processes of Isolation of Elements'],
 ['Coordination Compound',141,152,'Coordination Compounds'],['GOC',155,159,'Organic Chemistry Some Basic Principles and Techniques'],
 ['Hydrocarbons',160,167],['Haloalkane and Haloarene',168,170,'Haloalkanes and Haloarenes'],
 ['Alcohols, Phenols and Ethers',171,176],['Aldehyde, Ketones & Carboxylic Acids',177,182,'Aldehydes Ketones and Carboxylic Acids'],
 ['Nitrogen Compounds (Amines)',183,185,'Amines'],['Biomolecules',186,191],['Polymers',192,197],['Chemistry in Everyday Life',198,202],
];
const key=(text:string)=>text.toLowerCase().replace(/^chapter\s*\d+\s*[:.\-]?\s*/,'').replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
// Indexed in the same order as the supplied contents above; physical PDF pages.
const physicsStarts=[5,21,28,41,52,58,68,74,80,88,93,99,115,125,132,147,154,158,172,181,193,204,211,220,230,244,252,262,272,278,293,303,313,320,331];
const chemistryStarts=[8,13,20,27,36,40,46,55,62,72,76,81,86,89,94,99,106,111,116,128,132,134,139,141,146,160,179,186,189,195,201,204,210,216];
export function medEasyChapterStart(name:string,subject:string,chapter:string){
 const filename=key(name);
 if(!filename.includes('medeasy')||!filename.includes('kohinoor'))return null;
 const physics=subject.toLowerCase()==='physics',chemistry=subject.toLowerCase()==='chemistry';
 if((!physics&&!chemistry)||!filename.includes(physics?'physics':'chemistry'))return null;
 if(physics&&!filename.includes('20'))return null;
 const entry=(physics?physicsContents:chemistryContents).find(([title,,,aliases])=>[title,...(aliases?.split('|')||[])].some(alias=>key(alias)===key(chapter)));
 if(!entry)return null;
 const [,start,end]=entry;
 const page=!physics&&key(chapter)==='goc'?170:(physics?physicsStarts:chemistryStarts)[(physics?physicsContents:chemistryContents).indexOf(entry)];
 return {page,printedRange:{start,end}};
}

/** Reviewed NCERT passage retained for the reported failure. This is a
 * chapter/topic-scoped source snapshot, not a general generated fallback.
 * NCERT Chemistry II, Haloalkanes and Haloarenes, §6.3, pp. 163–164.
 * Only independently readable prose is retained; the flattened table is omitted. */
export function verifiedNcertRecovery(klass:string,subject:string,chapter:string,topic:string){
 const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(klass.replace(/^Class\s*/i,'').trim()!=='12'||subject!=='Chemistry'||
  !/^(?:(?:chapter|unit)\d+)?haloalkanesandhaloarenes$/.test(normalize(chapter))||normalize(topic)!=='natureofcxbond')return null;
 return {
  url:'https://sathee.iitk.ac.in/sathee-neet/ncert-books/neet-ncert-books/neet-nb-che-12/chem-12-unit-10-haloalkanes-and-haloarenes/',
  text:'6.3 Nature of C-X Bond\nHalogen atoms are more electronegative than carbon, therefore, carbon-halogen bond of alkyl halide is polarised; the carbon atom bears a partial positive charge whereas the halogen atom bears a partial negative charge.\nAs we go down the group in the periodic table, the size of halogen atom increases.\nFluorine atom is the smallest and iodine atom is the largest.\nConsequently the carbon-halogen bond length also increases from C-F to C-I.\n6.4 Methods of Preparation',
 };
}

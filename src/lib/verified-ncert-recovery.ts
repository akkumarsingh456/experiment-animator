/** Reviewed NCERT passage retained for the reported failure. This is a
 * chapter/topic-scoped source snapshot, not a general generated fallback.
 * NCERT Chemistry II, Haloalkanes and Haloarenes, §6.3, pp. 163–164.
 * Only independently readable prose is retained; the flattened table is omitted. */
export function verifiedNcertRecovery(klass:string,subject:string,chapter:string,topic:string){
 const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(klass.replace(/^Class\s*/i,'').trim()==='10'&&subject==='Science'&&
  /^(?:(?:chapter|unit)\d+)?metalsandnonmetals(?:chemistry)?$/.test(normalize(chapter))&&normalize(topic)==='physicalandchemicalproperties')return {
   url:'https://sathee.iitk.ac.in/ncert-books/class-10/nb-science-10/sci-10-chapter-3-metals-and-non-metals/',
   // Reviewed independently readable paragraphs from NCERT Science §3.1–3.2.
   text:'3.1 PHYSICAL PROPERTIES\nMetals, in their pure state, have a shining surface. This property is called metallic lustre.\nYou will find that metals are generally hard. The hardness varies from metal to metal.\nYou will find that some metals can be beaten into thin sheets. This property is called malleability.\nThe ability of metals to be drawn into thin wires is called ductility.\n3.2 CHEMICAL PROPERTIES OF METALS\nAlmost all metals combine with oxygen to form metal oxides.\nWe have learnt that metal oxides are basic in nature. But some metal oxides, such as aluminium oxide, zinc oxide show both acidic as well as basic behaviour.\nSuch metal oxides which react with both acids as well as bases to produce salts and water are known as amphoteric oxides.\nDifferent metals show different reactivities towards oxygen.\nSilver and gold do not react with oxygen even at high temperatures.\n3.3 HOW DO METALS AND NON-METALS REACT?',
  };
 if(klass.replace(/^Class\s*/i,'').trim()!=='12'||subject!=='Chemistry'||
  !/^(?:(?:chapter|unit)\d+)?haloalkanesandhaloarenes$/.test(normalize(chapter))||normalize(topic)!=='natureofcxbond')return null;
 return {
  url:'https://sathee.iitk.ac.in/sathee-neet/ncert-books/neet-ncert-books/neet-nb-che-12/chem-12-unit-10-haloalkanes-and-haloarenes/',
  text:'6.3 Nature of C-X Bond\nHalogen atoms are more electronegative than carbon, therefore, carbon-halogen bond of alkyl halide is polarised; the carbon atom bears a partial positive charge whereas the halogen atom bears a partial negative charge.\nAs we go down the group in the periodic table, the size of halogen atom increases.\nFluorine atom is the smallest and iodine atom is the largest.\nConsequently the carbon-halogen bond length also increases from C-F to C-I.\n6.4 Methods of Preparation',
 };
}

/** Reviewed supplementary summaries of NCERT Chemistry XII, Solutions,
 * §§1.2, 1.4 and 1.6 (older editions number this unit 2).
 * Original wording, not live AI output or a claim of verbatim extraction.
 * Reference checked 2026-10-23; available even when the official host blocks a fetch.
 */
export function reviewedSolutionsNotes(scope:{klass:string;subject:string;chapter:string;topic:string}){
 if(scope.klass!=='12'||scope.subject!=='Chemistry'||scope.chapter!=='Chapter 1: Solutions')return null;
 const notes:Record<string,string[]>={
  'Concentration terms':[
   'Concentration describes how much of a component is present in a specified amount of solution or solvent. Always identify which quantity is used in the denominator.',
   'Mass percentage compares the mass of a component with the total mass of the solution: $\\text{mass percentage}=\\frac{\\text{mass of component}}{\\text{mass of solution}}\\times100$.',
   'Volume percentage compares the volume of a component with the total solution volume: $\\text{volume percentage}=\\frac{\\text{volume of component}}{\\text{volume of solution}}\\times100$.',
   'Mass by volume percentage gives the mass of solute, in grams, present in 100 mL of solution.',
   'Parts per million (ppm) expresses very small concentrations: $\\mathrm{ppm}=\\frac{\\text{parts of component}}{\\text{total parts of solution}}\\times10^6$. Specify whether the comparison is by mass or volume.',
   'Mole fraction is the moles of a component divided by the total moles of all components: $x_i=\\frac{n_i}{\\sum_j n_j}$. It has no unit, and the mole fractions of all components add to one.',
   'Molarity is moles of solute per litre of solution: $M=\\frac{n_{\\text{solute}}}{V_{\\text{solution in litres}}}$. Its usual unit is mol L⁻¹.',
   'Molality is moles of solute per kilogram of solvent: $m=\\frac{n_{\\text{solute}}}{m_{\\text{solvent in kg}}}$. Its usual unit is mol kg⁻¹.',
   'Molarity uses solution volume, which can change with temperature. Molality uses solvent mass and does not change merely because the temperature changes.',
  ],
  'Vapour pressure':[
   'In a closed container at a fixed temperature, a liquid can reach dynamic equilibrium with its vapour. The equilibrium vapour then exerts the liquid’s vapour pressure.',
   'For a liquid solution with volatile components, each component contributes a partial vapour pressure. The total pressure is the sum of these partial pressures.',
   'For a component obeying Raoult’s law, $p_i=x_i p_i^0$, where $x_i$ is its liquid-phase mole fraction and $p_i^0$ is the pure component’s vapour pressure at the same temperature.',
   'For an ideal binary solution, $p_{\\text{total}}=x_1p_1^0+x_2p_2^0$. Keep the temperature fixed when comparing the pressures.',
   'A non-volatile solute does not contribute appreciably to the vapour pressure. For a solution obeying Raoult’s law, reducing the solvent mole fraction lowers its vapour pressure.',
  ],
  "Raoult's law":[
   'Raoult’s law relates the partial vapour pressure of a volatile component to its mole fraction in a liquid solution: $p_i=x_i p_i^0$.',
   'Here $p_i^0$ is the vapour pressure of the pure component at the same temperature. The law concerns the liquid-phase mole fraction.',
   'For an ideal binary mixture of volatile liquids, the total pressure is $p_{\\text{total}}=x_1p_1^0+x_2p_2^0$, with $x_1+x_2=1$.',
   'For a binary solution containing a non-volatile solute, the solvent relation gives $\\frac{p_1^0-p_1}{p_1^0}=x_2$. The left side is the relative lowering of solvent vapour pressure.',
   'Ideal solutions obey Raoult’s law throughout the composition range. Non-ideal solutions can show positive or negative deviations; do not apply the ideal relation without checking the stated conditions.',
  ],
  'Colligative properties':[
   'Colligative properties depend on the number of solute particles relative to the solvent, rather than the chemical identity of those particles.',
   'The four properties studied here are relative lowering of vapour pressure, elevation of boiling point, depression of freezing point and osmotic pressure.',
   'For dilute solutions of a non-volatile solute that does not associate or dissociate, boiling-point elevation is $\\Delta T_b=K_bm$ and freezing-point depression is $\\Delta T_f=K_fm$. Here $m$ is molality.',
   'For a dilute solution of a solute that does not associate or dissociate, osmotic pressure is $\\pi=CRT$, where $C$ is molarity and $T$ is absolute temperature. Use consistent units for the gas constant.',
   'These relations can determine molar mass. Association or dissociation changes the number of solute particles and must be accounted for using the van’t Hoff factor.',
  ],
 };
 const lines=notes[scope.topic];
 return lines?{lines,sources:[{url:'https://sathee.iitk.ac.in/sathee-neet/ncert-books/neet-ncert-books/neet-nb-che-12/chem-12-unit-2-solutions/',title:'NCERT Class 12 Chemistry · Solutions'}],label:'Reviewed source-based supplementary notes'}:null;
}

/** Curated official resources. Never construct links from AI-generated names. */
export type LessonResource = {
  id: string; title: string; url: string; dimension: "2D interactive simulation" | "3D interactive model";
  scope: string; limitation: string; investigation: string; matches: RegExp; subjects: RegExp;
};
export const LESSON_RESOURCES: LessonResource[] = [
  { id: "natural-selection", title: "PhET · Natural Selection", url: "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html", dimension: "2D interactive simulation",
    scope: "Investigate inherited traits and selection pressures in a model rabbit population.", limitation: "A simplified population model, not a complete representation of evolution or human genetics.",
    investigation: "Predict which trait may be favoured under a selected environment. Compare population changes and justify your explanation with evidence.", matches: /natural selection|evolution|adaptation/i, subjects: /biology|science/i },
  { id: "balancing-equations", title: "PhET · Balancing Chemical Equations", url: "https://phet.colorado.edu/sims/html/balancing-chemical-equations/latest/balancing-chemical-equations_en.html", dimension: "2D interactive simulation",
    scope: "Count atoms and balance the coefficients in chemical equations.", limitation: "Shows conservation of atoms, not reaction mechanisms or a 3D molecular process.",
    investigation: "Count each element on both sides before and after balancing. Explain why coefficients can change but chemical formula subscripts cannot be changed to balance an equation.", matches: /chemical reactions|chemical equations|balanc.*equation|conservation of mass/i, subjects: /chemistry|science/i },
  { id: "gas-properties", title: "PhET · Gas Properties", url: "https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_en.html", dimension: "2D interactive simulation",
    scope: "Explore relationships among particle number, pressure, temperature and volume.", limitation: "A simplified particle model, not a full model of real-gas interactions or phase transitions.",
    investigation: "Hold particle number and temperature fixed. Predict how pressure changes when volume decreases, test the prediction, and compare with the textbook gas law.", matches: /gas laws?|gas properties|kinetic theory|boyle|charles|ideal gas/i, subjects: /physics|chemistry|science/i },
  { id: "wave-interference", title: "PhET · Wave Interference", url: "https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html", dimension: "2D interactive simulation",
    scope: "Explore wave superposition and interference patterns with wave sources.", limitation: "An idealised wave representation; it is not a 3D model of the apparatus.",
    investigation: "Compare one source with two sources. Predict where reinforcement and cancellation occur, then explain the observed pattern using superposition.", matches: /wave interference|wave optics|superposition|interference|diffraction/i, subjects: /physics|science/i },
  { id: "function-builder", title: "PhET · Function Builder", url: "https://phet.colorado.edu/sims/html/function-builder/latest/function-builder_en.html", dimension: "2D interactive simulation",
    scope: "Explore inputs, outputs and the composition of function machines.", limitation: "A scaffold for function concepts, not a general algebra solver or calculus graphing tool.",
    investigation: "Predict an output before applying a function. Reverse the task to infer a possible input and compare the effect of changing the order of two functions.", matches: /relations and functions|composition of functions|function builder/i, subjects: /math/i },
  { id: "ohms-law", title: "PhET · Ohm’s Law", url: "https://phet.colorado.edu/sims/html/ohms-law/latest/ohms-law_en.html", dimension: "2D interactive simulation",
    scope: "Voltage, current and resistance for an ohmic resistor.", limitation: "An ideal ohmic model; it does not model heating or non-ohmic devices.",
    investigation: "Predict how current changes when voltage doubles at fixed resistance. Test it, then explain the observation using Ohm’s law.", matches: /ohm|current electricity|electricity|resistance/i, subjects: /physics|science/i },
  { id: "dc-circuits", title: "PhET · Circuit Construction Kit: DC — Virtual Lab", url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc-virtual-lab/latest/circuit-construction-kit-dc-virtual-lab_en.html", dimension: "2D interactive simulation",
    scope: "Build DC circuits and measure voltage and current; compare series and parallel connections and test junction rules.", limitation: "You build the circuit yourself. This is not a ready-made Wheatstone bridge, potentiometer or microscopic drift model.",
    investigation: "Build two resistors in series, then in parallel. Predict and measure branch currents and voltage drops. Explain the differences using the chapter’s circuit rules.", matches: /circuit|kirchhoff|series|parallel|current electricity|electricity/i, subjects: /physics|science/i },
  { id: "bending-light", title: "PhET · Bending Light", url: "https://phet.colorado.edu/sims/html/bending-light/latest/bending-light_en.html", dimension: "2D interactive simulation",
    scope: "Refraction, reflection and the relation between incident and refracted angles.", limitation: "A simplified optical model, not a full 3D ray-optics laboratory.",
    investigation: "Predict how the refracted ray changes when the second medium changes. Measure the angles and explain the result with the textbook relation.", matches: /refraction|snell|bending light|total internal reflection/i, subjects: /physics|science/i },
  { id: "molecule-shapes", title: "PhET · Molecule Shapes", url: "https://phet.colorado.edu/sims/html/molecule-shapes/latest/molecule-shapes_en.html", dimension: "3D interactive model",
    scope: "Rotate molecular geometry models and compare bonding groups and lone pairs using VSEPR.", limitation: "A geometry model; it does not show actual electron orbitals or chemical reaction dynamics.",
    investigation: "Predict the shape from the number of bonding groups and lone pairs. Rotate the model, inspect the angles, and explain the observed geometry.", matches: /vsepr|molecular geometry|molecule shapes|molecular shapes|chemical bonding|hybridisation|hybridization/i, subjects: /chemistry|science/i },
];

export function lessonResources(titles: string[], subject = ""): LessonResource[] {
  return LESSON_RESOURCES.filter((resource) => resource.subjects.test(subject) && titles.some((title) => resource.matches.test(title)));
}

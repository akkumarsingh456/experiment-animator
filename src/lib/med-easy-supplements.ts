import type { Slide } from '@/lib/generate.functions';
import { sourceFormulaBlocks } from '@/lib/source-derivations';
import { matchingSourceRules } from '@/lib/source-formula-supplements';

export const MED_EASY_DETAILS = 'Med Easy — supplementary formulas and explanation';
const details: Record<string, string[]> = {
  'Coulomb’s law': ['Use point charges, or spherically symmetric charges outside their surfaces. The separation is measured between their centres.', 'The force acts along the line joining the charges. Like charges repel; unlike charges attract. Doubling separation reduces its magnitude to one quarter.'],
  'Potential of a point charge': ['Potential is a scalar measured in volts; its sign follows the source charge. This expression sets potential at infinity to zero.', 'For several point charges, add their potentials algebraically. Electric fields must instead be added as vectors.'],
  'Parallel-plate capacitance': ['This relation assumes large parallel plates, negligible edge effects and vacuum between them. Capacitance is measured in farads.', 'Increasing plate area increases capacitance; increasing separation decreases it. A dielectric completely filling the gap multiplies capacitance by its relative permittivity.'],
  'Ohm’s law': ['Apply this proportionality to an ohmic conductor with temperature and other physical conditions fixed.', 'Resistance is measured in ohms. The slope of a voltage-versus-current graph is resistance; the slope of current-versus-voltage is conductance.'],
  'Resistance and resistivity': ['Length and cross-sectional area describe a uniform conductor. Resistivity describes its material at the stated temperature.', 'Resistance is measured in ohms and resistivity in ohm metres. At fixed material and temperature, a longer wire has greater resistance and a thicker wire has less.'],
  'Current and drift velocity': ['Number density counts carriers per unit volume; charge is the magnitude of the carrier charge, and area is perpendicular to the flow.', 'For electrons, mean drift is opposite to conventional current. Drift speed is the small net motion superimposed on random thermal motion.'],
  'Nernst equation': ['Use the balanced overall cell reaction to determine the number of electrons transferred and the reaction quotient. Pure solids and liquids have unit activity.', 'The logarithm in this form is natural. Temperature is in kelvin; the expression uses activities, with concentration approximations appropriate for dilute solutions.'],
  'Molar conductivity': ['Use consistent units: conductivity in siemens per metre and concentration in moles per cubic metre give molar conductivity in siemens square metres per mole.', 'Conductivity and molar conductivity have different dilution trends; do not interchange their definitions.'],
  'First-order reaction': ['The rate constant has units of inverse time. The half-life is independent of the initial concentration for an ideal first-order reaction.', 'Use concentrations at the same temperature and express time in the units used for the rate constant.'],
  'Ideal-gas equation': ['Pressure must be absolute and temperature must be in kelvin. Choose the gas constant with units matching pressure and volume.', 'The ideal-gas approximation is most useful at low pressure and sufficiently high temperature, away from condensation.'],
  'Raoult’s law': ['This form applies to a component in an ideal liquid solution; its reference pressure is the vapour pressure of the pure component at the same temperature.', 'For an ideal mixture of volatile components, total pressure is the sum of their partial pressures.'],
};

/** Evidence is an index into verified chapter pages, never pasted OCR prose. */
export function medEasyFormulaSupplement(title: string, subject: string, evidence: string[], existing: string[] = []): string[] {
  const plain = evidence.map(text => text.replace(/\$[^$]*\$/g, ' '));
  const rules = matchingSourceRules(title, subject, plain);
  if (!rules.length) return [];
  const formulas = sourceFormulaBlocks(title, subject, plain, existing);
  return [...formulas, ...rules.flatMap(rule => details[rule.name] || []).map(line => `**Formula basis:** ${line}`).filter(line => !existing.includes(line))];
}

/** Explicit additive enrichment, separate from the image-only refresh contract. */
export function mergeMedEasySupplements(slides: Slide[], supplements: Array<{title: string; supplement_lines?: string[]}>): Slide[] {
  return slides.map((slide, index) => {
    const supplement = supplements[index];
    if (supplement?.title !== slide.title || !supplement.supplement_lines?.length || ['break', 'mcq', 'chapter'].includes(slide.kind || '')) return slide;
    const existing = new Set((slide.sections || []).flatMap(section => section.lines));
    const lines = supplement.supplement_lines.filter(line => !existing.has(line));
    if (!lines.length) return slide;
    const current = (slide.sections || []).find(section => section.heading === MED_EASY_DETAILS);
    return {...slide, sections: current
      ? slide.sections!.map(section => section === current ? {...section, lines: [...section.lines, ...lines]} : section)
      : [...(slide.sections || []), {heading: MED_EASY_DETAILS, kind: 'formula' as const, lines}]};
  });
}

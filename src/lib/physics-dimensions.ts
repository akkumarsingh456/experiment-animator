import type { NoteSection } from "@/lib/ncert-teacher-notes";

/** Standard SI dimensional identities. MLT alone is insufficient for electricity and heat.
 * Basis: https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-7-rules-and-style-conventions-expressing-values
 * Match named quantities, never guess from single-letter symbols or the subject alone.
 */
const quantities: Array<{name: string; pattern: RegExp; dimension: string; remember: string}> = [
  {name: "Speed / velocity", pattern: /\b(?:speed|velocity)\b/i, dimension: "L T^{-1}", remember: "Distance divided by time."},
  {name: "Acceleration", pattern: /\b(?:acceleration)\b/i, dimension: "L T^{-2}", remember: "Velocity divided by time: one more inverse T."},
  {name: "Force", pattern: /\b(?:force|weight)\b/i, dimension: "M L T^{-2}", remember: "Use F = ma."},
  {name: "Momentum / impulse", pattern: /\b(?:momentum|impulse)\b/i, dimension: "M L T^{-1}", remember: "Momentum = mass \u00d7 velocity; impulse = force \u00d7 time."},
  {name: "Work / energy / heat", pattern: /\b(?:work|energy|heat)\b/i, dimension: "M L^{2} T^{-2}", remember: "Work = force \u00d7 displacement."},
  {name: "Power", pattern: /\b(?:power)\b/i, dimension: "M L^{2} T^{-3}", remember: "Power = energy divided by time."},
  {name: "Pressure / stress", pattern: /\b(?:pressure|stress)\b/i, dimension: "M L^{-1} T^{-2}", remember: "Pressure = force divided by area."},
  {name: "Mass density", pattern: /\b(?:density)\b/i, dimension: "M L^{-3}", remember: "Mass divided by volume; not charge or current density."},
  {name: "Frequency", pattern: /\b(?:frequency)\b/i, dimension: "T^{-1}", remember: "Cycles per unit time."},
  {name: "Wavelength / displacement", pattern: /\b(?:wavelength|displacement)\b/i, dimension: "L", remember: "Both represent length."},
  {name: "Torque", pattern: /\b(?:torque)\b/i, dimension: "M L^{2} T^{-2}", remember: "Force \u00d7 perpendicular distance; same dimensions as energy, different meaning."},
  {name: "Angular velocity", pattern: /\b(?:angular velocity)\b/i, dimension: "T^{-1}", remember: "Angle is dimensionless; divide by time."},
  {name: "Angular acceleration", pattern: /\b(?:angular acceleration)\b/i, dimension: "T^{-2}", remember: "Angular velocity divided by time."},
  {name: "Moment of inertia", pattern: /\b(?:moment of inertia)\b/i, dimension: "M L^{2}", remember: "Sum of mass \u00d7 squared perpendicular distance."},
  {name: "Angular momentum", pattern: /\b(?:angular momentum)\b/i, dimension: "M L^{2} T^{-1}", remember: "Moment of inertia \u00d7 angular velocity."},
  {name: "Spring constant", pattern: /\b(?:spring constant)\b/i, dimension: "M T^{-2}", remember: "Force divided by extension."},
  {name: "Gravitational constant", pattern: /\b(?:gravitational constant)\b/i, dimension: "M^{-1} L^{3} T^{-2}", remember: "Rearrange G = force \u00d7 distance\u00b2 / mass\u00b2."},
  {name: "Surface tension", pattern: /\b(?:surface tension)\b/i, dimension: "M T^{-2}", remember: "Force per unit length."},
  {name: "Dynamic viscosity", pattern: /\b(?:dynamic viscosity|coefficient of viscosity)\b/i, dimension: "M L^{-1} T^{-1}", remember: "Shear stress divided by velocity gradient."},
  {name: "Electric charge", pattern: /\b(?:electric charge|charge)\b/i, dimension: "I T", remember: "Charge = current \u00d7 time. I is an independent base dimension."},
  {name: "Electric current", pattern: /\b(?:electric current)\b/i, dimension: "I", remember: "Current needs I; M, L and T alone are insufficient."},
  {name: "Electric potential / voltage", pattern: /\b(?:electric potential|potential difference|voltage|electromotive force)\b/i, dimension: "M L^{2} T^{-3} I^{-1}", remember: "Energy divided by charge."},
  {name: "Electric field", pattern: /\b(?:electric field)\b/i, dimension: "M L T^{-3} I^{-1}", remember: "Force divided by charge."},
  {name: "Resistance", pattern: /\b(?:resistance)\b/i, dimension: "M L^{2} T^{-3} I^{-2}", remember: "Voltage divided by current."},
  {name: "Resistivity", pattern: /\b(?:resistivity)\b/i, dimension: "M L^{3} T^{-3} I^{-2}", remember: "Resistance \u00d7 area / length."},
  {name: "Capacitance", pattern: /\b(?:capacitance)\b/i, dimension: "M^{-1} L^{-2} T^{4} I^{2}", remember: "Charge divided by voltage."},
  {name: "Magnetic flux density", pattern: /\b(?:magnetic flux density|magnetic field)\b/i, dimension: "M T^{-2} I^{-1}", remember: "From F = B I l for perpendicular field and conductor."},
  {name: "Magnetic flux", pattern: /\b(?:magnetic flux(?! density))\b/i, dimension: "M L^{2} T^{-2} I^{-1}", remember: "Magnetic flux density \u00d7 area."},
  {name: "Inductance", pattern: /\b(?:inductance)\b/i, dimension: "M L^{2} T^{-2} I^{-2}", remember: "Flux linkage divided by current."},
  {name: "Temperature", pattern: /\b(?:temperature)\b/i, dimension: "\\Theta", remember: "Temperature needs \u0398; it cannot be written using only M, L and T."},
  {name: "Specific heat capacity", pattern: /\b(?:specific heat capacity|specific heat)\b/i, dimension: "L^{2} T^{-2} \\Theta^{-1}", remember: "Energy divided by mass and temperature change."},
  {name: "Heat capacity / entropy", pattern: /\b(?:heat capacity|entropy)\b/i, dimension: "M L^{2} T^{-2} \\Theta^{-1}", remember: "Energy divided by temperature."},
  {name: "Planck constant", pattern: /\b(?:planck.?s? constant)\b/i, dimension: "M L^{2} T^{-1}", remember: "Use E = h \u00d7 frequency."},
  {name: "Refractive index", pattern: /\b(?:refractive index)\b/i, dimension: "M^{0} L^{0} T^{0}", remember: "Ratio of two speeds; all dimensions cancel."},
  {name: "Strain / friction coefficient", pattern: /\b(?:strain|coefficient of friction)\b/i, dimension: "M^{0} L^{0} T^{0}", remember: "Ratio of like quantities; all dimensions cancel."},
  {name: "Permittivity", pattern: /\b(?:permittivity)\b/i, dimension: "M^{-1} L^{-3} T^{4} I^{2}", remember: "Use the dimensions of capacitance \u00d7 length / area."},
  {name: "Permeability", pattern: /\b(?:permeability)\b/i, dimension: "M L T^{-2} I^{-2}", remember: "Use magnetic flux density \u00d7 length / current."},
  {name: "Electric dipole moment", pattern: /\b(?:electric dipole moment)\b/i, dimension: "L T I", remember: "Charge \u00d7 separation."},
  {name: "Magnetic dipole moment", pattern: /\b(?:magnetic dipole moment)\b/i, dimension: "L^{2} I", remember: "Current \u00d7 loop area."},
  {name: "Electric field gradient", pattern: /\b(?:electric field gradient)\b/i, dimension: "M T^{-3} I^{-1}", remember: "Electric field divided by length."},
  {name: "Thermal conductivity", pattern: /\b(?:thermal conductivity)\b/i, dimension: "M L T^{-3} \\Theta^{-1}", remember: "Power \u00d7 length / (area \u00d7 temperature difference)."},
  {name: "Boltzmann constant", pattern: /\b(?:boltzmann.?s? constant)\b/i, dimension: "M L^{2} T^{-2} \\Theta^{-1}", remember: "Energy divided by temperature."},
  {name: "Lens power", pattern: /\b(?:power of (?:a |the )?lens|lens power|optical power)\b/i, dimension: "L^{-1}", remember: "Reciprocal of focal length; SI unit is inverse metre."},
  {name: "Focal length", pattern: /\b(?:focal length)\b/i, dimension: "L", remember: "A focal length is a distance."},
  {name: "Magnification", pattern: /\b(?:magnification)\b/i, dimension: "M^{0} L^{0} T^{0}", remember: "Image size divided by object size."},
  {name: "Decay constant", pattern: /\b(?:decay constant)\b/i, dimension: "T^{-1}", remember: "Probability rate per unit time."},
  {name: "Activity (radioactivity)", pattern: /\b(?:radioactivity|radioactive activity)\b/i, dimension: "T^{-1}", remember: "Number of decays per unit time."},
  {name: "Young modulus / bulk modulus", pattern: /\b(?:young.?s? modulus|bulk modulus|shear modulus)\b/i, dimension: "M L^{-1} T^{-2}", remember: "Stress divided by dimensionless strain."},
 ];

export function withPhysicsDimensions(sections: NoteSection[] | undefined, subject: string, title = ""): NoteSection[] {
  const existing = sections || [];
  if (!/^physics$/i.test(subject) || existing.some(s => s.heading === "MLT Dimensional Formula")) return existing;
  const text = [title, ...existing.flatMap(s => s.lines)].join(" ");
  if (!text.trim()) return existing;
  const matches = quantities.filter(q => q.pattern.test(text)).filter(q => {
    if (q.name === "Power" && /power of (?:a |the )?lens|lens power|optical power|resolving power|magnifying power/i.test(text) && !/electrical power|power dissipated|power consumed|power delivered|mechanical power/i.test(text)) return false;
    if (q.name === "Electric potential / voltage" && /electric potential energy/i.test(text) && !/potential difference|voltage|electromotive force|electric potential(?! energy)/i.test(text)) return false;
    if (q.name === "Mass density" && /charge density|current density|energy density|flux density/i.test(text) && !/mass density/i.test(text)) return false;
    if (q.name === "Speed / velocity" && /angular velocity/i.test(text) && !/linear velocity|linear speed|speed/i.test(text)) return false;
    if (q.name === "Acceleration" && /angular acceleration/i.test(text) && !/linear acceleration/i.test(text)) return false;
    if (q.name === "Momentum / impulse" && /angular momentum/i.test(text) && !/linear momentum|impulse/i.test(text)) return false;
    if (q.name === "Heat capacity / entropy" && /specific heat capacity/i.test(text) && !/entropy/i.test(text)) return false;
    return true;
  });
  const lines = matches.map(q => `${q.name} | $[${q.dimension}]$ | ${q.remember}`);
  return [...existing, {heading: "MLT Dimensional Formula", kind: "bullets", lines: [
    "M = mass; L = length; T = time. I = electric current; Θ = temperature when required. A zero power means that base dimension is absent.",
    ...lines,
    ...(matches.length ? ["Remember: start with a defining equation, substitute dimensions, then add powers when multiplying and subtract powers when dividing. Both sides of an equation must have the same dimensions; this check alone does not prove the equation correct."] : ["This concept has no single dimensional formula. Identify the physical quantity and its defining equation before assigning dimensions; do not assign dimensions to a chapter name."]),
  ]}];
}

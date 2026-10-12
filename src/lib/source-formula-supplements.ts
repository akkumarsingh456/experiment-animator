import { splitMath, isValidLatex } from "@/lib/latex-notation";

type Rule = { subjects: string; topic: string; cue: string; name: string; formula: string };
const rule = (subjects: string, topic: string, cue: string, name: string, formula: string): Rule => ({ subjects, topic, cue, name, formula });
const P = "physics", C = "chemistry", PC = "physics chemistry";
// Canonical school relations are used only when the supplied source attests
// the named law/definition and the slide is about that topic. No invented proofs.
export const SOURCE_FORMULA_RULES: readonly Rule[] = [
  rule(P, "quantisation|quantization|charge", "quantis|quantiz", "Quantisation of charge", String.raw`$Q=ne,\quad n\in\mathbb Z$`),
  rule(P, "conservation.*charge|charge.*conservation", "conservation.*charge|charge.*conserved", "Conservation of charge", String.raw`$\sum Q_{\mathrm{initial}}=\sum Q_{\mathrm{final}}$`),
  rule(P, "coulomb", "coulomb", "Coulomb’s law", String.raw`$F=\frac{1}{4\pi\varepsilon_0}\frac{|q_1q_2|}{r^2}=k\frac{|q_1q_2|}{r^2}$`),
  rule(P, "electric field", "electric field", "Electric field", String.raw`$\vec E=\frac{\vec F}{q_0}$`),
  rule(P, "electric field", "point charge", "Electric field of a point charge", String.raw`$\vec E=\frac{1}{4\pi\varepsilon_0}\frac{q}{r^2}\hat r$`),
  rule(P, "electric flux", "electric flux", "Electric flux", String.raw`$\Phi_E=\vec E\cdot\vec A=EA\cos\theta$`),
  rule(P, "gauss", "gauss", "Gauss’s law", String.raw`$\oint_S\vec E\cdot d\vec A=\frac{Q_{\mathrm{enclosed}}}{\varepsilon_0}$`),
  rule(P, "dipole", "dipole moment", "Electric dipole moment", String.raw`$\vec p=q\vec d$`),
  rule(P, "dipole", "torque", "Torque on an electric dipole", String.raw`$\vec\tau=\vec p\times\vec E$`),
  rule(P, "potential", "point charge", "Potential of a point charge", String.raw`$V=\frac{1}{4\pi\varepsilon_0}\frac{q}{r}$`),
  rule(P, "capacit", "capacit", "Capacitance", String.raw`$C=\frac{Q}{V}$`),
  rule(P, "capacitor", "parallel plate", "Parallel-plate capacitance", String.raw`$C=\frac{\varepsilon_0 A}{d}$`),
  rule(P, "ohm", "ohm", "Ohm’s law", String.raw`$V=IR$`),
  rule(P, "resistiv", "resistiv", "Resistance and resistivity", String.raw`$R=\rho\frac{l}{A}$`),
  rule(P, "current", "current", "Electric current", String.raw`$I=\frac{dQ}{dt}$`),
  rule(P, "drift", "drift", "Current and drift velocity", String.raw`$I=neAv_d$`),
  rule(P, "power", "electric", "Electrical power", String.raw`$P=VI=I^2R=\frac{V^2}{R}$`),
  rule(P, "wheatstone", "wheatstone", "Balanced Wheatstone bridge", String.raw`$\frac{P}{Q}=\frac{R}{S}$`),
  rule(P, "lorentz|magnetic force", "magnetic", "Lorentz force", String.raw`$\vec F=q(\vec E+\vec v\times\vec B)$`),
  rule(P, "biot", "biot", "Biot–Savart law", String.raw`$d\vec B=\frac{\mu_0}{4\pi}\frac{I\,d\vec l\times\hat r}{r^2}$`),
  rule(P, "ampere", "ampere", "Ampere’s circuital law", String.raw`$\oint\vec B\cdot d\vec l=\mu_0 I_{\mathrm{enclosed}}$`),
  rule(P, "faraday|induction", "faraday", "Faraday’s law", String.raw`$\mathcal E=-N\frac{d\Phi_B}{dt}$`),
  rule(P, "magnetic flux", "magnetic flux", "Magnetic flux", String.raw`$\Phi_B=BA\cos\theta$`),
  rule(P, "alternating|rms", "rms", "RMS values for a sinusoidal current", String.raw`$I_{\mathrm{rms}}=\frac{I_0}{\sqrt2},\quad V_{\mathrm{rms}}=\frac{V_0}{\sqrt2}$`),
  rule(P, "refraction|snell", "refraction|snell", "Snell’s law", String.raw`$n_1\sin i=n_2\sin r$`),
  rule(P, "lens", "thin lens", "Thin-lens formula", String.raw`$\frac{1}{f}=\frac{1}{v}-\frac{1}{u}$`),
  rule(P, "mirror", "mirror", "Mirror formula", String.raw`$\frac{1}{f}=\frac{1}{v}+\frac{1}{u}$`),
  rule(P, "young|interference", "young|fringe width", "Young’s double-slit fringe width", String.raw`$\beta=\frac{\lambda D}{d}$`),
  rule(P, "photoelectric", "photoelectric", "Einstein’s photoelectric equation", String.raw`$h\nu=\phi+K_{\max}$`),
  rule(P, "de broglie", "de broglie", "de Broglie wavelength", String.raw`$\lambda=\frac{h}{p}$`),
  rule(P, "binding|mass defect", "mass defect|binding energy", "Mass–energy relation", String.raw`$E=\Delta m\,c^2$`),
  rule(P, "radioactiv|decay", "radioactiv|decay", "Radioactive decay", String.raw`$N=N_0e^{-\lambda t},\quad t_{1/2}=\frac{\ln2}{\lambda}$`),
  rule(P, "acceleration", "acceleration", "Acceleration", String.raw`$a=\frac{dv}{dt}$`),
  rule(P, "kinematic|uniform.*acceleration", "uniform acceleration|constant acceleration", "Uniformly accelerated motion", String.raw`$v=u+at,\quad s=ut+\frac12at^2,\quad v^2=u^2+2as$`),
  rule(P, "newton|force", "newton.*second|rate of change of momentum", "Newton’s second law", String.raw`$\vec F=\frac{d\vec p}{dt}$`),
  rule(P, "friction", "friction", "Limiting static friction", String.raw`$f_{s,\max}=\mu_s N$`),
  rule(P, "work", "work", "Work by a force", String.raw`$W=\int\vec F\cdot d\vec r$`),
  rule(P, "kinetic energy", "kinetic energy", "Kinetic energy", String.raw`$K=\frac12mv^2$`),
  rule(P, "torque", "torque", "Torque", String.raw`$\vec\tau=\vec r\times\vec F$`),
  rule(P, "angular momentum", "angular momentum", "Angular momentum", String.raw`$\vec L=\vec r\times\vec p$`),
  rule(P, "gravitat", "gravitat", "Universal gravitation", String.raw`$F=G\frac{m_1m_2}{r^2}$`),
  rule(P, "escape", "escape", "Escape speed", String.raw`$v_e=\sqrt{\frac{2GM}{R}}$`),
  rule(P, "hooke|stress|elastic", "hooke", "Hooke’s law", String.raw`$\sigma=Y\varepsilon$`),
  rule(P, "bernoulli", "bernoulli", "Bernoulli’s equation", String.raw`$P+\frac12\rho v^2+\rho gh=\mathrm{constant}$`),
  rule(P, "calorimetry|heat capacity", "specific heat|heat capacity", "Heat and temperature change", String.raw`$Q=mc\Delta T$`),
  rule(PC, "thermodynamic|first law", "first law", "First law of thermodynamics", String.raw`$\Delta U=Q-W_{\mathrm{by}}=q+w_{\mathrm{on}}$`),
  rule(PC, "gas|equation of state", "ideal gas", "Ideal-gas equation", String.raw`$PV=nRT$`),
  rule(P, "oscillat|harmonic", "simple harmonic", "Simple harmonic motion", String.raw`$a=-\omega^2x$`),
  rule(P, "pendulum", "simple pendulum", "Small-amplitude pendulum period", String.raw`$T=2\pi\sqrt{\frac{l}{g}}$`),
  rule(P, "wave", "wave speed|wavelength|frequency", "Wave speed", String.raw`$v=\nu\lambda$`),
  rule(C, "mole|stoichiometr", "mole", "Amount of substance", String.raw`$n=\frac{m}{M}=\frac{N}{N_A}$`),
  rule(C, "molarity|concentration", "molarity", "Molarity", String.raw`$c=\frac{n_{\mathrm{solute}}}{V_{\mathrm{solution}}}$`),
  rule(C, "molality|concentration", "molality", "Molality", String.raw`$b=\frac{n_{\mathrm{solute}}}{m_{\mathrm{solvent}}\ (\mathrm{kg})}$`),
  rule(C, "mole fraction|concentration", "mole fraction", "Mole fraction", String.raw`$x_i=\frac{n_i}{\sum_jn_j}$`),
  rule(C, "atomic|structure of atom|bohr", "bohr|hydrogen atom", "Hydrogen-atom energy levels", String.raw`$E_n=-\frac{13.6}{n^2}\,\mathrm{eV}$`),
  rule(C, "gibbs|thermodynamic", "gibbs", "Gibbs energy", String.raw`$\Delta G=\Delta H-T\Delta S$`),
  rule(C, "equilibrium", "equilibrium constant", "Reaction quotient at equilibrium", String.raw`$K_c=\frac{[C]^c[D]^d}{[A]^a[B]^b}\quad\text{for }aA+bB\rightleftharpoons cC+dD$`),
  rule(C, "equilibrium", "partial pressure|k p|kp", "Gas-phase equilibrium constants", String.raw`$K_p=K_c(RT)^{\Delta n_g}$`),
  rule(C, "(?:^| )ph(?: |$)|ionic equilibrium", "(?:^| )ph(?: |$)|hydrogen ion", "pH", String.raw`$\mathrm{pH}=-\log_{10}[\mathrm{H^+}]$`),
  rule(C, "raoult|vapour pressure", "raoult", "Raoult’s law", String.raw`$p_i=x_i p_i^0$`),
  rule(C, "henry|solubility", "henry", "Henry’s law", String.raw`$p=K_Hx$`),
  rule(C, "boiling|colligative", "elevation.*boiling|boiling.*elevation", "Boiling-point elevation", String.raw`$\Delta T_b=iK_b b$`),
  rule(C, "freezing|colligative", "depression.*freezing|freezing.*depression", "Freezing-point depression", String.raw`$\Delta T_f=iK_f b$`),
  rule(C, "osmotic|colligative", "osmotic", "Osmotic pressure", String.raw`$\Pi=i cRT$`),
  rule(C, "nernst|cell potential", "nernst", "Nernst equation", String.raw`$E_{\mathrm{cell}}=E_{\mathrm{cell}}^\circ-\frac{RT}{nF}\ln Q$`),
  rule(C, "conductiv|conductance", "conductiv|conductance", "Molar conductivity", String.raw`$\Lambda_m=\frac{\kappa}{c}$`),
  rule(C, "first order|integrated rate", "first order", "First-order reaction", String.raw`$\ln\frac{[A]_0}{[A]_t}=kt,\quad t_{1/2}=\frac{\ln2}{k}$`),
  rule(C, "arrhenius|temperature.*rate", "arrhenius", "Arrhenius equation", String.raw`$k=Ae^{-E_a/(RT)}$`),
  rule(C, "magnetic|transition", "magnetic moment|unpaired electrons", "Spin-only magnetic moment", String.raw`$\mu=\sqrt{n(n+2)}\,\mu_B$`),
  rule("biology botany zoology", "hardy|genetic equilibrium", "hardy", "Hardy–Weinberg equilibrium", String.raw`$p+q=1,\quad p^2+2pq+q^2=1$`),
  rule("biology botany zoology", "productivity|ecosystem", "net primary productivity", "Primary productivity", String.raw`$\mathrm{NPP}=\mathrm{GPP}-R$`),
];
const normal = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function formulaIdentity(line: string): string {
  return splitMath(line).filter(part => part.type !== "text").map(part => part.value.replace(/\s+/g, "")).join(" ");
}

/** Append only valid, source-attested relations; existing strings are retained. */
export function sourceFormulaLines(title: string, subject: string, excerpts: string[], existing: string[] = []): string[] {
  const evidence = excerpts.join("\n");
  const normTitle = normal(title), normEvidence = normal(evidence);
  if (!normEvidence.trim()) return [];
  const candidates: string[] = [];
  for (const excerpt of excerpts) for (const part of splitMath(excerpt)) {
    if (part.type !== "text" && /[=∝]|\\(?:propto|rightarrow|rightleftharpoons)\b/.test(part.value) && isValidLatex(part.value)) {
      candidates.push(`**Formula:** ${part.type === "block" ? "$$" : "$"}${part.value}${part.type === "block" ? "$$" : "$"}`);
    }
  }
  const lhs = (line: string) => splitMath(line).filter(part => part.type !== "text").map(part => part.value.split("=")[0].replace(/\\(?:vec|mathbf|mathrm)\b|[{}\s]/g, "")).join(" ");
  const explicitLeftSides = new Set(candidates.map(lhs));
  for (const entry of SOURCE_FORMULA_RULES) {
    if (!entry.subjects.split(" ").includes(subject.toLowerCase()) || !new RegExp(entry.topic).test(normTitle) || !new RegExp(entry.cue).test(normEvidence)) continue;
    // Prefer the relation actually supplied by the book over a general form.
    if (explicitLeftSides.has(lhs(entry.formula))) continue;
    candidates.push(`**Formula:** ${entry.name}: ${entry.formula}`);
  }
  const known = new Set(existing.map(formulaIdentity).filter(Boolean));
  return candidates.filter(line => {
    const identity = formulaIdentity(line);
    if (!identity || known.has(identity)) return false;
    known.add(identity); return true;
  });
}

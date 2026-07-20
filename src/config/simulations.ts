// Curated catalog of FREE, high-quality science/math simulations from the
// open web (PhET, GeoGebra, The Physics Classroom, HHMI BioInteractive,
// ChemCollective, Learn.Genetics, CK-12, etc.). Each entry maps
// subject-agnostic keyword cues to an embeddable URL + a human-visible page.
//
// Embedding notes:
// - PhET HTML5 sims embed cleanly via /sims/html/<name>/latest/<name>_en.html
// - GeoGebra materials embed via /material/iframe/id/<id>
// - Some providers (HHMI, Learn.Genetics, Stile) set X-Frame-Options so we
//   also expose a "page" URL to open in a new tab as a guaranteed fallback.

export type Simulation = {
  id: string;
  title: string;
  provider: string;
  /** Embeddable URL (iframe src). */
  url: string;
  /** Human-visible landing page — always safe to open in a new tab. */
  page: string;
  subjects: Array<"physics" | "chemistry" | "biology" | "math" | "general">;
  keywords: string[];
};

const phet = (name: string) => ({
  url: `https://phet.colorado.edu/sims/html/${name}/latest/${name}_en.html`,
  page: `https://phet.colorado.edu/en/simulations/${name}`,
  provider: "PhET · CU Boulder",
});

export const SIMULATIONS: Simulation[] = [
  // ---------------- PHYSICS ----------------
  { id: "phet-circuit-dc", title: "Circuit Construction Kit (DC)", ...phet("circuit-construction-kit-dc"), subjects: ["physics"], keywords: ["circuit", "current", "voltage", "resistor", "resistance", "ohm", "ampere", "battery", "bulb", "switch", "conductor", "electric", "electricity"] },
  { id: "phet-faraday", title: "Faraday's Law", ...phet("faradays-law"), subjects: ["physics"], keywords: ["faraday", "induction", "electromagnetic", "magnet", "magnetic", "flux", "emf", "coil", "solenoid"] },
  { id: "phet-magnets-em", title: "Magnets and Electromagnets", ...phet("magnets-and-electromagnets"), subjects: ["physics"], keywords: ["electromagnet", "magnet", "magnetic field", "solenoid", "compass"] },
  { id: "phet-wave-string", title: "Wave on a String", ...phet("wave-on-a-string"), subjects: ["physics"], keywords: ["wave", "wavelength", "frequency", "amplitude", "transverse", "vibration", "oscillation"] },
  { id: "phet-waves-intro", title: "Waves Intro", ...phet("waves-intro"), subjects: ["physics"], keywords: ["wave", "sound", "light", "water wave", "frequency"] },
  { id: "phet-forces-motion", title: "Forces and Motion: Basics", ...phet("forces-and-motion-basics"), subjects: ["physics"], keywords: ["force", "newton", "friction", "motion", "acceleration", "mass", "push", "pull"] },
  { id: "phet-projectile", title: "Projectile Motion", ...phet("projectile-motion"), subjects: ["physics"], keywords: ["projectile", "trajectory", "gravity", "angle of projection", "range", "velocity"] },
  { id: "phet-gravity-orbits", title: "Gravity and Orbits", ...phet("gravity-and-orbits"), subjects: ["physics"], keywords: ["gravity", "orbit", "planet", "sun", "moon", "satellite", "kepler"] },
  { id: "phet-energy-skate", title: "Energy Skate Park", ...phet("energy-skate-park-basics"), subjects: ["physics"], keywords: ["energy", "kinetic", "potential", "conservation", "work"] },
  { id: "phet-geometric-optics", title: "Geometric Optics", ...phet("geometric-optics"), subjects: ["physics"], keywords: ["lens", "mirror", "optics", "refraction", "focal length", "image", "ray"] },
  { id: "phet-bending-light", title: "Bending Light", ...phet("bending-light"), subjects: ["physics"], keywords: ["refraction", "snell", "light", "prism", "reflection"] },
  { id: "phet-shm", title: "Masses and Springs", ...phet("masses-and-springs"), subjects: ["physics"], keywords: ["spring", "hooke", "shm", "simple harmonic", "oscillation", "period"] },

  // ---------------- CHEMISTRY ----------------
  { id: "phet-build-atom", title: "Build an Atom", ...phet("build-an-atom"), subjects: ["chemistry"], keywords: ["atom", "atomic", "proton", "neutron", "electron", "nucleus", "isotope"] },
  { id: "phet-molecule-shapes", title: "Molecule Shapes", ...phet("molecule-shapes"), subjects: ["chemistry"], keywords: ["molecule", "bond", "vsepr", "shape", "geometry", "lone pair", "covalent"] },
  { id: "phet-states-matter", title: "States of Matter", ...phet("states-of-matter-basics"), subjects: ["chemistry"], keywords: ["solid", "liquid", "gas", "state", "phase", "temperature", "kinetic"] },
  { id: "phet-ph-scale", title: "pH Scale", ...phet("ph-scale"), subjects: ["chemistry"], keywords: ["acid", "base", "ph", "alkali", "indicator", "hydrogen ion"] },
  { id: "phet-reactants-products", title: "Reactants, Products & Leftovers", ...phet("reactants-products-and-leftovers"), subjects: ["chemistry"], keywords: ["reaction", "reactant", "product", "stoichiometry", "equation", "balance"] },
  { id: "phet-balancing-eq", title: "Balancing Chemical Equations", ...phet("balancing-chemical-equations"), subjects: ["chemistry"], keywords: ["balance", "equation", "chemical equation", "coefficient"] },
  { id: "phet-isotopes", title: "Isotopes and Atomic Mass", ...phet("isotopes-and-atomic-mass"), subjects: ["chemistry"], keywords: ["isotope", "atomic mass", "abundance"] },

  // ---------------- BIOLOGY ----------------
  { id: "phet-natural-selection", title: "Natural Selection", ...phet("natural-selection"), subjects: ["biology"], keywords: ["evolution", "natural selection", "adaptation", "gene", "population", "darwin"] },
  { id: "phet-gene-expression", title: "Gene Expression Essentials", ...phet("gene-expression-essentials"), subjects: ["biology"], keywords: ["gene", "dna", "rna", "protein", "transcription", "translation"] },
  { id: "phet-neuron", title: "Neuron", ...phet("neuron"), subjects: ["biology"], keywords: ["neuron", "nerve", "action potential", "ion channel", "synapse"] },
  { id: "phet-membrane-channels", title: "Membrane Channels", ...phet("membrane-channels"), subjects: ["biology"], keywords: ["membrane", "diffusion", "transport", "channel", "cell"] },
  {
    id: "hhmi-cell",
    title: "Interactive Cell (HHMI BioInteractive)",
    provider: "HHMI BioInteractive",
    url: "https://www.biointeractive.org/classroom-resources/interactive-cell",
    page: "https://www.biointeractive.org/classroom-resources/interactive-cell",
    subjects: ["biology"],
    keywords: ["cell", "organelle", "mitochondria", "chloroplast", "nucleus", "cytoplasm", "membrane"],
  },
  {
    id: "learngenetics-tour",
    title: "Tour of the Basics — Learn.Genetics",
    provider: "Learn.Genetics · U. of Utah",
    url: "https://learn.genetics.utah.edu/content/basics/",
    page: "https://learn.genetics.utah.edu/content/basics/",
    subjects: ["biology"],
    keywords: ["dna", "gene", "chromosome", "heredity", "trait", "genetics"],
  },

  // ---------------- MATH ----------------
  { id: "phet-graphing-lines", title: "Graphing Lines", ...phet("graphing-lines"), subjects: ["math"], keywords: ["line", "slope", "intercept", "graph", "linear", "equation"] },
  { id: "phet-area-model", title: "Area Model Algebra", ...phet("area-model-algebra"), subjects: ["math"], keywords: ["algebra", "area", "expansion", "polynomial", "factor"] },
  { id: "phet-trig-tour", title: "Trig Tour", ...phet("trig-tour"), subjects: ["math"], keywords: ["sine", "cosine", "tangent", "trigonometry", "unit circle", "angle"] },
  { id: "phet-fraction-matcher", title: "Fraction Matcher", ...phet("fraction-matcher"), subjects: ["math"], keywords: ["fraction", "equivalent", "numerator", "denominator"] },
  {
    id: "geogebra-geometry",
    title: "GeoGebra Geometry",
    provider: "GeoGebra",
    url: "https://www.geogebra.org/geometry",
    page: "https://www.geogebra.org/geometry",
    subjects: ["math"],
    keywords: ["triangle", "circle", "polygon", "geometry", "angle", "theorem", "pythagoras", "perimeter", "area"],
  },
  {
    id: "geogebra-graphing",
    title: "GeoGebra Graphing Calculator",
    provider: "GeoGebra",
    url: "https://www.geogebra.org/graphing",
    page: "https://www.geogebra.org/graphing",
    subjects: ["math"],
    keywords: ["function", "graph", "plot", "equation", "curve", "parabola", "quadratic"],
  },

  // ---------------- GENERAL FALLBACKS ----------------
  {
    id: "physicsclassroom",
    title: "The Physics Classroom — Interactives",
    provider: "The Physics Classroom",
    url: "https://www.physicsclassroom.com/Physics-Interactives",
    page: "https://www.physicsclassroom.com/Physics-Interactives",
    subjects: ["physics", "general"],
    keywords: ["physics", "mechanics", "electricity", "waves", "thermal"],
  },
  {
    id: "chemcollective",
    title: "ChemCollective Virtual Labs",
    provider: "ChemCollective · CMU",
    url: "http://chemcollective.org/vlabs",
    page: "http://chemcollective.org/vlabs",
    subjects: ["chemistry", "general"],
    keywords: ["titration", "lab", "stoichiometry", "solution", "concentration", "molarity"],
  },
  {
    id: "ck12-simulations",
    title: "CK-12 Simulations Library",
    provider: "CK-12 Foundation",
    url: "https://www.ck12.org/student/",
    page: "https://interactives.ck12.org/simulations/",
    subjects: ["general"],
    keywords: [],
  },
];

const SUBJECT_ALIASES: Record<string, Simulation["subjects"][number]> = {
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
  botany: "biology",
  zoology: "biology",
  science: "general",
  maths: "math",
  math: "math",
  mathematics: "math",
};

export function pickSimulations(
  hay: string,
  subject: string | undefined,
  limit = 3,
): Simulation[] {
  const text = String(hay || "").toLowerCase();
  const subj = SUBJECT_ALIASES[String(subject || "").toLowerCase()] ?? "general";
  const scored = SIMULATIONS.map((s) => {
    const hits = s.keywords.reduce((n, k) => (k && text.includes(k) ? n + 1 : n), 0);
    const subjectBonus = s.subjects.includes(subj) ? 0.5 : 0;
    return { s, score: hits + subjectBonus };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored.slice(0, limit).map((x) => x.s);
  if (chosen.length === 0) {
    // Subject-appropriate default so the panel is never empty.
    const defaults = SIMULATIONS.filter((s) => s.subjects.includes(subj)).slice(0, limit);
    return defaults.length ? defaults : SIMULATIONS.filter((s) => s.subjects.includes("general")).slice(0, limit);
  }
  return chosen;
}

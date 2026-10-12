import { chaptersFor } from "@/lib/ncert-syllabus";

const normal = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const chapterName = (value: string) => value.replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "");
// The page index includes older Med Easy chapters as well as rationalised books.
// It does not change the website's lesson syllabus or existing notes.
const biologyChapters = [
  "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
  "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals",
  "Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division", "Transport in Plants",
  "Mineral Nutrition", "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development",
  "Digestion and Absorption", "Breathing and Exchange of Gases", "Body Fluids and Circulation",
  "Excretory Products and their Elimination", "Locomotion and Movement", "Neural Control and Coordination",
  "Chemical Coordination and Integration", "Reproduction in Organisms", "Sexual Reproduction in Flowering Plants",
  "Human Reproduction", "Reproductive Health", "Principles of Inheritance and Variation",
  "Molecular Basis of Inheritance", "Evolution", "Human Health and Disease", "Strategies for Enhancement in Food Production",
  "Microbes in Human Welfare", "Biotechnology: Principles and Processes", "Biotechnology and its Applications",
  "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation", "Environmental Issues",
];
const olderChemistryChapters = ["States of Matter", "The Solid State", "Hydrogen", "The s-Block Elements", "The p-Block Elements", "General Principles and Processes of Isolation of Elements", "Polymers", "Chemistry in Everyday Life"];
const aliases: Record<string, string[]> = {
  "some basic concepts of chemistry": ["mole concept"],
  "classification of elements and periodicity in properties": ["periodic table", "periodic classification"],
  "chemical bonding and molecular structure": ["chemical bonding"],
  "structure of atom": ["atomic structure"],
  "chemical thermodynamics": ["thermodynamics", "thermochemistry"],
  "equilibrium": ["chemical equilibrium", "ionic equilibrium"],
  "states of matter": ["gaseous state"],
  "the solid state": ["solid state"],
  "general principles and processes of isolation of elements": ["metallurgy"],
  "amines": ["nitrogen compounds amines"],
  "organic chemistry some basic principles and techniques": ["general organic chemistry", "goc"],
  "haloalkanes and haloarenes": ["haloalkane and haloarene"],
  "aldehydes ketones and carboxylic acids": ["aldehyde ketone and carboxylic acid"],
  "the p block elements": ["p block", "halogens", "inert gases"],
  "the s block elements": ["s block"],
  "the d and f block elements": ["d block", "f block"],
  "coordination compounds": ["coordination compound"],
  "motion in a straight line": ["motion in 1 d", "motion in one dimension"],
  "motion in a plane": ["motion in two dimensions", "projectile motion"],
  "laws of motion": ["newton s laws of motion", "friction"],
  "work energy and power": ["work energy power"],
  "system of particles and rotational motion": ["rotational motion", "center of mass", "centre of mass", "collision"],
  "mechanical properties of solids": ["elasticity"],
  "mechanical properties of fluids": ["fluid mechanics"],
  "thermal properties of matter": ["heat transfer"],
  "kinetic theory": ["ktg"],
  "oscillations": ["simple harmonic motion"],
  "waves": ["wave and sound motion"],
  "electric charges and fields": ["electrostatics"],
  "electrostatic potential and capacitance": ["electric potential", "capacitor", "capacitance"],
  "moving charges and magnetism": ["magnetic effect of electric current"],
  "electromagnetic waves": ["electromagnetic wave"],
  "ray optics and optical instruments": ["ray optics"],
  "dual nature of radiation and matter": ["dual nature"],
  "semiconductor electronics": ["semiconductor", "semiconductors", "semiconductor electronics materials devices and simple circuits"],
};

/** OCR is an index only. It must never replace approved notes or equations. */
export function indexLocalBookPage(subject: string, text: string, previousChapter = "") {
  const canonicalSubject = /phys/i.test(subject) ? "Physics" : /chem/i.test(subject) ? "Chemistry" : "Biology";
  const chapters = [...chaptersFor("11", canonicalSubject), ...chaptersFor("12", canonicalSubject)];
  const names = [...chapters.map(chapter => chapterName(chapter.chapter)), ...(canonicalSubject === "Biology" ? biologyChapters : canonicalSubject === "Chemistry" ? olderChemistryChapters : [])];
  const unique = new Map(names.map(chapter => [normal(chapter), chapter]));
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const frontMatter = /\b(?:contents|table of contents|index|med easy|handwritten notes|team kohinoor)\b/i.test(lines.slice(0, 3).join(" ")) &&
    (/\b(?:contents|index|class notes|handwritten notes|by dr|by samapti)\b/i.test(lines.slice(0, 8).join(" ")));
  if (frontMatter) return { chapter: "", needsReview: false, matchText: "" };
  const headings = lines.slice(0, 12).filter(line => line.length < 140).map(line =>
    normal(chapterName(line)).replace(/^\d+(?: \d+)* /, "").replace(/ \d+$/, ""));
  const compact = (value: string) => value.replace(/\s/g, "");
  const matches = [...unique].filter(([key]) => [key, ...(aliases[key] || [])].some(alias => headings.some(heading => heading === alias || compact(heading) === compact(alias))));
  const explicitNewChapter = lines.slice(0, 12).some(line => /^\s*(?:chapter|unit)\s*(?:\d+|[ivx]+)\b/i.test(line));
  const previous = unique.get(normal(chapterName(previousChapter)));
  const chapter = matches.length === 1 ? matches[0][1] : matches.length > 1 || explicitNewChapter ? "" : previous || "";
  const matchText = text.replace(/\b(?:scanned with|oken scanner|camscanner|team kohinoor)\b/gi, " ").trim().slice(0, 20000);
  return { chapter, matchText, needsReview: !chapter || matchText.length < 30 };
}

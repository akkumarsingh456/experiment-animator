import { plainMathText } from "@/lib/latex-notation";

export type ConceptMapInput = {
  title: string;
  bullets?: string[];
  notes?: string[];
  sections?: Array<{ heading: string; kind?: string; lines: string[] }>;
  keyTerms?: Array<{ term: string; meaning: string }>;
};

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));
const text = (value: string) => plainMathText(value.replace(/\*\*/g, "")).replace(/\s+/g, " ").trim();

/** Branches show membership in the topic, never an invented cause or chronology. */
export function sourceConceptFacts(input: ConceptMapInput): string[] {
  const sections = input.sections?.filter((section) => section.kind !== "diagram").flatMap((section) => section.lines.map((line) =>
    /^\*\*/.test(line) || section.heading === "Teacher Notes" ? line : `**${section.heading}:** ${line}`)) || [];
  const factual = sections.filter((line) => !/^\*\*(?:learning objective|prerequisite|activity|experiment|discussion|support practice|core practice|challenge practice|exit ticket|check your understanding|practice|answer|solution|derivation|formula|equation|variable|si unit|unit|dimension)/i.test(line));
  const lines = factual.length ? factual : [...(input.bullets || []), ...(input.notes || []), ...(input.keyTerms || []).map((term) => `${term.term}: ${term.meaning}`)];
  // Retain authored LaTeX for HTML study maps. Only the SVG fallback flattens it.
  return [...new Set(lines.map((line) => line.replace(/^\*\*([^*]+):\*\*\s*/, "").trim()).filter(Boolean))];
}

function wrap(value: string, width: number): string[] {
  const words = value.split(/\s+/), lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > width) { lines.push(line); line = ""; }
    // Long words are split instead of escaping their card or disappearing.
    if (word.length > width) {
      if (line) { lines.push(line); line = ""; }
      for (let at = 0; at < word.length; at += width) lines.push(word.slice(at, at + width));
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export function renderSourceConceptMap(input: ConceptMapInput, facts = sourceConceptFacts(input).slice(0, 4)): string {
  const heading = wrap(text(input.title), 43);
  const top = 42 + heading.length * 32;
  let y = top + 28;
  const cards = facts.map((fact, index) => {
    const lines = wrap(text(fact), 57);
    const height = 38 + lines.length * 27;
    const middle = y + height / 2;
    const svg = `<path d="M42 ${top} V${middle} H90" stroke="#56858d" stroke-width="3" fill="none"/><rect x="90" y="${y}" width="640" height="${height}" rx="12" fill="${index % 2 ? "#fff6e7" : "#edf7f5"}" stroke="#adc8c8"/><circle cx="42" cy="${middle}" r="7" fill="#246f80"/>${lines.map((line, i) => `<text x="112" y="${y + 32 + i * 27}" font-size="21" fill="#183541">${escape(line)}</text>`).join("")}`;
    y += height + 18;
    return svg;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${y + 15}" viewBox="0 0 760 ${y + 15}" role="img" font-family="Arial, Noto Sans Devanagari, sans-serif"><rect width="760" height="${y + 15}" rx="16" fill="#fff"/>${heading.map((line, i) => `<text x="28" y="${38 + i * 32}" font-size="27" font-weight="700" fill="#174e5e">${escape(line)}</text>`).join("")}${cards.join("")}</svg>`;
}

export function svgDataUrl(svg: string): string {
  const encoded = typeof Buffer !== "undefined" ? Buffer.from(svg, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

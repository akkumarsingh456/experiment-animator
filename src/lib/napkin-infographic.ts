import { plainMathText } from "@/lib/latex-notation";

/**
 * Zero-cost, topic-aware educational illustration renderer.
 *
 * This module deliberately consumes existing slide text without changing it.
 * It turns a small, deduplicated set of ideas into a large labelled textbook
 * diagram rather than squeezing the whole note block into a generic mind map.
 */
export type FactInput = {
  title: string;
  bullets?: string[];
  notes?: string[];
  keyTerms?: Array<{ term: string; meaning: string }>;
  subject?: string;
  slideIndex?: number;
};

type Fact = { label: string; caption: string };
type Palette = { ink: string; accent: string; accent2: string; pale: string; pale2: string };

const W = 1600;
const H = 900;
const PAPER = "#fbfaf6";
const NAVY = "#123858";

const PALETTES: Record<string, Palette> = {
  physics: { ink: "#143a55", accent: "#287e9b", accent2: "#dc7b43", pale: "#dceff2", pale2: "#f7e2d3" },
  chemistry: { ink: "#164c48", accent: "#218b7b", accent2: "#c56f45", pale: "#daf1eb", pale2: "#fae4d7" },
  biology: { ink: "#24513a", accent: "#4b9565", accent2: "#c06c4e", pale: "#e0f0e4", pale2: "#f8e3da" },
  maths: { ink: "#45366d", accent: "#7460a8", accent2: "#c08b2f", pale: "#e9e3f5", pale2: "#f8edcf" },
  social: { ink: "#4b4431", accent: "#5c8290", accent2: "#b8783e", pale: "#e2edf0", pale2: "#f5e6d5" },
};

function paletteFor(subject = ""): Palette {
  const s = subject.toLowerCase();
  if (/phys|science/.test(s)) return PALETTES.physics;
  if (/chem/.test(s)) return PALETTES.chemistry;
  if (/bio|botan|zoolog/.test(s)) return PALETTES.biology;
  if (/math/.test(s)) return PALETTES.maths;
  return PALETTES.social;
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function clean(value: string) {
  return plainMathText(String(value || ""))
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/^[-•*\d.\s)]+/, "")
    .replace(/^\*{0,2}(definition|formula|si units?|key terms?|important terms?|derivation|example|memory trick|introduction|key point)\*{0,2}\s*[:—-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = clean(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length + 2) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[,.;:]$/, "")}…`;
  }
  return lines;
}

function factsFrom(input: FactInput): Fact[] {
  const candidates: Fact[] = [];
  for (const item of input.keyTerms || []) {
    const label = clean(item.term);
    if (label) candidates.push({ label, caption: clean(item.meaning) });
  }
  for (const source of [...(input.bullets || []), ...(input.notes || [])]) {
    const line = clean(source);
    if (line.length < 8) continue;
    const split = line.match(/^(.{3,34}?)(?:\s*[:—–]\s+)(.+)$/);
    if (split) candidates.push({ label: clean(split[1]), caption: clean(split[2]) });
    else {
      const words = line.split(" ");
      candidates.push({ label: words.slice(0, 4).join(" "), caption: words.slice(4).join(" ") });
    }
  }
  const seen = new Set<string>();
  return candidates.filter((fact) => {
    const key = fact.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (key.length < 3 || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function textLines(lines: string[], x: number, y: number, opts: { size: number; weight?: number; fill?: string; anchor?: "start" | "middle"; gap?: number }) {
  const anchor = opts.anchor ?? "start";
  const gap = opts.gap ?? Math.round(opts.size * 1.22);
  return lines.map((line, i) => `<text x="${x}" y="${y + i * gap}" text-anchor="${anchor}" font-family="Arial,Helvetica,sans-serif" font-size="${opts.size}" font-weight="${opts.weight ?? 500}" fill="${opts.fill ?? NAVY}">${esc(line)}</text>`).join("");
}

function callout(x: number, y: number, w: number, fact: Fact, index: number, palette: Palette) {
  const label = wrap(fact.label, 22, 2);
  const caption = wrap(fact.caption, 34, 2);
  const fill = index % 2 ? palette.pale2 : palette.pale;
  const edge = index % 2 ? palette.accent2 : palette.accent;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="168" rx="18" fill="${fill}" stroke="${edge}" stroke-width="3"/>`,
    `<circle cx="${x + 30}" cy="${y + 30}" r="17" fill="${edge}"/>`,
    `<text x="${x + 30}" y="${y + 37}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="#ffffff">${index + 1}</text>`,
    textLines(label, x + 58, y + 37, { size: 25, weight: 800, fill: palette.ink, gap: 29 }),
    caption.length ? `<line x1="${x + 24}" y1="${y + 87}" x2="${x + w - 24}" y2="${y + 87}" stroke="${edge}" stroke-width="1.5" opacity=".35"/>` : "",
    textLines(caption, x + 25, y + 119, { size: 20, weight: 500, fill: "#344b58", gap: 25 }),
  ].join("");
}

function arrowPath(d: string, color: string, dashed = false) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"${dashed ? ' stroke-dasharray="8 8"' : ""} marker-end="url(#arrow)"/>`;
}

function circuitVisual(x: number, y: number, w: number, h: number, p: Palette) {
  const left = x + 100;
  const right = x + w - 100;
  const top = y + 95;
  const bottom = y + h - 92;
  const midX = x + w / 2;
  const parts = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="#ffffff" stroke="${p.accent}" stroke-width="3"/>`,
    `<path d="M ${left} ${top} H ${midX - 105} M ${midX + 105} ${top} H ${right} V ${bottom} H ${midX + 55} M ${midX - 55} ${bottom} H ${left} Z" fill="none" stroke="${p.ink}" stroke-width="7" stroke-linecap="round"/>`,
    `<path d="M ${midX - 105} ${top} l 30 -30 l 30 60 l 30 -60 l 30 60 l 30 -60 l 30 30" fill="none" stroke="${p.accent2}" stroke-width="7" stroke-linejoin="round"/>`,
    `<line x1="${midX - 18}" y1="${bottom - 42}" x2="${midX - 18}" y2="${bottom + 42}" stroke="${p.ink}" stroke-width="6"/>`,
    `<line x1="${midX + 18}" y1="${bottom - 25}" x2="${midX + 18}" y2="${bottom + 25}" stroke="${p.ink}" stroke-width="3"/>`,
    arrowPath(`M ${left + 10} ${top - 28} H ${left + 110}`, p.accent),
    `<circle cx="${right}" cy="${y + h / 2}" r="44" fill="${p.pale}" stroke="${p.accent}" stroke-width="5"/>`,
    `<text x="${right}" y="${y + h / 2 + 11}" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-weight="700" fill="${p.ink}">A</text>`,
    textLines(["resistor (R)"], midX, top - 58, { size: 23, weight: 700, fill: p.ink, anchor: "middle" }),
    textLines(["cell / source"], midX, bottom + 72, { size: 23, weight: 700, fill: p.ink, anchor: "middle" }),
    textLines(["current I"], left + 60, top - 52, { size: 22, weight: 700, fill: p.accent, anchor: "middle" }),
    textLines(["ammeter"], right, y + h / 2 + 76, { size: 21, weight: 700, fill: p.ink, anchor: "middle" }),
  ];
  return parts.join("");
}

function atomVisual(x: number, y: number, w: number, h: number, p: Palette) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="#ffffff" stroke="${p.accent}" stroke-width="3"/>`,
    `<circle cx="${cx}" cy="${cy}" r="52" fill="${p.pale2}" stroke="${p.accent2}" stroke-width="4"/>`,
    `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="800" fill="${p.ink}">NUCLEUS</text>`,
    `<ellipse cx="${cx}" cy="${cy}" rx="210" ry="78" fill="none" stroke="${p.accent}" stroke-width="4"/>`,
    `<ellipse cx="${cx}" cy="${cy}" rx="210" ry="78" fill="none" stroke="${p.accent}" stroke-width="4" transform="rotate(60 ${cx} ${cy})"/>`,
    `<ellipse cx="${cx}" cy="${cy}" rx="210" ry="78" fill="none" stroke="${p.accent}" stroke-width="4" transform="rotate(-60 ${cx} ${cy})"/>`,
    `<circle cx="${cx + 210}" cy="${cy}" r="15" fill="${p.accent2}"/>`,
    `<circle cx="${cx - 105}" cy="${cy - 158}" r="15" fill="${p.accent2}"/>`,
    `<circle cx="${cx - 105}" cy="${cy + 158}" r="15" fill="${p.accent2}"/>`,
    textLines(["electron"], cx + 230, cy - 20, { size: 21, weight: 700, fill: p.ink }),
  ].join("");
}

function cellVisual(x: number, y: number, w: number, h: number, p: Palette) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="#ffffff" stroke="${p.accent}" stroke-width="3"/>`,
    `<path d="M ${cx - 235} ${cy} C ${cx - 230} ${cy - 150}, ${cx - 80} ${cy - 190}, ${cx + 90} ${cy - 155} C ${cx + 245} ${cy - 125}, ${cx + 265} ${cy + 45}, ${cx + 160} ${cy + 145} C ${cx + 55} ${cy + 225}, ${cx - 210} ${cy + 170}, ${cx - 235} ${cy} Z" fill="${p.pale}" stroke="${p.accent}" stroke-width="5"/>`,
    `<circle cx="${cx - 35}" cy="${cy}" r="75" fill="${p.pale2}" stroke="${p.accent2}" stroke-width="5"/>`,
    `<circle cx="${cx - 35}" cy="${cy}" r="22" fill="${p.accent2}" opacity=".65"/>`,
    `<ellipse cx="${cx + 112}" cy="${cy - 60}" rx="52" ry="24" fill="#ffffff" stroke="${p.accent}" stroke-width="4"/>`,
    `<path d="M ${cx + 75} ${cy - 60} q 18 -15 36 0 t36 0" fill="none" stroke="${p.accent}" stroke-width="3"/>`,
    arrowPath(`M ${cx - 88} ${cy - 70} Q ${cx - 175} ${cy - 150} ${cx - 255} ${cy - 160}`, p.accent2),
    textLines(["nucleus"], cx - 270, cy - 170, { size: 22, weight: 700, fill: p.ink }),
    arrowPath(`M ${cx + 145} ${cy - 80} Q ${cx + 210} ${cy - 130} ${cx + 255} ${cy - 160}`, p.accent),
    textLines(["organelle"], cx + 180, cy - 170, { size: 22, weight: 700, fill: p.ink }),
  ].join("");
}

function graphVisual(x: number, y: number, w: number, h: number, p: Palette, direct: boolean) {
  const ox = x + 95;
  const oy = y + h - 78;
  const right = x + w - 62;
  const top = y + 55;
  const curve = direct
    ? `M ${ox + 8} ${oy - 8} L ${right - 20} ${top + 25}`
    : `M ${ox + 8} ${top + 25} C ${ox + 115} ${top + 50}, ${right - 155} ${oy - 35}, ${right - 20} ${oy - 15}`;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="#ffffff" stroke="${p.accent}" stroke-width="3"/>`,
    arrowPath(`M ${ox} ${oy} H ${right}`, p.ink),
    arrowPath(`M ${ox} ${oy} V ${top}`, p.ink),
    `<path d="${curve}" fill="none" stroke="${p.accent2}" stroke-width="8" stroke-linecap="round"/>`,
    `<line x1="${ox}" y1="${oy - 105}" x2="${right - 10}" y2="${oy - 105}" stroke="${p.accent}" stroke-width="2" stroke-dasharray="8 9" opacity=".45"/>`,
    textLines(["dependent variable"], ox - 26, top + 8, { size: 19, weight: 700, fill: p.ink }),
    textLines(["independent variable"], right - 185, oy + 52, { size: 19, weight: 700, fill: p.ink }),
    `<circle cx="${direct ? right - 150 : ox + 190}" cy="${direct ? top + 100 : top + 135}" r="9" fill="${p.accent2}"/>`,
  ].join("");
}

function genericVisual(x: number, y: number, w: number, h: number, p: Palette, facts: Fact[]) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const labels = facts.slice(0, 3);
  const points = [{ x: cx, y: y + 72 }, { x: x + 120, y: y + h - 72 }, { x: x + w - 120, y: y + h - 72 }];
  const parts = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="#ffffff" stroke="${p.accent}" stroke-width="3"/>`];
  points.forEach((point, i) => {
    if (i > 0) parts.push(arrowPath(`M ${points[i - 1].x} ${points[i - 1].y} Q ${cx} ${cy} ${point.x} ${point.y}`, p.accent));
    parts.push(`<circle cx="${point.x}" cy="${point.y}" r="60" fill="${i % 2 ? p.pale2 : p.pale}" stroke="${i % 2 ? p.accent2 : p.accent}" stroke-width="4"/>`);
    const lines = wrap(labels[i]?.label || `Concept ${i + 1}`, 13, 2);
    parts.push(textLines(lines, point.x, point.y - (lines.length - 1) * 14 + 8, { size: 20, weight: 800, fill: p.ink, anchor: "middle", gap: 27 }));
  });
  return parts.join("");
}

function mainVisual(input: FactInput, facts: Fact[], x: number, y: number, w: number, h: number, p: Palette) {
  const hay = `${input.title} ${input.subject} ${facts.map((f) => `${f.label} ${f.caption}`).join(" ")}`.toLowerCase();
  if (/current|circuit|ohm|resistor|voltage|electric/.test(hay)) return circuitVisual(x, y, w, h, p);
  if (/atom|electron|nucleus|orbital|molecule|bond/.test(hay)) return atomVisual(x, y, w, h, p);
  if (/cell|organelle|tissue|nucleus|mitochond|chloroplast/.test(hay)) return cellVisual(x, y, w, h, p);
  if (/graph|variation|proportional|relation|function|equation|rate|velocity|distance/.test(hay)) return graphVisual(x, y, w, h, p, /direct|linear|ohm|proportional/.test(hay));
  return genericVisual(x, y, w, h, p, facts);
}

export function renderNapkinInfographic(input: FactInput): string {
  const palette = paletteFor(input.subject);
  const facts = factsFrom(input);
  const safeFacts = facts.length ? facts : [{ label: clean(input.title) || "Core concept", caption: "NCERT topic overview" }];
  const title = wrap(clean(input.title).toUpperCase() || "NCERT TOPIC", 55, 2);
  const titleSize = title.length > 1 ? 31 : 37;
  const titleY = title.length > 1 ? 58 : 71;
  const defs = `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${palette.accent}"/></marker>`;
  const header = [
    `<rect x="54" y="30" width="1492" height="112" rx="18" fill="${NAVY}"/>`,
    `<rect x="80" y="56" width="10" height="62" rx="5" fill="${palette.accent2}"/>`,
    textLines(title, 112, titleY, { size: titleSize, weight: 800, fill: "#ffffff", gap: 37 }),
    `<text x="1510" y="111" text-anchor="end" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#d9e7ef">${esc((input.subject || "NCERT").toUpperCase())} · ${(input.slideIndex ?? 0) + 1}</text>`,
  ].join("");

  const visualX = 448;
  const visualY = 188;
  const visualW = 704;
  const visualH = 590;
  const body = [mainVisual(input, safeFacts, visualX, visualY, visualW, visualH, palette)];
  const cardPositions = [
    { x: 54, y: 210 },
    { x: 54, y: 566 },
    { x: 1190, y: 210 },
    { x: 1190, y: 566 },
  ];
  safeFacts.slice(0, 4).forEach((fact, i) => {
    const pos = cardPositions[i];
    body.push(callout(pos.x, pos.y, 356, fact, i, palette));
    const startX = i < 2 ? pos.x + 356 : pos.x;
    const startY = pos.y + 84;
    const endX = i < 2 ? visualX - 12 : visualX + visualW + 12;
    const endY = i % 2 === 0 ? visualY + 155 : visualY + visualH - 155;
    body.unshift(arrowPath(`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`, palette.accent, true));
  });

  const footer = [
    `<line x1="54" y1="836" x2="1546" y2="836" stroke="${palette.accent}" stroke-width="2" opacity=".35"/>`,
    `<circle cx="72" cy="866" r="7" fill="${palette.accent2}"/>`,
    `<text x="92" y="872" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${palette.ink}">Concept illustration · labels derived from the slide</text>`,
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${PAPER}"/><path d="M0 175 H1600 M0 810 H1600" stroke="${palette.pale}" stroke-width="3"/>${header}${body.join("")}${footer}</svg>`;
}

export function renderNapkinInfographicDataUrl(input: FactInput): string {
  const svg = renderNapkinInfographic(input);
  const b64 = typeof Buffer !== "undefined" ? Buffer.from(svg, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}
/**
 * Hand-drawn NCERT "cheat-sheet poster" renderer.
 *
 * Produces the exact requested layout as a deterministic SVG (zero credits,
 * never fails, never repeats a layout for adjacent slides):
 *
 *   ┌ header: title + subject icon + rule ─────────────────────────────┐
 *   │ 1 DEFINITION            │ 4 GRAPHICAL DIAGRAM                    │
 *   │ 2 KEY FORMULAS (boxed)  │   minimalist labelled vector diagram   │
 *   │ 3 UNITS & DIMENSIONS    │ 5 KEY POINTS                           │
 *   │ ─ MEMORY TRICK / EXAM TIP callout bubble ───────────────────────  │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Style: cream paper, fountain-pen lettering, soft pastel blue / yellow / pink
 * section boxes, clean vector science diagrams with labelled arrows.
 * Every line of text is measured and wrapped, so nothing overlaps or clips.
 */

import { buildLocalSections, type NoteSection } from "@/lib/ncert-teacher-notes";

export type CheatSheetInput = {
  title: string;
  bullets?: string[];
  notes?: string[];
  keyTerms?: Array<{ term: string; meaning: string }>;
  grounding?: string;
  sections?: NoteSection[];
  subject?: string;
  slideIndex?: number;
};

const W = 1600;
const H = 1000;

// Single-quoted family names only: these strings go straight into an SVG
// double-quoted attribute, so embedded double quotes would break the XML.
const PEN = "'Segoe Print','Bradley Hand','Chalkboard SE','Comic Sans MS','Comic Neue',cursive";
const NIB = PEN;
const MATH = "'Cambria Math','Latin Modern Math',Georgia,'Times New Roman',serif";

const INK = "#22303c";
const INK_SOFT = "#465a6b";
const PAPER = "#FFFDF6";

const PASTELS = [
  { fill: "#E7F1FB", edge: "#8FB6DA", tab: "#3E6E9E" }, // blue
  { fill: "#FDF6DC", edge: "#DFC777", tab: "#8A6B18" }, // yellow
  { fill: "#FBE9EF", edge: "#E3A8BC", tab: "#9A4763" }, // pink
  { fill: "#E9F5EE", edge: "#9CC9AE", tab: "#3C7350" }, // mint
];

/* ------------------------------- text utils ------------------------------- */

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const clean = (s: string) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .replace(/^[-•*\d.\s)]+/, "")
    .trim();

/** Rough advance width per character for the handwriting stack. */
function wrapText(text: string, width: number, size: number, maxLines: number): string[] {
  const per = size * 0.52;
  const max = Math.max(8, Math.floor(width / per));
  const words = clean(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = next;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines) {
    const shown = lines.join(" ").length;
    if (clean(text).length > shown + 1) lines[maxLines - 1] = lines[maxLines - 1].replace(/[,;:.]$/, "") + "…";
  }
  return lines;
}

function text(
  x: number,
  y: number,
  body: string,
  opts: { size?: number; weight?: number; fill?: string; anchor?: string; font?: string; italic?: boolean } = {},
) {
  const { size = 20, weight = 400, fill = INK, anchor = "start", font = PEN, italic = false } = opts;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}"${italic ? ' font-style="italic"' : ""} fill="${fill}">${esc(body)}</text>`;
}

/* ------------------------------ section model ----------------------------- */

type Pick = { def: string[]; formulas: string[]; units: string[]; points: string[]; tip: string; terms: string[] };

const pickBy = (secs: NoteSection[], re: RegExp) =>
  secs.filter((s) => re.test(s.heading)).flatMap((s) => s.lines.map(clean)).filter(Boolean);

function collect(input: CheatSheetInput): Pick {
  const secs = input.sections?.length
    ? input.sections
    : buildLocalSections({
        title: input.title,
        bullets: input.bullets,
        notes: input.notes,
        key_terms: input.keyTerms?.map((t) => ({ term: t.term, meaning: t.meaning })),
        grounding: input.grounding,
      });

  const def = pickBy(secs, /definition/i);
  const formulas = pickBy(secs, /formula/i);
  const units = pickBy(secs, /unit|dimension|measure/i);
  const tipLines = pickBy(secs, /memory|tip/i);
  const terms = pickBy(secs, /key terms/i);
  const points = pickBy(secs, /propert|important|example|activity|real-life|use/i);

  const spare = [...(input.bullets || []), ...(input.notes || [])].map(clean).filter(Boolean);
  const seen = new Set<string>();
  const uniq = (arr: string[]) =>
    arr.filter((l) => {
      const k = l.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const d = uniq(def).slice(0, 2);
  const f = uniq(formulas.length ? formulas : spare.filter((s) => /[A-Za-zΔ]\s*=\s*[^=]/.test(s))).slice(0, 4);
  const u = uniq(units.length ? units : spare.filter((s) => /\bSI unit\b|\bunit\b|dimension/i.test(s))).slice(0, 3);
  const p = uniq(points.length ? points : spare).slice(0, 6);
  const t = uniq(terms).slice(0, 3);
  const tip = clean(tipLines[0] || t[0] || d[0] || p[0] || "");

  return {
    def: d.length ? d : uniq(spare).slice(0, 2),
    formulas: f,
    units: u,
    points: p,
    tip,
    terms: t,
  };
}

/* -------------------------------- chrome ---------------------------------- */

function paper(seedIcon: number) {
  const ruled: string[] = [];
  for (let y = 190; y < H - 60; y += 42) {
    ruled.push(`<line x1="60" y1="${y}" x2="${W - 60}" y2="${y}" stroke="#1d5c96" stroke-width="1" opacity="0.045"/>`);
  }
  return [
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>`,
    `<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="10" fill="none" stroke="#c9b98f" stroke-width="2" opacity="0.55"/>`,
    `<rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="8" fill="none" stroke="#c9b98f" stroke-width="1" stroke-dasharray="2 7" opacity="0.5"/>`,
    ruled.join(""),
    `<circle cx="${W - 96}" cy="${H - 96}" r="52" fill="${PASTELS[seedIcon % 4].fill}" opacity="0.5"/>`,
  ].join("");
}

function iconAtom(x: number, y: number, c: string) {
  return `<g transform="translate(${x},${y})" stroke="${c}" fill="none" stroke-width="2.6"><circle r="5" fill="${c}" stroke="none"/><ellipse rx="24" ry="10"/><ellipse rx="24" ry="10" transform="rotate(60)"/><ellipse rx="24" ry="10" transform="rotate(-60)"/></g>`;
}

function iconBulb(x: number, y: number, c: string) {
  return `<g transform="translate(${x},${y})" stroke="${c}" fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M0 -22 a16 16 0 0 1 10 28 v6 h-20 v-6 a16 16 0 0 1 10 -28 z"/><line x1="-6" y1="16" x2="6" y2="16"/><line x1="-4" y1="22" x2="4" y2="22"/><line x1="0" y1="-30" x2="0" y2="-36"/><line x1="-20" y1="-16" x2="-26" y2="-20"/><line x1="20" y1="-16" x2="26" y2="-20"/></g>`;
}

function header(title: string, subject: string, seed: number) {
  const c = PASTELS[seed % 4];
  const lines = wrapText(title.toUpperCase(), W - 320, 40, 2);
  const icon = /phys|chem|bio|sci/i.test(subject) ? iconAtom(112, 100, c.tab) : iconBulb(112, 100, c.tab);
  const out = [
    `<rect x="60" y="46" width="${W - 120}" height="${lines.length > 1 ? 118 : 100}" rx="16" fill="${c.fill}" stroke="${c.edge}" stroke-width="2.5"/>`,
    `<circle cx="112" cy="100" r="38" fill="#fff" stroke="${c.edge}" stroke-width="2"/>`,
    icon,
  ];
  lines.forEach((l, i) => {
    out.push(
      text(178, 46 + (lines.length > 1 ? 54 : 66) + i * 44, l, {
        size: lines.length > 1 ? 36 : 40,
        weight: 700,
        fill: c.tab,
        font: NIB,
      }),
    );
  });
  out.push(
    text(W - 84, 46 + (lines.length > 1 ? 118 : 100) - 26, subject ? subject.toUpperCase() : "NCERT", {
      size: 17,
      weight: 700,
      fill: c.tab,
      anchor: "end",
    }),
  );
  out.push(
    `<path d="M 178 ${46 + (lines.length > 1 ? 118 : 100) - 14} q 90 -9 180 0 t 180 0" fill="none" stroke="#d9a72c" stroke-width="4" stroke-linecap="round" opacity="0.85"/>`,
  );
  return { svg: out.join(""), bottom: 46 + (lines.length > 1 ? 118 : 100) + 22 };
}

/* -------------------------------- blocks ---------------------------------- */

type Block = { svg: string; h: number };

function blockShell(x: number, y: number, w: number, h: number, n: number, heading: string, pal: number) {
  const c = PASTELS[pal % 4];
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c.fill}" stroke="${c.edge}" stroke-width="2.5"/>`,
    `<circle cx="${x + 30}" cy="${y + 30}" r="17" fill="${c.tab}"/>`,
    text(x + 30, y + 37, String(n), { size: 18, weight: 800, fill: "#fff", anchor: "middle", font: NIB }),
    text(x + 58, y + 37, heading.toUpperCase(), { size: 20, weight: 800, fill: c.tab, font: NIB }),
  ].join("");
}

function textBlock(
  x: number,
  y: number,
  w: number,
  n: number,
  heading: string,
  lines: string[],
  pal: number,
  opts: { bullets?: boolean; size?: number; maxLines?: number } = {},
): Block {
  const size = opts.size ?? 19;
  const inner = w - 56;
  const wrapped = lines
    .slice(0, opts.maxLines ?? 6)
    .map((l) => wrapText(l, inner - (opts.bullets ? 22 : 0), size, 3));
  const rows = wrapped.reduce((a, b) => a + b.length, 0);
  const h = 56 + rows * (size + 8) + wrapped.length * 6 + 12;
  const body: string[] = [blockShell(x, y, w, h, n, heading, pal)];
  let ty = y + 62 + size;
  wrapped.forEach((para) => {
    para.forEach((l, i) => {
      if (opts.bullets && i === 0) {
        body.push(`<circle cx="${x + 34}" cy="${ty - size * 0.32}" r="4" fill="${PASTELS[pal % 4].tab}"/>`);
      }
      body.push(text(x + (opts.bullets ? 50 : 28), ty, l, { size, fill: i === 0 ? INK : INK_SOFT }));
      ty += size + 8;
    });
    ty += 6;
  });
  return { svg: body.join(""), h };
}

function formulaBlock(x: number, y: number, w: number, n: number, formulas: string[], pal: number): Block {
  const rows = formulas.slice(0, 4);
  const boxH = 58;
  const h = 56 + rows.length * (boxH + 12) + 12;
  const c = PASTELS[pal % 4];
  const body: string[] = [blockShell(x, y, w, h, n, "Key formulas", pal)];
  rows.forEach((f, i) => {
    const by = y + 58 + i * (boxH + 12);
    const parts = f.split(/[—–:]| gives | where /i);
    const head = clean(parts[0]) || clean(f);
    const main = wrapText(head, w - 96, 24, 1)[0] ?? head;
    const note = clean(parts.slice(1).join(" "));
    body.push(
      `<rect x="${x + 22}" y="${by}" width="${w - 44}" height="${boxH}" rx="10" fill="#ffffff" stroke="${c.edge}" stroke-width="2"/>`,
      text(x + 40, by + (note ? 28 : 37), main, { size: 24, weight: 700, font: MATH, italic: true }),
    );
    if (note) {
      body.push(
        text(x + 40, by + 48, wrapText(note, w - 90, 14, 1)[0] ?? "", { size: 14, fill: INK_SOFT }),
      );
    }
  });
  return { svg: body.join(""), h };
}

function tipBubble(x: number, y: number, w: number, tip: string, pal: number): Block {
  const c = PASTELS[(pal + 2) % 4];
  const lines = wrapText(tip, w - 150, 20, 2);
  const h = 46 + lines.length * 28;
  const body = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${c.fill}" stroke="${c.edge}" stroke-width="2.5"/>`,
    `<path d="M ${x + 78} ${y + h} l 10 22 l 20 -22 z" fill="${c.fill}" stroke="${c.edge}" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<path d="M ${x + 78} ${y + h - 2} h 30" stroke="${c.fill}" stroke-width="4"/>`,
    iconBulb(x + 52, y + h / 2, c.tab),
    text(x + 92, y + 32, "MEMORY TRICK / EXAM TIP", { size: 15, weight: 800, fill: c.tab, font: NIB }),
  ];
  lines.forEach((l, i) => body.push(text(x + 92, y + 58 + i * 26, l, { size: 19, fill: INK })));
  return { svg: body.join(""), h: h + 24 };
}

/* ------------------------------- diagrams --------------------------------- */

const ARROW_COLORS = Array.from(
  new Set([INK, INK_SOFT, "#8A6B18", "#9A4763", ...PASTELS.map((p) => p.tab), ...PASTELS.map((p) => p.edge)]),
);
const markerId = (c: string) => `ar${ARROW_COLORS.indexOf(c) >= 0 ? ARROW_COLORS.indexOf(c) : 0}`;

function arrow(x1: number, y1: number, x2: number, y2: number, c: string, label?: string, dash = false) {
  const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  return [
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3" stroke-linecap="round"${dash ? ' stroke-dasharray="6 6"' : ""} marker-end="url(#${markerId(c)})"/>`,
    label ? text(mid.x + 8, mid.y - 8, label, { size: 16, weight: 700, fill: c, font: MATH, italic: true }) : "",
  ].join("");
}

/** Minimalist labelled science diagrams; variant chosen from topic + slide index. */
function diagram(kind: number, x: number, y: number, w: number, h: number, pal: number): string {
  const c = PASTELS[pal % 4].tab;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const g: string[] = [];

  if (kind === 0) {
    // point charge + radial field lines + test charge with force vector
    g.push(`<circle cx="${cx - 60}" cy="${cy}" r="26" fill="${PASTELS[pal % 4].fill}" stroke="${c}" stroke-width="3"/>`);
    g.push(text(cx - 60, cy + 7, "+q", { size: 19, weight: 800, anchor: "middle", fill: c, font: MATH }));
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.push(
        arrow(cx - 60 + 30 * Math.cos(a), cy + 30 * Math.sin(a), cx - 60 + 108 * Math.cos(a), cy + 108 * Math.sin(a), c),
      );
    }
    g.push(`<circle cx="${cx + 120}" cy="${cy - 46}" r="13" fill="#fff" stroke="${c}" stroke-width="2.5"/>`);
    g.push(text(cx + 120, cy - 41, "q₀", { size: 14, weight: 700, anchor: "middle", fill: INK, font: MATH }));
    g.push(arrow(cx + 132, cy - 46, cx + 200, cy - 76, "#9A4763", "F"));
    g.push(arrow(cx - 34, cy, cx + 106, cy, "#8A6B18", "r", true));
  } else if (kind === 1) {
    // axes + decaying curve (graphical relationship)
    const ox = x + 56;
    const oy = y + h - 56;
    g.push(arrow(ox, oy, x + w - 40, oy, INK, "x"));
    g.push(arrow(ox, oy, ox, y + 34, INK, "y"));
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const px = ox + 20 + t * (w - 130);
      const py = oy - (h - 130) / (1 + 6 * t);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    g.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`);
    g.push(`<line x1="${ox}" y1="${oy - (h - 130) / 4}" x2="${ox + 150}" y2="${oy - (h - 130) / 4}" stroke="${c}" stroke-width="1.6" stroke-dasharray="5 6"/>`);
    g.push(text(ox + 160, oy - (h - 130) / 4 - 6, "1/r²", { size: 16, weight: 700, fill: c, font: MATH, italic: true }));
  } else if (kind === 2) {
    // parallel plate capacitor with uniform field arrows
    const px = cx - 110;
    g.push(`<rect x="${px}" y="${cy - 90}" width="220" height="12" rx="4" fill="${c}"/>`);
    g.push(`<rect x="${px}" y="${cy + 78}" width="220" height="12" rx="4" fill="${c}"/>`);
    for (let i = 0; i < 6; i++) {
      const ax = px + 22 + i * 36;
      g.push(arrow(ax, cy - 68, ax, cy + 68, PASTELS[(pal + 1) % 4].tab));
    }
    g.push(text(px - 12, cy - 100, "+", { size: 26, weight: 800, fill: c, anchor: "end", font: MATH }));
    g.push(text(px - 12, cy + 104, "−", { size: 26, weight: 800, fill: c, anchor: "end", font: MATH }));
    g.push(text(cx + 128, cy + 6, "E", { size: 22, weight: 800, fill: PASTELS[(pal + 1) % 4].tab, font: MATH, italic: true }));
    g.push(arrow(px - 56, cy - 84, px - 56, cy + 84, "#8A6B18", "d", true));
  } else if (kind === 3) {
    // labelled process chain
    const bw = (w - 100) / 3;
    for (let i = 0; i < 3; i++) {
      const bx = x + 40 + i * (bw + 10);
      g.push(
        `<rect x="${bx}" y="${cy - 44}" width="${bw - 10}" height="88" rx="12" fill="${PASTELS[(pal + i) % 4].fill}" stroke="${PASTELS[(pal + i) % 4].edge}" stroke-width="2.5"/>`,
        text(bx + (bw - 10) / 2, cy + 6, ["INPUT", "PROCESS", "RESULT"][i], {
          size: 16,
          weight: 800,
          anchor: "middle",
          fill: PASTELS[(pal + i) % 4].tab,
          font: NIB,
        }),
      );
      if (i < 2) g.push(arrow(bx + bw - 8, cy, bx + bw + 6, cy, INK));
    }
  } else {
    // magnetic-style closed loop with circulating arrows
    g.push(`<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) / 2 - 46}" fill="none" stroke="${c}" stroke-width="3.5"/>`);
    const r = Math.min(w, h) / 2 - 46;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.35;
      g.push(
        arrow(
          cx + r * Math.cos(a),
          cy + r * Math.sin(a),
          cx + r * Math.cos(a + 0.28),
          cy + r * Math.sin(a + 0.28),
          PASTELS[(pal + 1) % 4].tab,
        ),
      );
    }
    g.push(`<line x1="${cx}" y1="${cy - r - 26}" x2="${cx}" y2="${cy + r + 26}" stroke="${INK}" stroke-width="3" stroke-dasharray="8 6"/>`);
    g.push(text(cx + 10, cy - r - 32, "axis", { size: 15, weight: 700, fill: INK_SOFT }));
    g.push(text(cx + r + 12, cy + 5, "I", { size: 20, weight: 800, fill: PASTELS[(pal + 1) % 4].tab, font: MATH, italic: true }));
  }
  return g.join("");
}

function diagramKind(input: CheatSheetInput): number {
  const t = `${input.title} ${input.subject ?? ""}`.toLowerCase();
  if (/capacit|plate|dielectric|potential difference/.test(t)) return 2;
  if (/graph|variation|versus|curve|inverse|proportion/.test(t)) return 1;
  if (/magnet|current|loop|induc|circuit|solenoid/.test(t)) return 4;
  if (/process|cycle|step|reaction|flow|method/.test(t)) return 3;
  if (/charge|field|force|electro/.test(t)) return 0;
  return (input.slideIndex ?? 0) % 5;
}

/* --------------------------------- render --------------------------------- */

export function renderCheatSheet(input: CheatSheetInput): string {
  const seed = input.slideIndex ?? 0;
  const pal = seed % 4;
  const p = collect(input);

  const defs = `<defs>${ARROW_COLORS.map(
    (col, i) =>
      `<marker id="ar${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${col}"/></marker>`,
  ).join("")}</defs>`;

  const head = header(clean(input.title) || "NCERT Overview", input.subject || "", seed);
  const out: string[] = [paper(seed), head.svg];

  const gap = 22;
  const leftX = 60;
  const leftW = 760;
  const rightX = 860;
  const rightW = W - 60 - rightX;
  const bottomReserve = 132;
  const maxY = H - bottomReserve;

  // ---- left column: definition → formulas → units
  let ly = head.bottom;
  const left: Block[] = [];
  if (p.def.length) left.push(textBlock(leftX, ly, leftW, 1, "Definition", p.def, pal, { size: 20, maxLines: 2 }));
  ly += left[0]?.h ? left[0].h + gap : 0;
  if (p.formulas.length) {
    const b = formulaBlock(leftX, ly, leftW, left.length + 1, p.formulas, pal + 1);
    left.push(b);
    ly += b.h + gap;
  }
  if (p.units.length && ly + 120 < maxY) {
    const b = textBlock(leftX, ly, leftW, left.length + 1, "Units & dimensions", p.units, pal + 2, {
      bullets: true,
      size: 18,
      maxLines: 3,
    });
    left.push(b);
    ly += b.h + gap;
  }
  // fill remaining left space with key terms when there is room
  if (p.terms.length && ly + 130 < maxY) {
    const b = textBlock(leftX, ly, leftW, left.length + 1, "Key terms", p.terms, pal + 3, {
      bullets: true,
      size: 18,
      maxLines: 2,
    });
    left.push(b);
    ly += b.h + gap;
  }
  left.forEach((b) => out.push(b.svg));

  // ---- right column: diagram panel → key points
  let ry = head.bottom;
  const diaH = 330;
  const c = PASTELS[(pal + 1) % 4];
  out.push(
    `<rect x="${rightX}" y="${ry}" width="${rightW}" height="${diaH}" rx="14" fill="#ffffff" stroke="${c.edge}" stroke-width="2.5"/>`,
    `<circle cx="${rightX + 30}" cy="${ry + 30}" r="17" fill="${c.tab}"/>`,
    text(rightX + 30, ry + 37, String(left.length + 1), { size: 18, weight: 800, fill: "#fff", anchor: "middle", font: NIB }),
    text(rightX + 58, ry + 37, "GRAPHICAL DIAGRAM", { size: 20, weight: 800, fill: c.tab, font: NIB }),
    `<g>${diagram(diagramKind(input), rightX + 16, ry + 56, rightW - 32, diaH - 78, pal + 1)}</g>`,
  );
  ry += diaH + gap;

  if (p.points.length && ry + 120 < maxY) {
    const room = Math.max(2, Math.floor((maxY - ry - 60) / 34));
    const b = textBlock(rightX, ry, rightW, left.length + 2, "Key points", p.points.slice(0, room), pal + 3, {
      bullets: true,
      size: 18,
      maxLines: 2,
    });
    out.push(b.svg);
    ry += b.h + gap;
  }

  // ---- tip bubble across the full width, always inside the page
  if (p.tip) {
    const ty = Math.min(Math.max(ly, ry) + 6, H - bottomReserve + 4);
    const tip = tipBubble(leftX, ty, W - 120, p.tip, pal);
    out.push(tip.svg);
  }

  out.push(text(W - 60, H - 26, "NCERT · self-made study sheet", { size: 14, fill: INK_SOFT, anchor: "end" }));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${out.join("")}</svg>`;
}

export function renderCheatSheetDataUrl(input: CheatSheetInput): string {
  const svg = renderCheatSheet(input);
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}

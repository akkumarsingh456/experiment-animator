import { plainMathText } from "@/lib/latex-notation";
/**
 * Zero-cost NCERT infographic renderer.
 *
 * Draws the exact reference style (dark navy title banner + gold rule, soft
 * gradient rounded/pill nodes, curved arrows with arrowheads, cream canvas with
 * faint corner swooshes and small flat spot-icons) as a deterministic SVG.
 * No AI gateway, no credits, no failures — every slide always gets a diagram.
 */

export type FactInput = {
  title: string;
  bullets?: string[];
  notes?: string[];
  keyTerms?: Array<{ term: string; meaning: string }>;
  subject?: string;
  slideIndex?: number;
};

const W = 1600;
const H = 900;

const PALETTES: Record<string, string[][]> = {
  physics: [["#1d5c96", "#0f3d68"], ["#2a9d8f", "#1c6b61"], ["#e08d54", "#b3652f"], ["#5b8def", "#3a5fbf"], ["#7bbfd4", "#3f8299"], ["#e4b363", "#a97c27"]],
  chemistry: [["#2a9d8f", "#1c6b61"], ["#d9a05b", "#a9743a"], ["#e2725b", "#a94b38"], ["#4c9fbe", "#2b6d87"], ["#8bbf9f", "#4e8266"], ["#1d5c96", "#0f3d68"]],
  biology: [["#5fa777", "#356e49"], ["#c2703d", "#8c4b23"], ["#84b6a3", "#4a8271"], ["#d9b26a", "#a37f31"], ["#4c9fbe", "#2b6d87"], ["#1d5c96", "#0f3d68"]],
  maths: [["#7a5cc0", "#4c3488"], ["#d9a72c", "#a37c12"], ["#4c9fbe", "#2b6d87"], ["#e2725b", "#a94b38"], ["#5fa777", "#356e49"], ["#1d5c96", "#0f3d68"]],
  default: [["#1d5c96", "#0f3d68"], ["#4c9fbe", "#2b6d87"], ["#e28f6b", "#b25a36"], ["#5fa777", "#356e49"], ["#7a8fd0", "#4a5da3"], ["#d9a72c", "#a37c12"]],
};

function paletteFor(subject = "") {
  const s = subject.toLowerCase();
  if (s.includes("phys")) return PALETTES.physics;
  if (s.includes("chem")) return PALETTES.chemistry;
  if (s.includes("bio") || s.includes("botan") || s.includes("zoolog")) return PALETTES.biology;
  if (s.includes("math")) return PALETTES.maths;
  return PALETTES.default;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function clean(s: string) {
  // Flatten LaTeX to readable Unicode — SVG labels cannot render math markup.
  return plainMathText(String(s || ""))
    .replace(/\s+/g, " ")
    .replace(/^[-•*\d.\s)]+/, "")
    .trim();
}

function wrap(text: string, maxChars: number, maxLines: number) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = next;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length + 1) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[,.;:]?$/, "") + "…";
  }
  return lines;
}

type Fact = { label: string; caption: string };

function toFacts(input: FactInput): Fact[] {
  const raw: Fact[] = [];
  for (const t of input.keyTerms || []) {
    const term = clean(t.term);
    if (term) raw.push({ label: term, caption: clean(t.meaning) });
  }
  for (const b of [...(input.bullets || []), ...(input.notes || [])]) {
    const c = clean(b);
    if (!c) continue;
    const m = c.match(/^(.{3,42}?)[:—–-]\s+(.*)$/);
    if (m) raw.push({ label: m[1], caption: m[2] });
    else {
      const words = c.split(" ");
      raw.push({ label: words.slice(0, 5).join(" "), caption: words.slice(5).join(" ") });
    }
  }
  const seen = new Set<string>();
  const out: Fact[] = [];
  for (const f of raw) {
    const k = f.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({
      label: wrap(f.label, 30, 1).join(" "),
      caption: f.caption ? wrap(f.caption, 34, 2).join(" ") : "",
    });
    if (out.length >= 5) break;

  }
  return out;
}

/* ---------- primitives ---------- */

function node(
  x: number,
  y: number,
  w: number,
  h: number,
  fact: Fact,
  fillId: string,
  stroke: string,
  pill = false,
) {
  const labelLines = wrap(fact.label, Math.max(12, Math.floor(w / 13.5)), 2);
  const capLines = fact.caption ? wrap(fact.caption, Math.max(14, Math.floor(w / 10.8)), 2) : [];
  const LH_L = 31;
  const LH_C = 24;
  const total = labelLines.length * LH_L + capLines.length * LH_C;
  let ty = y + h / 2 - total / 2 + 22;
  const parts: string[] = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${pill ? h / 2 : 18}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="2.5"/>`,
  ];
  for (const l of labelLines) {
    parts.push(
      `<text x="${x + w / 2}" y="${ty}" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#0d1b26">${esc(l)}</text>`,
    );
    ty += LH_L;
  }
  for (const l of capLines) {
    parts.push(
      `<text x="${x + w / 2}" y="${ty}" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="18" font-weight="500" fill="#27414f">${esc(l)}</text>`,
    );
    ty += LH_C;
  }
  return parts.join("");

}

function curve(x1: number, y1: number, x2: number, y2: number, bend = 0.22, color = "#2b6d87") {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow)"/>`;
}

function icon(kind: number, x: number, y: number, c: string) {
  const k = kind % 5;
  if (k === 0)
    return `<g opacity="0.85" transform="translate(${x},${y})"><circle r="5" fill="${c}"/><ellipse rx="20" ry="8" fill="none" stroke="${c}" stroke-width="2"/><ellipse rx="20" ry="8" fill="none" stroke="${c}" stroke-width="2" transform="rotate(60)"/><ellipse rx="20" ry="8" fill="none" stroke="${c}" stroke-width="2" transform="rotate(-60)"/></g>`;
  if (k === 1)
    return `<g opacity="0.85" transform="translate(${x},${y})"><path d="M-20 6 q10 -18 20 0 t20 0" fill="none" stroke="${c}" stroke-width="3"/><path d="M-20 14 q10 -18 20 0 t20 0" fill="none" stroke="${c}" stroke-width="2" opacity="0.5"/></g>`;
  if (k === 2)
    return `<g opacity="0.85" transform="translate(${x},${y})"><circle r="9" fill="none" stroke="${c}" stroke-width="3"/><circle r="17" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="4 5"/></g>`;
  if (k === 3)
    return `<g opacity="0.85" transform="translate(${x},${y})"><path d="M-16 12 v-14 a16 16 0 0 1 32 0 v14 h-10 v-14 a6 6 0 0 0 -12 0 v14 z" fill="${c}"/></g>`;
  return `<g opacity="0.85" transform="translate(${x},${y})"><rect x="-16" y="-16" width="32" height="32" rx="6" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M-9 6 L-2 -4 L4 2 L10 -9" fill="none" stroke="${c}" stroke-width="2.5"/></g>`;
}

/* ---------- layouts ---------- */

function layoutRadial(facts: Fact[], pal: string[][]) {
  const out: string[] = [];
  const cx = W / 2;
  const cy = 520;
  const n = facts.length;
  const positions: Array<{ x: number; y: number; w: number; h: number }> = [];
  const cols = [
    { x: 70, y: 210 },
    { x: 70, y: 445 },
    { x: 70, y: 680 },
    { x: 1170, y: 210 },
    { x: 1170, y: 445 },
    { x: 1170, y: 680 },
  ];
  for (let i = 0; i < n; i++) {
    const p = cols[i % cols.length];
    positions.push({ x: p.x, y: p.y, w: 360, h: 152 });
  }
  const hubW = 380;
  const hubH = 158;
  for (let i = 0; i < n; i++) {
    const p = positions[i];
    const left = p.x < cx;
    out.push(
      curve(
        left ? cx - hubW / 2 : cx + hubW / 2,
        cy,
        left ? p.x + p.w : p.x,
        p.y + p.h / 2,
        left ? 0.14 : -0.14,
        pal[(i + 1) % pal.length][1],
      ),
    );
  }
  out.push(
    `<rect x="${cx - hubW / 2}" y="${cy - hubH / 2}" width="${hubW}" height="${hubH}" rx="22" fill="url(#g0)" stroke="${pal[0][1]}" stroke-width="3"/>`,
  );
  return { pre: out, positions, hub: { x: cx - hubW / 2, y: cy - hubH / 2, w: hubW, h: hubH } };
}

function layoutFlow(facts: Fact[]) {
  const positions: Array<{ x: number; y: number; w: number; h: number }> = [];
  const n = Math.min(facts.length, 6);
  const perRow = n <= 3 ? n : 3;
  const rows = Math.ceil(n / perRow);
  const w = 430;
  const h = 158;
  const gapX = (W - perRow * w) / (perRow + 1);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    positions.push({ x: gapX + c * (w + gapX), y: 260 + r * (h + 180) + (rows === 1 ? 150 : 0), w, h });
  }
  return positions;
}

function layoutCycle(facts: Fact[]) {
  const n = Math.min(facts.length, 6);
  const positions: Array<{ x: number; y: number; w: number; h: number }> = [];
  const rx = 480;
  const ry = 255;
  const cx = W / 2;
  const cy = 545;
  const w = 340;
  const h = 148;
  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    angles.push(a);
    positions.push({ x: cx + rx * Math.cos(a) - w / 2, y: cy + ry * Math.sin(a) - h / 2, w, h });
  }
  return { positions, angles, cx, cy, rx: rx + 130, ry: ry + 80, n };
}


/* ---------- main ---------- */

export function renderNapkinInfographic(input: FactInput): string {
  const pal = paletteFor(input.subject);
  const facts = toFacts(input);
  const safeFacts = facts.length
    ? facts
    : [{ label: clean(input.title) || "Overview", caption: "NCERT concept summary" }];
  const variant = ((input.slideIndex ?? 0) + (safeFacts.length % 3)) % 3;

  const defs = [
    `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#2b6d87"/></marker>`,
    `<linearGradient id="banner" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17456f"/><stop offset="1" stop-color="#0d2a45"/></linearGradient>`,
    ...pal.map(
      (c, i) =>
        `<linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}" stop-opacity="0.34"/><stop offset="1" stop-color="${c[0]}" stop-opacity="0.62"/></linearGradient>`,
    ),
  ].join("");

  const bg = [
    `<rect width="${W}" height="${H}" fill="#FBF8F1"/>`,
    `<path d="M -40 140 Q 220 40 460 150 T 900 120" fill="none" stroke="#1d5c96" stroke-width="26" opacity="0.05"/>`,
    `<path d="M 1640 760 Q 1380 860 1120 750 T 700 800" fill="none" stroke="#e28f6b" stroke-width="30" opacity="0.06"/>`,
    `<circle cx="120" cy="820" r="70" fill="#2a9d8f" opacity="0.05"/>`,
    `<circle cx="1500" cy="180" r="90" fill="#e4b363" opacity="0.06"/>`,
  ].join("");

  const titleText = clean(input.title).toUpperCase() || "NCERT OVERVIEW";
  const titleLines = wrap(titleText, 58, 2);
  const bannerH = titleLines.length > 1 ? 116 : 88;
  const banner = [
    `<rect x="180" y="34" width="${W - 360}" height="${bannerH}" rx="14" fill="url(#banner)"/>`,
    ...titleLines.map(
      (l, i) =>
        `<text x="${W / 2}" y="${34 + (titleLines.length > 1 ? 46 : 56) + i * 38}" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${titleLines.length > 1 ? 30 : 34}" font-weight="800" letter-spacing="1.2" fill="#ffffff">${esc(l)}</text>`,
    ),
    `<rect x="${W / 2 - 180}" y="${34 + bannerH - 16}" width="360" height="4" rx="2" fill="#e4b363"/>`,
  ].join("");

  const body: string[] = [];

  if (variant === 0) {
    const { pre, positions, hub } = layoutRadial(safeFacts, pal);
    body.push(...pre);
    body.push(
      ...wrap(clean(input.title), 20, 2).map(
        (l, i, arr) =>
          `<text x="${hub.x + hub.w / 2}" y="${hub.y + hub.h / 2 - (arr.length - 1) * 16 + i * 32 + 9}" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" fill="#0d2a45">${esc(l)}</text>`,
      ),
    );
    safeFacts.forEach((f, i) => {
      const p = positions[i];
      body.push(node(p.x, p.y, p.w, p.h, f, `g${(i + 1) % pal.length}`, pal[(i + 1) % pal.length][1]));
    });
  } else if (variant === 1) {
    const positions = layoutFlow(safeFacts);
    positions.forEach((p, i) => {
      if (i > 0) {
        const prev = positions[i - 1];
        const sameRow = Math.abs(prev.y - p.y) < 10;
        if (sameRow) {
          body.push(curve(prev.x + prev.w, prev.y + prev.h / 2, p.x - 6, p.y + p.h / 2, 0.1, pal[i % pal.length][1]));
        } else {
          // Row wrap: drop below the finished row, run back left, then up.
          const midY = (prev.y + prev.h + p.y) / 2;
          const col = pal[i % pal.length][1];
          body.push(
            `<path d="M ${prev.x + prev.w / 2} ${prev.y + prev.h} V ${midY} H ${p.x + p.w / 2} V ${p.y - 8}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>`,
          );
        }

      }
    });
    positions.forEach((p, i) => {
      body.push(node(p.x, p.y, p.w, p.h, safeFacts[i], `g${i % pal.length}`, pal[i % pal.length][1], true));
      body.push(
        `<circle cx="${p.x + 26}" cy="${p.y + 26}" r="17" fill="${pal[i % pal.length][1]}"/><text x="${p.x + 26}" y="${p.y + 32}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800" fill="#fff">${i + 1}</text>`,
      );
    });
  } else {
    const { positions, angles, cx, cy, rx, ry, n } = layoutCycle(safeFacts);
    // Outer arc arrows between adjacent nodes — never cross a node box.
    for (let i = 0; i < n; i++) {
      const a0 = angles[i] + (2 * Math.PI) / n / 3.2;
      const a1 = angles[i] + (2 * Math.PI) / n - (2 * Math.PI) / n / 3.2;
      const p0 = { x: cx + rx * Math.cos(a0), y: cy + ry * Math.sin(a0) };
      const p1 = { x: cx + rx * Math.cos(a1), y: cy + ry * Math.sin(a1) };
      const am = (a0 + a1) / 2;
      const cpx = cx + rx * 1.16 * Math.cos(am);
      const cpy = cy + ry * 1.16 * Math.sin(am);
      body.push(
        `<path d="M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}" fill="none" stroke="${pal[i % pal.length][1]}" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow)"/>`,
      );
    }
    positions.forEach((p, i) => {
      body.push(
        `<path d="M ${(p.x + p.w / 2).toFixed(1)} ${(p.y + p.h / 2).toFixed(1)} L ${cx} ${cy}" stroke="${pal[(i + 1) % pal.length][1]}" stroke-width="1.5" stroke-dasharray="5 6" opacity="0.35" fill="none"/>`,
      );
    });
    body.push(
      `<circle cx="${cx}" cy="${cy}" r="100" fill="url(#g0)" stroke="${pal[0][1]}" stroke-width="3"/>`,
      ...wrap(clean(input.title), 14, 3).map(
        (l, i, arr) =>
          `<text x="${cx}" y="${cy - (arr.length - 1) * 13 + i * 26 + 7}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="800" fill="#0d2a45">${esc(l)}</text>`,
      ),
    );
    positions.forEach((p, i) => {
      body.push(node(p.x, p.y, p.w, p.h, safeFacts[i], `g${(i + 1) % pal.length}`, pal[(i + 1) % pal.length][1]));
    });

  }

  const icons = [
    icon((input.slideIndex ?? 0) + 0, 96, 220, pal[0][1]),
    icon((input.slideIndex ?? 0) + 2, W - 96, 250, pal[2 % pal.length][1]),
    icon((input.slideIndex ?? 0) + 4, 120, H - 90, pal[3 % pal.length][1]),
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${`<defs>${defs}</defs>`}${bg}${banner}${body.join("")}${icons}</svg>`;
}

export function renderNapkinInfographicDataUrl(input: FactInput): string {
  const svg = renderNapkinInfographic(input);
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}

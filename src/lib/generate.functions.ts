import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function hashKey(parts: Array<string | undefined | null>) {
  const norm = parts
    .map((p) => (p ?? "").toString().trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return createHash("sha256").update(norm).digest("hex").slice(0, 40);
}

function cacheSupa() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Generate slide images locally as deterministic SVG data URIs — no AI/image API call. */
export const generateSlideImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().default(""),
        bullets: z.array(z.string()).default([]),
        caption: z.string().optional().default(""),
        subject: z.string().optional().default(""),
        klass: z.string().optional().default(""),
        visual_prompt: z.string().optional().default(""),
        grounding: z.string().optional().default(""),
        slideIndex: z.number().int().min(0).max(50).optional().default(0),
        avoidUrls: z.array(z.string()).optional().default([]),
        nocache: z.boolean().optional().default(false),
        cacheOnly: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Cache lookup — same (class, subject, title, visual_prompt) returns instantly.
    const cacheKey = hashKey([
      "img-v4-safe-unique-a4",
      data.klass,
      data.subject,
      String(data.slideIndex),
      data.title,
      data.visual_prompt,
      data.grounding.slice(0, 500),
      (data.bullets || []).join(" "),
    ]);
    const db = cacheSupa();
    const startedAt = Date.now();
    const auditBase = {
      cache_key: cacheKey,
      klass: String(data.klass || ""),
      subject: String(data.subject || ""),
      title: String(data.title || ""),
      visual_prompt: String(data.visual_prompt || ""),
      grounding: String(data.grounding || "").slice(0, 4000),
      bullets: (data.bullets || []).join(" | ").slice(0, 2000),
      caption: String(data.caption || "").slice(0, 1000),
      slide_index: data.slideIndex,
      nocache: !!data.nocache,
    };
    const logAudit = async (extra: Record<string, unknown>) => {
      try {
        await (db as any).from("slide_image_audit").insert({
          ...auditBase,
          ...extra,
          duration_ms: Date.now() - startedAt,
        });
      } catch (e) {
        console.warn("slide_image_audit write failed", e);
      }
    };

    if (!data.nocache) {
      try {
        const { data: hit } = await (db as any)
          .from("slide_image_cache")
          .select("image_url")
          .eq("cache_key", cacheKey)
          .maybeSingle();
        if (hit?.image_url && !data.avoidUrls.includes(hit.image_url)) {
          await logAudit({ status: "cache_hit", cached: true, image_url: hit.image_url });
          return { url: hit.image_url as string, cached: true };
        }
      } catch {
        /* ignore cache miss */
      }
    }

    if (data.cacheOnly) {
      await logAudit({ status: "cache_miss_skipped", cached: false });
      return { url: "", cached: false, skipped: true };
    }

    // 1) Try Wikimedia Commons — free, no API key, high-quality NCERT-style diagrams.
    let url = "";
    let source: "wikimedia" | "local" = "local";
    try {
      const wiki = await fetchWikimediaDiagram(data.title, data.visual_prompt, data.subject, data.avoidUrls);
      if (wiki) {
        url = wiki;
        source = "wikimedia";
      }
    } catch (e) {
      console.warn("wikimedia lookup failed", e);
    }

    // 2) Fallback: high-fidelity local SVG (no external call).
    if (!url) {
      url = generateDiagramSVG(data.title, data.bullets, data.visual_prompt, data.subject, data.grounding, data.slideIndex);
    }

    try {
      await (db as any).from("slide_image_cache").upsert({
        cache_key: cacheKey,
        klass: String(data.klass || ""),
        subject: String(data.subject || ""),
        title: String(data.title || ""),
        visual_prompt: String(data.visual_prompt || ""),
        image_url: url,
      });
    } catch (e) {
      console.warn("slide image cache write failed", e);
    }

    await logAudit({ status: "success", cached: false, image_url: url, source });
    return { url, cached: false, source };
  });

/** Search Wikimedia Commons for a topic-matching diagram (SVG/PNG). Free, keyless. */
async function fetchWikimediaDiagram(title: string, visualPrompt: string, subject: string, avoidUrls: string[] = []): Promise<string | null> {
  const cleanedTitle = String(title || "").replace(/[—–:·|].*$/, "").trim();
  const query = [cleanedTitle, visualPrompt, subject, "diagram"]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 200);
  if (!query) return null;

  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", `${query} filetype:bitmap|drawing`);
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("gsrlimit", "8");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime|size");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  let json: any;
  try {
    const res = await fetch(endpoint.toString(), {
      headers: { "User-Agent": "EduPlanAI/1.0 (educational NCERT diagrams)" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  const pages: any[] = Object.values(json?.query?.pages || {});
  if (!pages.length) return null;

  const scored = pages
    .map((p) => {
      const ii = p?.imageinfo?.[0];
      if (!ii?.url) return null;
      const mime = String(ii.mime || "").toLowerCase();
      const name = String(p.title || "").toLowerCase();
      if (!/^image\/(svg\+xml|png|jpeg|jpg)$/.test(mime)) return null;
      // Reject photos of people/logos/flags: prefer schematic content.
      if (/\b(flag|logo|portrait|photograph|photo of|selfie|coat of arms|seal of)\b/.test(name)) return null;
      let bonus = 0;
      if (mime === "image/svg+xml") bonus += 40;
      if (/diagram|schema|schematic|figure|illustration/.test(name)) bonus += 20;
      const q = normalizeText(query);
      const matches = q.split(" ").filter((w) => w.length > 3 && name.includes(w)).length;
      return { url: ii.url as string, score: bonus + matches * 10 };
    })
    .filter((x): x is { url: string; score: number } => !!x)
    .sort((a, b) => b.score - a.score);

  return scored.find((item) => !avoidUrls.includes(item.url))?.url ?? null;
}

/** Generate SVG-based NCERT-style diagrams. A4-landscape aspect (1414:1000) so it
 *  slots into the slide's right-column frame without cropping labels. */
function generateDiagramSVG(title: string, bullets: string[], visualPrompt: string, subject = "", grounding = "", slideIndex = 0): string {
  // A4-landscape ratio (297 x 210 mm ≈ 1.414). We use a large canvas for crisp
  // scaling and reserve generous padding so text labels never touch the border.
  const width = 1414;
  const height = 1000;
  const prompt = `${title} ${visualPrompt} ${grounding}`.toLowerCase();
  const subjectNorm = normalizeText(subject);
  const accent = subjectNorm.includes("chem") ? "#0f8a5f"
               : subjectNorm.includes("bio")  ? "#9a5a20"
               : subjectNorm.includes("math") ? "#7c3aed"
               : "#2563eb";
  const colors = {
    bg: "#fafaf8",
    text: "#0f172a",
    accent,
    lightAccent: subjectNorm.includes("chem") ? "#def7ec"
                : subjectNorm.includes("bio")  ? "#fff1dc"
                : subjectNorm.includes("math") ? "#ede9fe"
                : "#dbeafe",
    grid: "#e5e7eb",
    muted: "#475569",
  };

  // Layout regions (all coordinates in canvas units).
  const PAD = 28;                 // outer padding — keeps stroke away from crop
  const TITLE_H = 110;            // title band
  const FOOTER_H = 70;            // caption/formula band
  const bodyTop = PAD + TITLE_H + 16;
  const bodyBottom = height - PAD - FOOTER_H - 16;
  const bodyLeft = PAD + 20;
  const bodyRight = width - PAD - 20;
  const bodyW = bodyRight - bodyLeft;
  const bodyH = bodyBottom - bodyTop;
  const cx = (bodyLeft + bodyRight) / 2;
  const cy = (bodyTop + bodyBottom) / 2;

  const wrappedTitle = wrapSvgText(title, 46, 2);
  const caption = trimToWords(visualPrompt || bullets[0] || title, 120);

  // Deterministic per-slide variant so no two slides look identical, even for
  // the same broad topic family (rotates orientation / colour of the sketch).
  const variantSeed = Array.from(title).reduce((a, c) => a + c.charCodeAt(0), 0);
  const variant = variantSeed % 3;

  let svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <style>
          text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; }
          .title    { font-size: 40px; font-weight: 800; fill: ${colors.text}; }
          .subtitle { font-size: 26px; fill: ${colors.accent}; font-weight: 700; }
          .label    { font-size: 22px; fill: ${colors.text}; font-weight: 600; }
          .small    { font-size: 18px; fill: ${colors.muted}; }
          .cap      { font-size: 20px; fill: ${colors.muted}; font-style: italic; }
          .bullet   { font-size: 22px; fill: ${colors.text}; }
        </style>
        <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><polygon points="0 0, 12 4, 0 8" fill="${colors.accent}"/></marker>
        <marker id="arrowred"  markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><polygon points="0 0, 12 4, 0 8" fill="#c0392b"/></marker>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="${colors.grid}" stroke-width="1"/>
        </pattern>
      </defs>

      <!-- Page background -->
      <rect width="${width}" height="${height}" fill="${colors.bg}"/>

      <!-- Outer safety border (matches slide card border, rounded like the frame) -->
      <rect x="${PAD}" y="${PAD}" width="${width - PAD * 2}" height="${height - PAD * 2}"
            fill="none" stroke="${colors.accent}" stroke-width="4" rx="20" ry="20"/>
      <rect x="${PAD + 10}" y="${PAD + 10}" width="${width - (PAD + 10) * 2}" height="${height - (PAD + 10) * 2}"
            fill="none" stroke="${colors.accent}" stroke-width="1.2" opacity="0.35" rx="14" ry="14"/>

      <!-- Title band -->
      <rect x="${PAD + 16}" y="${PAD + 16}" width="${width - (PAD + 16) * 2}" height="${TITLE_H}"
            fill="${colors.lightAccent}" rx="14" ry="14"/>
      ${wrappedTitle.map((line, i) => `<text class="title" x="${PAD + 40}" y="${PAD + 60 + i * 44}">${escapeXml(line)}</text>`).join("")}

      <!-- Body panel with subtle grid -->
      <rect x="${bodyLeft - 12}" y="${bodyTop - 12}" width="${bodyW + 24}" height="${bodyH + 24}"
            fill="url(#grid)" rx="12" ry="12"/>
      <rect x="${bodyLeft - 12}" y="${bodyTop - 12}" width="${bodyW + 24}" height="${bodyH + 24}"
            fill="none" stroke="${colors.accent}" stroke-width="2" rx="12" ry="12"/>
  `;

  // Choose a diagram family. Every branch draws inside the [bodyLeft..bodyRight]
  // x [bodyTop..bodyBottom] box so labels never fall off the canvas.
  if (/faraday|electromagnetic induction|induced emf|magnet.*coil|coil.*magnet/.test(prompt)) {
    const coilX = cx + 40 + variant * 20;
    svgContent += `
      ${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${coilX + i * 34}" cy="${cy}" rx="26" ry="130" fill="none" stroke="${colors.accent}" stroke-width="4"/>`).join("")}
      <rect x="${cx - 320}" y="${cy - 40}" width="150" height="80" fill="#c0392b" rx="4"/>
      <rect x="${cx - 170}" y="${cy - 40}" width="150" height="80" fill="#2c3e50" rx="4"/>
      <text class="label" x="${cx - 245}" y="${cy + 8}" text-anchor="middle" fill="#fff">N</text>
      <text class="label" x="${cx - 95}" y="${cy + 8}" text-anchor="middle" fill="#fff">S</text>
      <line x1="${cx - 20}" y1="${cy - 80}" x2="${cx + 40}" y2="${cy - 80}" stroke="#c0392b" stroke-width="5" marker-end="url(#arrowred)"/>
      <text class="label" x="${cx + 10}" y="${cy - 92}" fill="#c0392b" text-anchor="middle">motion v</text>
      <circle cx="${bodyRight - 80}" cy="${cy}" r="60" fill="#fff" stroke="${colors.accent}" stroke-width="4"/>
      <line x1="${bodyRight - 80}" y1="${cy}" x2="${bodyRight - 45}" y2="${cy - 35}" stroke="${colors.accent}" stroke-width="4"/>
      <text class="label" x="${bodyRight - 80}" y="${cy + 100}" text-anchor="middle">Galvanometer</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">ε = − dΦ/dt  ·  Faraday's law</text>
    `;
  } else if (/lenz/.test(prompt)) {
    svgContent += `
      ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${cx + i * 36}" cy="${cy}" rx="26" ry="140" fill="none" stroke="${colors.accent}" stroke-width="4"/>`).join("")}
      <rect x="${cx - 340}" y="${cy - 40}" width="140" height="80" fill="#c0392b" rx="4"/>
      <rect x="${cx - 200}" y="${cy - 40}" width="140" height="80" fill="#2c3e50" rx="4"/>
      <text class="label" x="${cx - 270}" y="${cy + 8}" text-anchor="middle" fill="#fff">N</text>
      <text class="label" x="${cx - 130}" y="${cy + 8}" text-anchor="middle" fill="#fff">S</text>
      <line x1="${cx - 40}" y1="${cy - 110}" x2="${cx + 40}" y2="${cy - 110}" stroke="#c0392b" stroke-width="5" marker-end="url(#arrowred)"/>
      <text class="label" x="${cx}" y="${cy - 124}" fill="#c0392b" text-anchor="middle">magnet →</text>
      <line x1="${cx + 260}" y1="${cy - 110}" x2="${cx + 180}" y2="${cy - 110}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>
      <text class="label" x="${cx + 340}" y="${cy - 114}">induced N (opposes)</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">Lenz's law · induced current opposes the change</text>
    `;
  } else if (/motional|rod.*rail|rail.*rod/.test(prompt)) {
    svgContent += `
      <line x1="${bodyLeft + 40}" y1="${cy - 140}" x2="${bodyRight - 40}" y2="${cy - 140}" stroke="${colors.text}" stroke-width="4"/>
      <line x1="${bodyLeft + 40}" y1="${cy + 140}" x2="${bodyRight - 40}" y2="${cy + 140}" stroke="${colors.text}" stroke-width="4"/>
      <line x1="${bodyLeft + 40}" y1="${cy - 140}" x2="${bodyLeft + 40}" y2="${cy + 140}" stroke="${colors.text}" stroke-width="4"/>
      <rect x="${cx - 5}" y="${cy - 150}" width="14" height="300" fill="${colors.accent}" rx="3"/>
      <line x1="${cx + 20}" y1="${cy}" x2="${cx + 120}" y2="${cy}" stroke="#c0392b" stroke-width="6" marker-end="url(#arrowred)"/>
      <text class="label" x="${cx + 70}" y="${cy - 14}" text-anchor="middle" fill="#c0392b">v</text>
      ${Array.from({ length: 7 }, (_, i) => Array.from({ length: 3 }, (_, j) => {
        const x = bodyLeft + 120 + i * 130;
        const y = cy - 90 + j * 90;
        return `<circle cx="${x}" cy="${y}" r="4" fill="${colors.accent}"/><circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${colors.accent}" stroke-width="1.5"/>`;
      }).join("")).join("")}
      <text class="small" x="${bodyLeft + 40}" y="${cy - 160}">B field (out of page)</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">ε = B · l · v  ·  motional EMF</text>
    `;
  } else if (/eddy/.test(prompt)) {
    svgContent += `
      <rect x="${cx - 250}" y="${cy - 160}" width="500" height="320" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="4" rx="12"/>
      ${[0,1,2,3].map(i => `<circle cx="${cx - 140 + i * 90}" cy="${cy}" r="${40 + i * 10}" fill="none" stroke="${colors.accent}" stroke-width="3"/>`).join("")}
      <path d="M ${cx - 140} ${cy - 40} A 40 40 0 0 1 ${cx - 100} ${cy}" fill="none" stroke="${colors.accent}" stroke-width="4" marker-end="url(#arrowhead)"/>
      <text class="label" x="${cx}" y="${cy - 180}" text-anchor="middle">changing B into conductor</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">Eddy currents dissipate energy as heat</text>
    `;
  } else if (/self.?induct|inductor|solenoid/.test(prompt)) {
    svgContent += `
      ${Array.from({ length: 10 }, (_, i) => `<path d="M ${bodyLeft + 120 + i * 80} ${cy} a 30 60 0 1 1 0.01 0" fill="none" stroke="${colors.accent}" stroke-width="5"/>`).join("")}
      <line x1="${bodyLeft + 40}" y1="${cy}" x2="${bodyLeft + 120}" y2="${cy}" stroke="${colors.accent}" stroke-width="5"/>
      <line x1="${bodyLeft + 920}" y1="${cy}" x2="${bodyRight - 40}" y2="${cy}" stroke="${colors.accent}" stroke-width="5"/>
      <text class="label" x="${cx}" y="${cy - 120}" text-anchor="middle">solenoid — N turns, area A, length l</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">ε = − L (dI/dt)  ·  L = μ₀ N² A / l</text>
    `;
  } else if (/mutual.*induct/.test(prompt)) {
    svgContent += `
      ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${bodyLeft + 200 + i * 34}" cy="${cy}" rx="22" ry="120" fill="none" stroke="${colors.accent}" stroke-width="4"/>`).join("")}
      ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${cx + 160 + i * 34}" cy="${cy}" rx="22" ry="120" fill="none" stroke="#c0392b" stroke-width="4"/>`).join("")}
      <text class="label" x="${bodyLeft + 300}" y="${cy - 150}" text-anchor="middle">primary I₁</text>
      <text class="label" x="${cx + 250}" y="${cy - 150}" text-anchor="middle">secondary ε₂</text>
      <line x1="${bodyLeft + 400}" y1="${cy}" x2="${cx + 150}" y2="${cy}" stroke="${colors.accent}" stroke-dasharray="10 6" stroke-width="3"/>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">ε₂ = − M (dI₁/dt)  ·  mutual inductance</text>
    `;
  } else if (/capacitor|capacitance|dielectric/.test(prompt)) {
    svgContent += `
      <rect x="${cx - 240}" y="${cy - 160}" width="30" height="320" fill="${colors.accent}" rx="4"/>
      <rect x="${cx + 210}" y="${cy - 160}" width="30" height="320" fill="${colors.accent}" rx="4"/>
      <rect x="${cx - 200}" y="${cy - 130}" width="400" height="260" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-dasharray="12 8" rx="12"/>
      <text class="label" x="${cx - 225}" y="${cy - 180}" text-anchor="middle">+ plate</text>
      <text class="label" x="${cx + 225}" y="${cy - 180}" text-anchor="middle">− plate</text>
      <text class="label" x="${cx}" y="${cy - 145}" text-anchor="middle">dielectric</text>
      ${[cy - 70, cy, cy + 70].map(y => `<line x1="${cx - 180}" y1="${y}" x2="${cx + 190}" y2="${y}" stroke="${colors.accent}" stroke-width="3" marker-end="url(#arrowhead)"/>`).join("")}
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">C = Q / V  ·  parallel-plate capacitor</text>
    `;
  } else if (/equipotential|electric field|charge|coulomb/.test(prompt)) {
    svgContent += `
      <circle cx="${cx}" cy="${cy}" r="42" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="5"/>
      <text class="subtitle" x="${cx}" y="${cy + 10}" text-anchor="middle">+q</text>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const r1 = 60, r2 = 260;
        return `<line x1="${(cx + Math.cos(rad) * r1).toFixed(0)}" y1="${(cy + Math.sin(rad) * r1).toFixed(0)}" x2="${(cx + Math.cos(rad) * r2).toFixed(0)}" y2="${(cy + Math.sin(rad) * r2).toFixed(0)}" stroke="${colors.accent}" stroke-width="3" marker-end="url(#arrowhead)"/>`;
      }).join("")}
      <circle cx="${cx}" cy="${cy}" r="140" fill="none" stroke="${colors.accent}" stroke-width="2" stroke-dasharray="8 6" opacity="0.65"/>
      <circle cx="${cx}" cy="${cy}" r="220" fill="none" stroke="${colors.accent}" stroke-width="2" stroke-dasharray="8 6" opacity="0.45"/>
      <text class="small" x="${bodyRight - 40}" y="${bodyTop + 40}" text-anchor="end">equipotential surfaces</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">radial E-field of a point charge</text>
    `;
  } else if (/ray|lens|mirror|prism|refraction|reflection/.test(prompt)) {
    svgContent += `
      <line x1="${bodyLeft + 40}" y1="${cy}" x2="${bodyRight - 40}" y2="${cy}" stroke="${colors.text}" stroke-width="2" opacity="0.5" stroke-dasharray="6 6"/>
      <polygon points="${cx},${cy - 200} ${cx + 190},${cy + 200} ${cx - 190},${cy + 200}" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="4"/>
      <line x1="${bodyLeft + 60}" y1="${cy - 60}" x2="${cx - 70}" y2="${cy + 10}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>
      <line x1="${cx - 70}" y1="${cy + 10}" x2="${cx + 90}" y2="${cy + 90}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>
      <line x1="${cx + 90}" y1="${cy + 90}" x2="${bodyRight - 60}" y2="${cy + 200}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>
      <text class="label" x="${bodyLeft + 60}" y="${cy - 80}">incident ray</text>
      <text class="label" x="${bodyRight - 60}" y="${cy + 232}" text-anchor="end">emergent ray</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">refraction through a prism</text>
    `;
  } else if (/cell|tissue|organ|heart|blood|neuron|plant|photosynth/.test(prompt)) {
    svgContent += `
      <ellipse cx="${cx}" cy="${cy}" rx="360" ry="220" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="5"/>
      <circle cx="${cx - 30}" cy="${cy}" r="86" fill="#fff" stroke="${colors.accent}" stroke-width="4"/>
      <circle cx="${cx - 10}" cy="${cy - 8}" r="28" fill="${colors.accent}" opacity="0.7"/>
      <path d="M ${cx - 240} ${cy - 60} C ${cx - 100} ${cy - 200}, ${cx + 140} ${cy - 200}, ${cx + 260} ${cy - 60}" fill="none" stroke="${colors.accent}" stroke-width="3" opacity="0.7"/>
      <path d="M ${cx - 240} ${cy + 60} C ${cx - 100} ${cy + 200}, ${cx + 140} ${cy + 200}, ${cx + 260} ${cy + 60}" fill="none" stroke="${colors.accent}" stroke-width="3" opacity="0.7"/>
      <text class="label" x="${cx - 30}" y="${cy - 100}" text-anchor="middle">nucleus</text>
      <text class="label" x="${cx + 280}" y="${cy}" text-anchor="start">membrane</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">labelled structure from NCERT</text>
    `;
  } else if (/triangle|angle|geometry|circle|polygon|theorem/.test(prompt)) {
    svgContent += `
      <polygon points="${cx - 220},${cy + 140} ${cx + 220},${cy + 140} ${cx + 30},${cy - 200}"
               fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="5"/>
      <text class="label" x="${cx - 240}" y="${cy + 170}">A</text>
      <text class="label" x="${cx + 240}" y="${cy + 170}">B</text>
      <text class="label" x="${cx + 30}" y="${cy - 220}" text-anchor="middle">C</text>
      <text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">${escapeXml(trimToWords(title, 60))}</text>
    `;
  } else {
    // Generic labelled sketch — three linked concept nodes with an arrow flow.
    const nodes = [
      { x: bodyLeft + 180, y: cy, label: wrapSvgText(bullets[0] || "concept", 14, 2) },
      { x: cx,             y: cy, label: wrapSvgText(bullets[1] || title,     14, 2) },
      { x: bodyRight - 180, y: cy, label: wrapSvgText(bullets[2] || "result",  14, 2) },
    ];
    svgContent += nodes.map((n, i) => `
      <circle cx="${n.x}" cy="${n.y}" r="110" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="4"/>
      ${n.label.map((line, li) => `<text class="label" x="${n.x}" y="${n.y - 6 + li * 26}" text-anchor="middle">${escapeXml(line)}</text>`).join("")}
      ${i < nodes.length - 1 ? `<line x1="${n.x + 115}" y1="${n.y}" x2="${nodes[i + 1].x - 118}" y2="${n.y}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>` : ""}
    `).join("");
    svgContent += `<text class="subtitle" x="${cx}" y="${bodyBottom + 4}" text-anchor="middle">${escapeXml(trimToWords(caption, 70))}</text>`;
  }

  // Footer — caption band, always inside the outer border.
  svgContent += `
    <rect x="${PAD + 16}" y="${height - PAD - FOOTER_H - 4}" width="${width - (PAD + 16) * 2}" height="${FOOTER_H}"
          fill="${colors.lightAccent}" opacity="0.7" rx="12" ry="12"/>
    <text class="cap" x="${cx}" y="${height - PAD - FOOTER_H / 2 + 8}" text-anchor="middle">${escapeXml(trimToWords(caption, 110))}</text>
    <text class="small" x="${width - PAD - 24}" y="${height - PAD - 18}" text-anchor="end">NCERT-aligned · EduPlan AI</text>
    </svg>
  `;

  const base64 = Buffer.from(svgContent).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function wrapSvgText(value: string, maxChars: number, maxLines: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length ? lines : ["NCERT diagram"];
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function trimToWords(value: string, max = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max).replace(/\s+\S*$/, "");
  return `${cut}…`;
}

const Input = z.object({
  topic: z.coerce.string().min(1),
  subtopics: z.coerce.string().optional().default(""),
  klass: z.coerce.string().min(1),
  subject: z.coerce.string().min(1),
  chapter: z.coerce.string().optional().default(""),
  nocache: z.coerce.boolean().optional().default(false),
});

export type SlideVerification = { coverage: number; matched: number; total: number; missing: string[] };

export type Slide = {
  title: string;
  bullets: string[];
  notes: string[];
  key_terms: { term: string; meaning: string }[];
  ncert_quote?: string;
  visual: string;
  visual_prompt?: string;
  grounding?: string;
  caption?: string;
  verification?: SlideVerification;
};

export type ActivityStep = { step: number; title: string; description: string };
export type Activity = {
  name: string;
  objective: string;
  apparatus: string[];
  steps: ActivityStep[];
  observation: string;
  conclusion: string;
};

export type VideoScene = {
  scene: number;
  title: string;
  duration_s: number;
  visual_prompt: string;
  narration: string;
};

export type ActivityMatch = {
  book_id: string;
  chapter: string;
  file_name: string;
  chunk_index: number;
  excerpt: string;
  activity_id: string | null;
  confidence: number;
};

export type GenerationResult = {
  source_books: Array<{ id: string; chapter: string; class: string; subject: string }>;
  context_chars: number;
  slides: Slide[];
  activities: Activity[];
  activity_matches: ActivityMatch[];
  video: { title: string; scenes: VideoScene[] };
};

function supa() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function score(text: string, terms: string[]) {
  const t = normalizeText(text);
  let s = 0;
  for (const term of terms) {
    const normalized = normalizeText(term);
    if (!normalized) continue;
    if (t.includes(normalized)) {
      s += normalized.length * 4;
      continue;
    }
    const words = normalized.split(" ").filter((w) => w.length > 2);
    const hits = words.filter((word) => t.includes(word)).length;
    if (hits > 0) s += hits * 3 + (hits === words.length ? 12 : 0);
  }
  return s;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ch|chapter|class|ncert|part|book|vol|volume)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classNumber(value: string) {
  return value.match(/9|10|11|12/)?.[0] ?? normalizeText(value);
}

function subjectAliases(subject: string, klass?: string) {
  const normalized = normalizeText(subject);
  const cls = klass ? classNumber(klass) : "";
  const isJunior = cls === "9" || cls === "10";
  const map: Record<string, string[]> = {
    math: ["math", "mathematics", "ganit"],
    mathematics: ["math", "mathematics", "ganit"],
    physics: isJunior ? ["physics", "science", "vigyan", "bhautiki"] : ["physics", "bhautiki", "bhautik", "physical"],
    chemistry: isJunior ? ["chemistry", "science", "vigyan", "rasayan"] : ["chemistry", "rasayan", "rasayanik"],
    biology: isJunior ? ["biology", "science", "vigyan", "jeev"] : ["biology", "jeev vigyan", "jiv vigyan"],
    science: ["science", "vigyan", "physics", "chemistry", "biology"],
    economics: ["economics", "arthashastra"],
    history: ["history", "itihas"],
    geography: ["geography", "bhugol"],
    english: ["english"],
    hindi: ["hindi"],
    sanskrit: ["sanskrit"],
  };
  return map[normalized] ?? [normalized];
}

function subjectMatches(actual: string, requested: string, klass?: string) {
  const a = normalizeText(actual);
  return subjectAliases(requested, klass).some((alias) => a.includes(alias) || alias.includes(a));
}

function buildTerms(data: z.infer<typeof Input>) {
  const raw = [data.topic, data.chapter, ...(data.subtopics || "").split(/[,;\n]/)];
  const terms = new Set<string>();
  for (const item of raw) {
    const n = normalizeText(item || "");
    if (!n) continue;
    terms.add(n);
    for (const word of n.split(" ")) if (word.length > 3 && !/^\d+$/.test(word)) terms.add(word);
  }
  terms.add("activity");
  terms.add("experiment");
  return [...terms];
}

function splitSentences(context: string) {
  return context
    .replace(/\s+/g, " ")
    .replace(/([.!?])\s+(?=[A-Z0-9])/g, "$1|SPLIT|")
    .split("|SPLIT|")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 28 && s.length < 420)
    .filter((s) => !/^\d+$/.test(s));
}

function uniqueByNormalized(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeText(item).slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sentenceHasAny(sentence: string, terms: string[]) {
  const n = normalizeText(sentence);
  return terms.some((term) => {
    const t = normalizeText(term);
    return t.length > 2 && n.includes(t);
  });
}

function pickSentences(sentences: string[], terms: string[], count: number, offset = 0) {
  const relevant = sentences.filter((s) => sentenceHasAny(s, terms));
  const pool = uniqueByNormalized([...relevant, ...sentences]);
  const picked: string[] = [];
  for (let i = offset; picked.length < count && i < pool.length; i++) picked.push(pool[i]);
  for (let i = 0; picked.length < count && i < pool.length; i++) picked.push(pool[i]);
  return uniqueByNormalized(picked).slice(0, count);
}

function extractFormulaSentences(sentences: string[]) {
  return sentences.filter((s) => /[A-Za-z]\s*=|\bSI\b|unit|formula|law|equation|proportional|constant|\bV\b|\bQ\b|\bC\b|\bE\b|ε|epsilon|coulomb|farad|volt/i.test(s));
}

function extractDefinitionSentences(sentences: string[]) {
  return sentences.filter((s) => /\bis\b|\bare\b|defined as|called|known as|means|refers to/i.test(s));
}

function extractKeyTerms(sentences: string[], topic: string): { term: string; meaning: string }[] {
  const candidates: { term: string; meaning: string }[] = [];
  for (const sentence of sentences) {
    const clean = trimToWords(sentence, 180);
    const patterns = [
      /([A-Z][A-Za-z\s-]{3,45})\s+is\s+([^.;]{20,160})/,
      /([A-Za-z\s-]{3,45})\s+is defined as\s+([^.;]{20,160})/i,
      /([A-Za-z\s-]{3,45})\s+are\s+([^.;]{20,160})/i,
    ];
    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (!match) continue;
      const term = titleCase(match[1].replace(/^(the|a|an)\s+/i, "")).slice(0, 42);
      const meaning = trimToWords(match[2], 130);
      if (normalizeText(term).length > 2 && meaning.length > 20) candidates.push({ term, meaning });
    }
  }
  const topicWords = normalizeText(topic).split(" ").filter((w) => w.length > 4);
  for (const word of topicWords) {
    const sentence = sentences.find((s) => normalizeText(s).includes(word));
    if (sentence) candidates.push({ term: titleCase(word), meaning: trimToWords(sentence, 130) });
  }
  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = normalizeText(item.term);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function makeSlide(title: string, source: string[], topic: string, visual: string, index: number): Slide {
  const cleaned = uniqueByNormalized(source).filter(Boolean);
  const bullets = cleaned.slice(0, 7).map((s) => trimToWords(s, 180));
  while (bullets.length < 5) {
    bullets.push(
      index === 0
        ? `This point is grounded in the uploaded NCERT chapter passage for ${topic}.`
        : `Revise this idea with the matching NCERT excerpt and classroom examples for ${topic}.`,
    );
  }
  const notesSource = cleaned.slice(7, 12).length ? cleaned.slice(7, 12) : cleaned.slice(0, 4);
  return {
    title,
    bullets: bullets.slice(0, 7),
    notes: notesSource.slice(0, 4).map((s) => trimToWords(s, 210)),
    key_terms: extractKeyTerms(cleaned, topic),
    ncert_quote: cleaned[0] ? trimToWords(cleaned[0], 180) : undefined,
    visual,
    visual_prompt: `Draw a clean labelled 2D NCERT diagram for ${title}. Include arrows, labels, symbols/formulas, and only details supported by the grounding excerpt.`,
    grounding: cleaned.slice(0, 3).join(" "),
    caption: `NCERT-grounded visual summary for ${title}.`,
  };
}

function fallbackSlides(topic: string, context: string): Slide[] {
  const sentences = uniqueByNormalized(splitSentences(context)).slice(0, 160);
  const visuals = ["lightbulb", "prism", "atom", "ruler", "beaker", "microscope", "bolt", "function", "brain", "sparkles", "magnet", "leaf", "dna", "planet", "heart"];
  return Array.from({ length: 10 }, (_, i) => {
    const bs = sentences.slice(i * 7, i * 7 + 12);
    return makeSlide(i === 0 ? topic : `${topic} — Key idea ${i}`, bs, topic, visuals[i] ?? "lightbulb", i);
  });
}

function validateSlideAgainstContext(slide: Slide, contextNorm: string): SlideVerification {
  const parts = [
    ...(slide.bullets || []),
    ...(slide.notes || []),
    ...(slide.key_terms || []).map((t) => `${t.term} ${t.meaning}`),
    slide.ncert_quote || "",
  ].map((s) => String(s || "").trim()).filter(Boolean);
  if (parts.length === 0) return { coverage: 0, matched: 0, total: 0, missing: [] };
  let matched = 0;
  const missing: string[] = [];
  for (const p of parts) {
    const tokens = normalizeText(p).split(" ").filter((w) => w.length > 4);
    if (tokens.length === 0) { matched++; continue; }
    const hits = tokens.filter((t) => contextNorm.includes(t)).length;
    const ratio = hits / tokens.length;
    if (ratio >= 0.5) matched++;
    else missing.push(trimToWords(p, 110));
  }
  return {
    coverage: Math.round((matched / parts.length) * 100),
    matched,
    total: parts.length,
    missing: missing.slice(0, 3),
  };
}

function buildLocalSlides(topic: string, subtopics: string, context: string): Slide[] {
  const sentences = uniqueByNormalized(splitSentences(context)).slice(0, 220);
  if (sentences.length === 0) return fallbackSlides(topic, context);
  const subtopicList = (subtopics || "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const definitions = uniqueByNormalized(extractDefinitionSentences(sentences));
  const formulas = uniqueByNormalized(extractFormulaSentences(sentences));
  const activityText = uniqueByNormalized(sentences.filter((s) => /activity|experiment|observe|apparatus|procedure|conclusion/i.test(s)));
  const topicTerms = [topic, ...topic.split(/\s+/), ...subtopicList];
  const visuals = ["lightbulb", "atom", "ruler", "bolt", "function", "magnet", "beaker", "microscope", "brain", "prism", "circuit", "planet", "leaf", "dna", "heart"];
  const plan = [
    { title: `${topic}: NCERT overview`, terms: topicTerms, source: pickSentences(sentences, topicTerms, 16, 0) },
    { title: `Core definitions in ${topic}`, terms: ["defined", "called", "is", topic], source: [...definitions, ...pickSentences(sentences, topicTerms, 10, 8)] },
    { title: `Symbols, quantities and units`, terms: ["unit", "SI", "formula", "symbol", ...topicTerms], source: [...formulas, ...pickSentences(sentences, topicTerms, 10, 16)] },
    ...subtopicList.slice(0, 8).map((name, idx) => ({
      title: titleCase(name),
      terms: [name, ...name.split(/\s+/)],
      source: pickSentences(sentences, [name, ...name.split(/\s+/)], 14, 24 + idx * 8),
    })),
    { title: `NCERT activity / working`, terms: ["activity", "experiment", "observe", topic], source: [...activityText, ...pickSentences(sentences, topicTerms, 10, 42)] },
    { title: `Important NCERT relationships`, terms: ["law", "relation", "formula", "proportional", topic], source: [...formulas, ...pickSentences(sentences, topicTerms, 10, 56)] },
    { title: `Applications and interpretation`, terms: ["application", "used", "therefore", "hence", topic], source: pickSentences(sentences, ["application", "used", "therefore", "hence", ...topicTerms], 14, 70) },
    { title: `Common exam points`, terms: ["important", "remember", "note", "example", topic], source: pickSentences(sentences, ["important", "example", "note", ...topicTerms], 14, 84) },
    { title: `${topic}: final revision`, terms: topicTerms, source: pickSentences(sentences, topicTerms, 14, 100) },
  ];

  // Global dedupe: no sentence appears on more than one slide.
  const usedSentences = new Set<string>();
  const filterUnused = (arr: string[]) => {
    const out: string[] = [];
    for (const s of uniqueByNormalized(arr)) {
      const key = normalizeText(s).slice(0, 140);
      if (!key || usedSentences.has(key)) continue;
      usedSentences.add(key);
      out.push(s);
      if (out.length >= 12) break;
    }
    return out;
  };
  const usedTitles = new Set<string>();
  const makeUniqueTitle = (t: string) => {
    let base = t.trim();
    let attempt = base;
    let i = 2;
    while (usedTitles.has(normalizeText(attempt))) {
      attempt = `${base} (${i++})`;
    }
    usedTitles.add(normalizeText(attempt));
    return attempt;
  };

  const slides: Slide[] = [];
  for (let index = 0; index < plan.length && slides.length < 10; index++) {
    const item = plan[index];
    let src = filterUnused(item.source);
    if (src.length < 3) {
      src = filterUnused([...src, ...pickSentences(sentences, item.terms, 14, index * 9)]);
    }
    if (src.length < 3) continue; // skip empty slide rather than duplicate one
    slides.push(makeSlide(makeUniqueTitle(item.title), src, topic, visuals[index] ?? "lightbulb", index));
  }
  // Top up with residual sentences if plan produced <15 slides.
  let offset = 0;
  while (slides.length < 10 && offset < sentences.length) {
    const src = filterUnused(sentences.slice(offset, offset + 14));
    offset += 14;
    if (src.length < 3) continue;
    const idx = slides.length;
    slides.push(makeSlide(makeUniqueTitle(`${topic} — NCERT point ${idx + 1}`), src, topic, visuals[idx] ?? "lightbulb", idx));
  }
  return slides.slice(0, 10);
}

function fallbackActivities(topic: string, context: string): Activity[] {
  const sentences = splitSentences(context).filter((s) => sentenceHasAny(s, [topic, "activity", "experiment", "observe", "apparatus"])).slice(0, 6);
  return [
    {
      name: `${topic} — NCERT working guide`,
      objective: `Understand the working of ${topic} using the selected NCERT text.`,
      apparatus: ["NCERT diagram/text", "Notebook", "Teacher-guided classroom demonstration"],
      steps: (sentences.length
        ? sentences
        : [
            `Read the matching NCERT passage for ${topic}.`,
            "Identify the main condition, change, observation and result described in the text.",
            "Connect the observation to the NCERT explanation and conclusion.",
          ]
      ).map((sentence, index) => ({
        step: index + 1,
        title: index === 0 ? "Start from NCERT" : `Working step ${index + 1}`,
        description: sentence,
      })),
      observation: "The observation is taken from the filtered NCERT excerpt shown in the generated lesson.",
      conclusion: `The concept of ${topic} is explained only from the matching uploaded NCERT memory.`,
    },
  ];
}

function normalizeActivities(activities: unknown, topic: string, context: string): Activity[] {
  if (!Array.isArray(activities) || activities.length === 0) return fallbackActivities(topic, context);
  return activities.map((activity, index) => {
    const value = activity as Partial<Activity>;
    const steps =
      Array.isArray(value.steps) && value.steps.length > 0
        ? value.steps.map((step, stepIndex) => {
            const s = step as Partial<ActivityStep>;
            return {
              step: Number(s.step || stepIndex + 1),
              title: String(s.title || `Step ${stepIndex + 1}`),
              description: String(s.description || "Follow this NCERT step."),
            };
          })
        : fallbackActivities(topic, context)[0].steps;
    return {
      name: String(value.name || `${topic} activity ${index + 1}`),
      objective: String(value.objective || `Understand ${topic}.`),
      apparatus: Array.isArray(value.apparatus) ? value.apparatus.map(String) : [],
      steps,
      observation: String(value.observation || "Observe the result described in NCERT."),
      conclusion: String(value.conclusion || `Connect the activity result to ${topic}.`),
    };
  });
}

function normalizeSlides(slides: unknown, topic: string, context: string): Slide[] {
  const fallback = fallbackSlides(topic, context);
  const parsed: Slide[] = Array.isArray(slides)
    ? slides.map((slide, index) => {
        const v = slide as Partial<Slide> & { key_terms?: unknown; notes?: unknown };
        const bullets =
          Array.isArray(v.bullets) && v.bullets.length > 0 ? v.bullets.slice(0, 7).map(String) : fallback[index]?.bullets ?? [];
        const notes = Array.isArray(v.notes) ? (v.notes as unknown[]).slice(0, 4).map(String) : fallback[index]?.notes ?? [];
        const key_terms = Array.isArray(v.key_terms)
          ? (v.key_terms as Array<{ term?: unknown; meaning?: unknown }>)
              .slice(0, 4)
              .map((t) => ({ term: String(t?.term ?? ""), meaning: String(t?.meaning ?? "") }))
              .filter((t) => t.term)
          : [];
        return {
          title: String(v.title || fallback[index]?.title || topic),
          bullets,
          notes,
          key_terms,
          ncert_quote: v.ncert_quote ? String(v.ncert_quote) : undefined,
          visual: String(v.visual || fallback[index]?.visual || "lightbulb"),
          visual_prompt: v.visual_prompt ? String(v.visual_prompt) : fallback[index]?.visual_prompt,
          grounding: v.grounding ? String(v.grounding) : fallback[index]?.grounding,
          caption: v.caption ? String(v.caption) : fallback[index]?.caption,
        };
      })
    : [];
  return [...parsed, ...fallback].slice(0, 10);
}

function buildLocalActivities(topic: string, context: string): Activity[] {
  const sentences = splitSentences(context);
  const activityStart = sentences.findIndex((s) => /Activity\s+\d+(?:\.\d+)?|experiment|apparatus|procedure/i.test(s));
  const pool = activityStart >= 0 ? sentences.slice(activityStart, activityStart + 12) : sentences.filter((s) => sentenceHasAny(s, [topic, "observe", "show", "place", "connect", "measure", "calculate"])).slice(0, 8);
  if (pool.length === 0) return fallbackActivities(topic, context);
  const id = pool.join(" ").match(/Activity\s+\d+(?:\.\d+)?/i)?.[0];
  const steps = pool.slice(0, 7).map((sentence, index) => ({
    step: index + 1,
    title: index === 0 ? "NCERT starting point" : `Working step ${index + 1}`,
    description: trimToWords(sentence, 220),
  }));
  return [
    {
      name: id || `${topic} — NCERT working guide`,
      objective: `Understand ${topic} using only the matched NCERT passage.`,
      apparatus: uniqueByNormalized(pool.join(" ").match(/\b(voltmeter|ammeter|cell|battery|wire|key|resistor|capacitor|plate|dielectric|glass rod|silk|pith ball|lens|mirror|prism|beaker|test tube|magnet|spring balance|ruler|scale)\b/gi) ?? []).slice(0, 8),
      steps,
      observation: trimToWords(pool.find((s) => /observe|observation|seen|notice|shows|found/i.test(s)) || pool[Math.min(steps.length - 1, 2)] || pool[0], 240),
      conclusion: trimToWords(pool.find((s) => /conclude|therefore|hence|thus|shows that|we find/i.test(s)) || pool[pool.length - 1], 240),
    },
  ];
}

function fallbackVideo(topic: string, activities: Activity[]): { title: string; scenes: VideoScene[] } {
  const steps = activities.flatMap((a) => a.steps || []);
  const source =
    steps.length > 0
      ? steps.slice(0, 6)
      : [
          { step: 1, title: "Set up the concept", description: `Introduce ${topic} with the NCERT diagram or apparatus.` },
          { step: 2, title: "Show the change", description: "Animate the ray, particle, object or quantity changing step by step." },
          { step: 3, title: "Reveal the reason", description: "Zoom into the microscopic or conceptual cause behind the observation." },
          { step: 4, title: "Connect result", description: "End with the NCERT observation and conclusion." },
        ];
  return {
    title: `${topic} activity animation`,
    scenes: source.map((step, index) => ({
      scene: index + 1,
      title: step.title,
      duration_s: 5,
      visual_prompt: `Cinematic 3D classroom-lab animation: ${step.description}`,
      narration: step.description,
    })),
  };
}

/** Main lesson generation function — local NCERT-excerpt builder, no paid AI calls. */
export const generateLesson = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<GenerationResult> => {
    // Lesson cache — same (class, subject, chapter, topic, subtopics) returns instantly.
    const lessonKey = hashKey([
      "lesson-v5-10slide-a4",
      data.klass,
      data.subject,
      data.chapter,
      data.topic,
      data.subtopics,
    ]);
    const cdb = cacheSupa();
    if (!data.nocache) {
      try {
        const { data: hit } = await (cdb as any)
          .from("lesson_cache")
          .select("result")
          .eq("cache_key", lessonKey)
          .maybeSingle();
        if (hit?.result) return hit.result as GenerationResult;
      } catch {
        /* miss */
      }
    }

    const s = supa();
    const terms = buildTerms(data);

    // 1. Find matching books by the selected class and subject
    const { data: classBooks, error: bErr } = await s
      .from("ncert_books")
      .select("id, class, subject, chapter, file_name")
      .ilike("class", `%${classNumber(data.klass)}%`)
      .limit(100);
    if (bErr) throw new Error(bErr.message);
    let candidates = (classBooks ?? []).filter((book) => subjectMatches(book.subject, data.subject, data.klass));

    // Fallback 1: same class, ignore subject filter and rank by topic later
    if (candidates.length === 0 && (classBooks?.length ?? 0) > 0) {
      candidates = classBooks!;
    }

    // Fallback 2: cross-class search
    if (candidates.length === 0) {
      const { data: allBooks } = await s.from("ncert_books").select("id, class, subject, chapter, file_name").limit(500);
      const pool = (allBooks ?? []).filter((b) => subjectMatches(b.subject, data.subject, b.class));
      candidates = pool.length > 0 ? pool : (allBooks ?? []);
    }

    if (candidates.length === 0) {
      throw new Error(`No uploaded NCERT books found in the library. Please upload PDFs from the Upload page.`);
    }

    // 2. Pre-rank by metadata
    const chapterTermsPre = data.chapter ? [normalizeText(data.chapter), ...normalizeText(data.chapter).split(" ")] : [];
    const preRanked = candidates
      .map((b) => ({ b, m: score(`${b.chapter} ${b.file_name} ${b.subject} ${b.class}`, [...terms, ...chapterTermsPre]) }))
      .sort((a, z) => z.m - a.m);
    const cap = candidates.length <= 6 ? candidates.length : 6;
    const topCandidates = preRanked.slice(0, cap).map((x) => x.b);
    candidates = topCandidates;

    // 3. Fetch chunks PER BOOK in parallel (bounded for speed)
    const perBookChunks = await Promise.all(
      topCandidates.map((b) =>
        s
          .from("ncert_chunks")
          .select("book_id, chunk_index, content")
          .eq("book_id", b.id)
          .order("chunk_index", { ascending: true })
          .limit(300)
          .then((r) => r.data ?? []),
      ),
    );
    const chunks = perBookChunks.flat();


    const chapterTerms = data.chapter ? [normalizeText(data.chapter), ...normalizeText(data.chapter).split(" ")] : [];
    const bookScores = candidates
      .map((book) => {
        const metadataScore = score(`${book.chapter} ${book.file_name}`, [...terms, ...chapterTerms]);
        const chunkScore = (chunks ?? [])
          .filter((chunk) => chunk.book_id === book.id)
          .reduce((sum, chunk) => sum + score(chunk.content, terms), 0);
        return { ...book, _s: metadataScore * 5 + chunkScore };
      })
      .sort((a, b) => b._s - a._s);

    let bestScore = bookScores[0]?._s ?? 0;
    let selectedBooks = bestScore > 0
      ? bookScores.filter((book) => book._s >= Math.max(1, bestScore * 0.45)).slice(0, 2)
      : bookScores.slice(0, 2);
    let selectedIds = new Set(selectedBooks.map((book) => book.id));
    let selectedChunks = (chunks ?? []).filter((chunk) => selectedIds.has(chunk.book_id));

    // Cross-class rescue
    const hasTopicalHit = (chunks ?? []).some((c) => score(c.content, terms) > 8);
    if (!hasTopicalHit) {
      const { data: allBooks2 } = await s.from("ncert_books").select("id, class, subject, chapter, file_name").limit(500);
      const ranked2 = (allBooks2 ?? [])
        .map((b) => ({ b, m: score(`${b.chapter} ${b.file_name} ${b.subject} ${b.class}`, [...terms, ...chapterTerms]) }))
        .sort((a, z) => z.m - a.m)
        .slice(0, 10)
        .map((x) => x.b);
      if (ranked2.length > 0) {
        const { data: chunks2 } = await s
          .from("ncert_chunks")
          .select("book_id, chunk_index, content")
          .in("book_id", ranked2.map((b) => b.id))
          .limit(3000);
        const scored2 = ranked2
          .map((book) => {
            const meta = score(`${book.chapter} ${book.file_name}`, [...terms, ...chapterTerms]);
            const chunkS = (chunks2 ?? [])
              .filter((c) => c.book_id === book.id)
              .reduce((s, c) => s + score(c.content, terms), 0);
            return { ...book, _s: meta * 5 + chunkS };
          })
          .sort((a, b) => b._s - a._s);
        if ((scored2[0]?._s ?? 0) > bestScore) {
          candidates = ranked2;
          bestScore = scored2[0]._s;
          selectedBooks = scored2.filter((b) => b._s >= Math.max(1, bestScore * 0.45)).slice(0, 2);
          selectedIds = new Set(selectedBooks.map((b) => b.id));
          selectedChunks = (chunks2 ?? []).filter((c) => selectedIds.has(c.book_id));
        }
      }
    }

    // 3. Rank chunks by topic/subtopic/chapter relevance
    const ranked = selectedChunks
      .map((c) => ({ ...c, _s: score(c.content, terms) }))
      .sort((a, b) => b._s - a._s)
      .filter((c) => c._s > 0);
    const activityChunks = selectedChunks
      .map((c) => ({ ...c, _s: score(c.content, ["activity", "experiment", data.topic]) }))
      .sort((a, b) => b._s - a._s)
      .filter((c) => normalizeText(c.content).includes("activity") || c._s > 12)
      .slice(0, 12);

    const pickedMap = new Map<string, string>();
    for (const chunk of [...ranked.slice(0, 28), ...activityChunks]) {
      pickedMap.set(`${chunk.book_id}:${chunk.chunk_index}`, chunk.content);
    }
    const picked = [...pickedMap.values()].length > 0 ? [...pickedMap.values()] : selectedChunks.slice(0, 24).map((c) => c.content);
    const context = picked.join("\n---\n").slice(0, 30000);
    if (!context.trim()) {
      throw new Error(`The matching Class ${data.klass} ${data.subject} PDF was found, but no readable text chunks were saved. Re-ingest that PDF from Upload.`);
    }

    // 4. Build slides + activity + storyboard locally from saved NCERT text.
    // This is intentionally AI-free so it is fast, repeatable, and never spends credits on page load.
    const slidesRaw = buildLocalSlides(data.topic, data.subtopics, context);
    const contextNorm = normalizeText(context);
    const slides = slidesRaw.map((sl) => ({ ...sl, verification: validateSlideAgainstContext(sl, contextNorm) }));
    const activities = normalizeActivities(buildLocalActivities(data.topic, context), data.topic, context);
    const video = fallbackVideo(data.topic, activities);


    // Build verifiable activity matches with confidence
    const bookMeta = new Map(selectedBooks.map((b) => [b.id, b]));
    const maxRaw = Math.max(1, ...activityChunks.map((c) => c._s));
    const matchPool = activityChunks.length > 0 ? activityChunks : ranked.slice(0, 5).map((c) => ({ ...c, _s: c._s }));
    const activity_matches: ActivityMatch[] = matchPool.slice(0, 6).map((c) => {
      const text = String(c.content || "");
      const idMatch = text.match(/Activity\s+\d+(?:\.\d+)?/i);
      const lower = text.toLowerCase();
      const idx = idMatch ? Math.max(0, lower.indexOf(idMatch[0].toLowerCase()) - 40) : 0;
      const excerpt = text.slice(idx, idx + 480).replace(/\s+/g, " ").trim();
      const book = bookMeta.get(c.book_id);
      return {
        book_id: c.book_id,
        chapter: book?.chapter || "",
        file_name: book?.file_name || "",
        chunk_index: c.chunk_index,
        excerpt,
        activity_id: idMatch ? idMatch[0] : null,
        confidence: Math.min(100, Math.round((c._s / maxRaw) * 100)),
      };
    });

    const out: GenerationResult = {
      source_books: selectedBooks.map((b) => ({ id: b.id, chapter: b.chapter, class: b.class, subject: b.subject })),
      context_chars: context.length,
      slides,
      activities,
      activity_matches,
      video,
    };

    // Save lesson cache (best-effort)
    try {
      await (cdb as any).from("lesson_cache").upsert({
        cache_key: lessonKey,
        klass: String(data.klass || ""),
        subject: String(data.subject || ""),
        chapter: String(data.chapter || ""),
        topic: String(data.topic || ""),
        subtopics: String(data.subtopics || ""),
        result: out,
      });
    } catch (e) {
      console.warn("lesson cache write failed", e);
    }

    return out;
  });

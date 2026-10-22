import {isSeniorScienceStudy,seniorScienceEvidence,seniorStudyContent,seniorActivityConclusions} from '@/lib/senior-study-notes';
import {secondaryScienceSectionEvidence,substantiveStudyLine} from '@/lib/secondary-study-evidence';
import { sourceQuizItems } from "@/lib/source-quiz";
import { appendSocialRevisionNotes } from "@/lib/social-revision-notes";
import { socialChapterPart, socialTitle } from "@/lib/social-science-chapters";
import { readLessonTextbooks } from "@/lib/lesson-textbooks";
import { sequenceChemistryNotes } from "@/lib/chemistry-note-sequence";
import { withPhysicsDimensions } from "@/lib/physics-dimensions";
import { ENGLISH_CHAPTERS } from "@/lib/english-chapters";
import { splitReferenceContent } from "@/lib/reference-visuals";
import { appendUploadedReferenceNotes } from "@/lib/uploaded-reference-notes";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { buildFlowGraph, type FlowGraph } from "@/lib/flow-layouts";
import { renderLessonIllustrationDataUrl } from "@/lib/napkin-infographic";
import { attachTeacherNotes, type NoteSection } from "@/lib/ncert-teacher-notes";
import { topicEvidence } from "@/lib/topic-evidence";
import { cleanSourceNoteLine, isSourceTask, validStudyTerm, readableSourceRelation } from "@/lib/source-note-quality";
import {sourceExtractionIssue,quarantineExtractionSections} from './source-extraction-review';
import { isDefinitionStatement } from "@/lib/note-labels";
import { extractExperimentActivities } from "@/lib/experiment-activities";
import { languageVolumeMatches, scopeTextbookPages, scopeSocialChapterPages, scopeEnglishChapterPages, referenceFormulaEvidence } from "@/lib/lesson-source-scope";
import { chaptersFor, subtopicsFor } from "@/lib/ncert-syllabus";
import { REF_BOOK_PATTERN, combinedReferenceMatches } from "@/lib/reference-books";
import { sourceDiscussion, reviewNotes, learningScaffold } from "@/lib/learning-design";
import { verifyNoteSections, normalizeForGrounding, autoFixAndVerifyNotes, type NotesCheck } from "@/lib/notes-verification";


function hashKey(parts: Array<string | undefined | null>) {
  const norm = parts
    .map((p) => (p ?? "").toString().trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return createHash("sha256").update(norm).digest("hex").slice(0, 40);
}


// Slide infographic rendering is local SVG, cached for quick reuse.

async function cacheSupa() {
 const {supabaseAdmin}=await import("@/integrations/supabase/client.server");return supabaseAdmin;
}

/** Generate and cache local 2D slide infographics from the exact slide notes. */
export const generateSlideImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().default(""),
        chapter: z.string().optional().default(""),
        bullets: z.array(z.string()).default([]),
        caption: z.string().optional().default(""),
        subject: z.string().optional().default(""),
        klass: z.string().optional().default(""),
        notes: z.array(z.string()).optional().default([]),
        key_terms: z.array(z.object({ term: z.string().default(""), meaning: z.string().default("") })).optional().default([]),
        visual_prompt: z.string().optional().default(""),
        grounding: z.string().optional().default(""),
        slideIndex: z.number().int().min(0).max(50).optional().default(0),
        sections: z
          .array(z.object({ heading: z.string().default(""), kind: z.string().default("bullets"), lines: z.array(z.string()).default([]) }))
          .optional(),
        avoidUrls: z.array(z.string()).optional().default([]),
        nocache: z.boolean().optional().default(false),
        cacheOnly: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Cache lookup — same (class, subject, title, visual_prompt) returns instantly.
    // v13: topic-aware textbook renderer with large labels and visual models.
    const cacheKey = hashKey([
      "img-v26-atomic-topic-diagrams",
      process.env.HF_IMAGES_FREE_ONLY === "true" && !!process.env.HF_IMAGE_TOKEN ? "hf-enabled" : "local-only",
      data.klass,
      data.subject,
      String(data.slideIndex),
      data.title,
      data.chapter,
      data.visual_prompt,
      data.grounding.slice(0, 500),
      (data.bullets || []).join(" "),
      (data.notes || []).join(" "),
      (data.key_terms || []).map((t) => `${t.term}:${t.meaning}`).join(" "),
      (data.sections || []).flatMap((section) => [section.heading, ...(section.lines || [])]).join(" "),
    ]);

    const db = await cacheSupa();
    const startedAt = Date.now();
    const auditBase = {
      cache_key: cacheKey,
      klass: String(data.klass || ""),
      subject: String(data.subject || ""),
      title: String(data.title || ""),
      visual_prompt: String(data.visual_prompt || ""),
      grounding: [
        String(data.grounding || ""),
        (data.notes || []).length ? `Slide notes: ${(data.notes || []).join(" | ")}` : "",
        (data.key_terms || []).length ? `Key terms: ${(data.key_terms || []).map((t) => `${t.term}: ${t.meaning}`).join(" | ")}` : "",
      ].filter(Boolean).join("\n").slice(0, 4000),
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
          if (hit.image_url.startsWith("[CONTEXT_IMAGE_V1]")) {
            try { const saved = JSON.parse(hit.image_url.slice("[CONTEXT_IMAGE_V1]".length)); return { url: saved.diagram as string, contextUrl: saved.context as string, cached: true }; } catch { /* Render a valid new image below. */ }
          } else return { url: hit.image_url as string, contextUrl: undefined as string | undefined, cached: true };
        }
      } catch {
        /* ignore cache miss */
      }
    }

    if (data.cacheOnly) {
      await logAudit({ status: "cache_miss_skipped", cached: false });
      return { url: "", contextUrl: undefined as string | undefined, cached: false, skipped: true };
    }

    // FREE pipeline: render the reference-style infographic locally from the
    // exact slide notes. No AI gateway, no credits, no 402 failures.
    let url = "";
    const source: "local" = "local";
    let renderError: string | undefined;
    try {
      const sectionNotes = (data.sections || [])
        .filter((section) => section.kind !== "diagram")
        .flatMap((section) => section.lines || []);
      const visualNotes = [...new Set([...(data.notes || []), ...sectionNotes])]
        .sort((a, b) => Number(/formula|derivation|equation/i.test(b)) - Number(/formula|derivation|equation/i.test(a)))
        .slice(0, 18);
      url = renderLessonIllustrationDataUrl({
        title: data.title,
        chapter: data.chapter,
        bullets: data.bullets,
        notes: visualNotes,
        keyTerms: data.key_terms,
        subject: data.subject,
        slideIndex: data.slideIndex,
      });
    } catch (e) {
      renderError = e instanceof Error ? e.message : String(e);
    }

    if (!url) {
      await logAudit({ status: "no_image", cached: false, error: renderError || "render_failed" });
      return { url: "", contextUrl: undefined as string | undefined, cached: false, error: renderError || "render_failed" };
    }



    const { createFreeContextIllustration } = await import("@/lib/hf-image-provider.server");
    const contextUrl = await createFreeContextIllustration(data.subject, [data.chapter,data.title].filter(Boolean).join(' — '), (data.key_terms || []).map(item=>item.term));
    try {
      await (db as any).from("slide_image_cache").upsert({
        cache_key: cacheKey,
        klass: String(data.klass || ""),
        subject: String(data.subject || ""),
        title: String(data.title || ""),
        visual_prompt: String(data.visual_prompt || ""),
        image_url: contextUrl ? "[CONTEXT_IMAGE_V1]" + JSON.stringify({ diagram: url, context: contextUrl }) : url,
      });
    } catch (e) {
      console.warn("slide image cache write failed", e);
    }

    await logAudit({ status: "success", cached: false, image_url: url.slice(0, 200), error: renderError });
    return { url, contextUrl, cached: false, source };
  });

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
  const variantSeed = Array.from(`${title}|${visualPrompt}|${slideIndex}`).reduce((a, c) => a + c.charCodeAt(0), 0);
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

      <metadata>Automated A4 label safe-padding check enabled: ${PAD + 24}px inset.</metadata>

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
    // Generic labelled sketch — unique layout per slide so fallback diagrams do not repeat.
    const labels = [
      wrapSvgText(bullets[0] || "NCERT concept", 16, 2),
      wrapSvgText(bullets[1] || title, 16, 2),
      wrapSvgText(bullets[2] || "observation", 16, 2),
      wrapSvgText(bullets[3] || "result", 16, 2),
    ];
    if (variant === 0) {
      const nodes = [
        { x: bodyLeft + 180, y: cy, label: labels[0] },
        { x: cx, y: cy, label: labels[1] },
        { x: bodyRight - 180, y: cy, label: labels[2] },
      ];
      svgContent += nodes.map((n, i) => `
        <circle cx="${n.x}" cy="${n.y}" r="108" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="4"/>
        ${n.label.map((line, li) => `<text class="label" x="${n.x}" y="${n.y - 8 + li * 26}" text-anchor="middle">${escapeXml(line)}</text>`).join("")}
        ${i < nodes.length - 1 ? `<line x1="${n.x + 114}" y1="${n.y}" x2="${nodes[i + 1].x - 116}" y2="${n.y}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>` : ""}
      `).join("");
    } else if (variant === 1) {
      const layers = [0, 1, 2, 3].map((n) => ({
        x: cx - 360 + n * 240,
        y: cy - 150 + n * 78,
        w: 300,
        h: 92,
        label: labels[n],
      }));
      svgContent += layers.map((box, n) => `
        <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="18" fill="${n % 2 ? '#ffffff' : colors.lightAccent}" stroke="${colors.accent}" stroke-width="4"/>
        ${box.label.map((line, li) => `<text class="label" x="${box.x + box.w / 2}" y="${box.y + 38 + li * 26}" text-anchor="middle">${escapeXml(line)}</text>`).join("")}
        ${n < layers.length - 1 ? `<line x1="${box.x + box.w}" y1="${box.y + box.h / 2}" x2="${layers[n + 1].x - 12}" y2="${layers[n + 1].y + layers[n + 1].h / 2}" stroke="${colors.accent}" stroke-width="4" marker-end="url(#arrowhead)"/>` : ""}
      `).join("");
    } else {
      svgContent += `
        <rect x="${cx - 460}" y="${cy - 170}" width="360" height="260" rx="22" fill="${colors.lightAccent}" stroke="${colors.accent}" stroke-width="4"/>
        <rect x="${cx + 100}" y="${cy - 170}" width="360" height="260" rx="22" fill="#fff" stroke="${colors.accent}" stroke-width="4"/>
        <circle cx="${cx}" cy="${cy - 40}" r="74" fill="#fff" stroke="${colors.accent}" stroke-width="5"/>
        <text class="subtitle" x="${cx}" y="${cy - 30}" text-anchor="middle">NCERT</text>
        <line x1="${cx - 100}" y1="${cy - 40}" x2="${cx - 250}" y2="${cy - 40}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>
        <line x1="${cx + 100}" y1="${cy - 40}" x2="${cx + 250}" y2="${cy - 40}" stroke="${colors.accent}" stroke-width="5" marker-end="url(#arrowhead)"/>
        ${labels[0].map((line, li) => `<text class="label" x="${cx - 280}" y="${cy - 60 + li * 28}" text-anchor="middle">${escapeXml(line)}</text>`).join("")}
        ${labels[1].map((line, li) => `<text class="label" x="${cx + 280}" y="${cy - 60 + li * 28}" text-anchor="middle">${escapeXml(line)}</text>`).join("")}
        <text class="small" x="${cx}" y="${cy + 102}" text-anchor="middle">cause → observation → conclusion</text>
      `;
    }
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

  svgContent = enforceSvgTextSafety(svgContent, width, height, PAD + 24);
  const check = inspectSvgTextSafety(svgContent, width, height, PAD + 24);
  svgContent = svgContent.replace("</svg>", `<metadata>label-fit:${check.safe ? "pass" : "adjusted"};issues:${check.issues.length}</metadata></svg>`);
  const base64 = Buffer.from(svgContent).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function svgTextFontSize(className: string) {
  if (className.includes("title")) return 40;
  if (className.includes("subtitle")) return 26;
  if (className.includes("label") || className.includes("bullet")) return 22;
  if (className.includes("cap")) return 20;
  return 18;
}

function getSvgAttr(attrs: string, name: string) {
  return attrs.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? "";
}

function setSvgAttr(attrs: string, name: string, value: string) {
  if (new RegExp(`${name}="[^"]*"`).test(attrs)) return attrs.replace(new RegExp(`${name}="[^"]*"`), `${name}="${value}"`);
  return `${attrs} ${name}="${value}"`;
}

function svgPlainText(inner: string) {
  return inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

function enforceSvgTextSafety(svg: string, width: number, height: number, safePad: number) {
  const minX = safePad;
  const maxX = width - safePad;
  const minY = safePad + 10;
  const maxY = height - safePad - 10;
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (full, rawAttrs: string, inner: string) => {
    const text = svgPlainText(inner);
    const xRaw = Number(getSvgAttr(rawAttrs, "x"));
    const yRaw = Number(getSvgAttr(rawAttrs, "y"));
    if (!Number.isFinite(xRaw) || !Number.isFinite(yRaw) || !text) return full;
    const className = getSvgAttr(rawAttrs, "class");
    const fontSize = svgTextFontSize(className);
    const anchor = getSvgAttr(rawAttrs, "text-anchor") || "start";
    const estimatedW = Math.min(text.length * fontSize * 0.56, maxX - minX);
    let x = xRaw;
    if (anchor === "middle") x = Math.min(Math.max(x, minX + estimatedW / 2), maxX - estimatedW / 2);
    else if (anchor === "end") x = Math.min(Math.max(x, minX + estimatedW), maxX);
    else x = Math.min(Math.max(x, minX), maxX - estimatedW);
    const y = Math.min(Math.max(yRaw, minY + fontSize * 0.4), maxY);
    let attrs = setSvgAttr(rawAttrs, "x", String(Math.round(x)));
    attrs = setSvgAttr(attrs, "y", String(Math.round(y)));
    const maxChars = Math.max(8, Math.floor((maxX - minX) / (fontSize * 0.56)));
    const safeInner = text.length > maxChars ? escapeXml(trimToWords(text, maxChars)) : inner;
    return `<text${attrs}>${safeInner}</text>`;
  });
}

function inspectSvgTextSafety(svg: string, width: number, height: number, safePad: number) {
  const issues: string[] = [];
  const minX = safePad;
  const maxX = width - safePad;
  const minY = safePad;
  const maxY = height - safePad;
  svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (_full, attrs: string, inner: string) => {
    const text = svgPlainText(inner);
    const x = Number(getSvgAttr(attrs, "x"));
    const y = Number(getSvgAttr(attrs, "y"));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !text) return "";
    const fontSize = svgTextFontSize(getSvgAttr(attrs, "class"));
    const anchor = getSvgAttr(attrs, "text-anchor") || "start";
    const estimatedW = Math.min(text.length * fontSize * 0.56, maxX - minX);
    const left = anchor === "middle" ? x - estimatedW / 2 : anchor === "end" ? x - estimatedW : x;
    const right = left + estimatedW;
    const top = y - fontSize;
    const bottom = y + fontSize * 0.35;
    if (left < minX || right > maxX || top < minY || bottom > maxY) issues.push(text.slice(0, 40));
    return "";
  });
  return { safe: issues.length === 0, issues };
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
  mode: z.enum(["topic", "chapter"]).optional().default("topic"),
  nocache: z.coerce.boolean().optional().default(false),
});

// Language subjects: no 3D, no subtopics, generate the FULL chapter verbatim in
// batches of 10 slides with a "break time" slide between batches.
export const LANGUAGE_SUBJECTS = ["english", "hindi", "sanskrit"];
export function isLanguageSubject(subject: string): boolean {
  const s = (subject || "").toLowerCase();
  return LANGUAGE_SUBJECTS.some((l) => s.includes(l));
}

// Boilerplate / branding / legal noise commonly extracted from publisher PDFs
// (ALLEN, private-use symbols, copyright notices). We strip these before the
// slide builder ever sees them so notes stay strictly NCERT-relevant.
const JUNK_PATTERNS: RegExp[] = [
  /\ballen\b/i,
  /career institute/i,
  /trademark|copyright|all rights|any breach|prosecut|propriety rights|punishable|retrieval system|jurisdiction/i,
  /this (publication|work) is/i,
  /kota,?\s*rajasthan/i,
  /pre.?medical|enthusiast\s*\|\s*leader|study material/i,
  /^\s*(page|pg|chapter)\s*\d+\s*$/i,
  /^\s*\d+\s*$/,
  /^\s*®?\s*$/,
];
export function filterJunkSentences(sentences: string[], preserveWording=false): string[] {
  return (preserveWording?sentences:sentences.map(cleanSourceNoteLine)).filter((s) => {
    const t = String(s || "").trim();
    if (t.length < 30) return false;
    if (JUNK_PATTERNS.some((r) => r.test(t))) return false;
    // Strip any PUA glyphs left in the text
    if (/[\uE000-\uF8FF]{2,}/.test(t)) return false;
    return true;
  });
}

// Extract NCERT figure references (e.g. "Fig. 12.3", "figure 2.1")
export function extractFigureRefs(text: string): string[] {
  const out = new Set<string>();
  const re = /\b(?:fig(?:ure)?\.?\s*\d+(?:\.\d+)?[a-z]?)/gi;
  const matches = text.match(re) || [];
  for (const m of matches) out.add(m.replace(/\s+/g, " ").trim());
  return [...out].slice(0, 6);
}

export type FigurePlacementCheck = {
  /** Figures whose refs actually appear in this slide's own source text. */
  expected: string[];
  /** Figures the slide claims to reference (from `slide.figures`). */
  placed: string[];
  /** Placed figures that match the slide's own text. */
  correct: string[];
  /** Placed figures NOT in this slide's text — likely swapped from another slide. */
  swapped: string[];
  /** Expected figures that the slide never lists. */
  missing: string[];
  pass: boolean;
};

export type SlideVerification = {
  coverage: number;
  matched: number;
  total: number;
  missing: string[];
  diagram_match: number;
  diagram_label_fit: "pass" | "adjusted";
  diagram_issues: string[];
  figures_check?: FigurePlacementCheck;
  /** LaTeX validity + grounding confidence of the PW/NCERT teacher notes. */
  notes_check?: NotesCheck;
  overall_pass: boolean;
};


export type FiguresReport = {
  /** Every unique figure ref present anywhere in the NCERT context. */
  context_figures: string[];
  /** Figures referenced in context but not placed on any slide. */
  unplaced: string[];
  /** Slide indices with a failing figure-placement check. */
  failing_slide_indices: number[];
  pass: boolean;
};

export type ModelCategoryKey =
  | "physics_circuit"
  | "chemistry_atom"
  | "biology_cell"
  | "math_geometry"
  | "none";

export type SlideDebug = {
  chosen_category: ModelCategoryKey;
  reason: string;
  threshold: number;
  total_hits: number;
  /** Per-category cue hits found in title/bullets/notes (lower-cased). */
  category_hits: Array<{ key: ModelCategoryKey; hits: number; cues: string[] }>;
  /** Which keywords were found in which source field. */
  keyword_sources: { title: string[]; bullets: string[]; notes: string[] };
};

export type SlideKind = "content" | "break" | "mcq" | "chapter";

export type McqOption = { key: "A" | "B" | "C" | "D"; text: string };
export type Mcq = {
  question: string;
  options: McqOption[];
  answer: "A" | "B" | "C" | "D";
  explanation?: string;
};

export type Slide = {
  /** Additive AI-drafted teaching support, separate from original notes/evidence. */
  teaching_support?: NoteSection[];
  teacher_blank?: {id:string;topic:string};
  topic_recovery?: {status:"missing"|"teacher"|"official"; sourceUrl?:string};
  source_recovery?: {attempts:number;kind:"uploaded-ncert"|"official-ncert-mirror"|"official-online-supplement";url?:string;sources?:Array<{url:string;title:string;sourceClass:string}>};
  teacher_pdf?: {path:string;page:number;file_name:string};
  teacher_revision?: {book_id:string;file_name:string;page?:number};
  context_illustration?: { url: string; provider: "Hugging Face"; description: string };
  reference_visuals?: import("@/lib/reference-visuals").ReferenceVisual[];
  notes_quality?: ReturnType<typeof reviewNotes>;
  title: string;
  bullets: string[];
  notes: string[];
  key_terms: { term: string; meaning: string }[];
  ncert_quote?: string;
  visual: string;
  visual_prompt?: string;
  grounding?: string;
  caption?: string;
  /** Slide kind — controls rendering (content vs break vs MCQ vs full chapter text). */
  kind?: SlideKind;
  /** Full verbatim NCERT chapter text (used by chapter-mode language slides). */
  chapter_text?: string;
  /** Referenced NCERT figures on this slide (e.g. "Fig. 12.3"). */
  figures?: string[];
  /** Single MCQ payload for kind === "mcq". */
  mcq?: Mcq;
  /** Mermaid.js source — retained for backward-compat. */
  mermaid_flow?: string;
  /** React Flow graph rendered as the slide's 2D diagram. */
  flow_graph?: FlowGraph;
  /** Registry key mapped to a Spline scene — cleared for language subjects. */
  model_category?: ModelCategoryKey;
  /** Structured NCERT teacher notes (Definition → Formula → ... → Memory trick). */
  sections?: NoteSection[];
  verification?: SlideVerification;
  debug?: SlideDebug;
};

// ---------- Math beautifier ----------
// NCERT PDFs frequently lose sub/superscripts during extraction: "H2O", "m2",
// "10-19", "E = mc2". Reconstruct them into real Unicode so notes read cleanly.
const SUP_MAP: Record<string, string> = { "-": "⁻", "+": "⁺", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const SUB_MAP: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const toSup = (s: string) => s.split("").map((c) => SUP_MAP[c] ?? c).join("");
const toSub = (s: string) => s.split("").map((c) => SUB_MAP[c] ?? c).join("");

export function beautifyMath(input: string): string {
  if (!input) return input;
  let s = String(input);
  // 10^-19, 10^19, 10 ^ 19
  s = s.replace(/\b(10)\s*\^\s*(-?\d{1,3})\b/g, (_m, a, b) => a + toSup(b));
  // "× 10 -19" or "x 10 19" (PDF broke the exponent onto its own token)
  s = s.replace(/(×|x|\*)\s*10\s+(-?\d{1,3})\b/g, (_m, x, b) => `${x} 10${toSup(b)}`);
  // "10-19" / "10-31" style (negative exponent glued on)
  s = s.replace(/\b(10)(-\d{1,3})(?!\d)/g, (_m, a, b) => a + toSup(b));
  // "10 to the power N"
  s = s.replace(/\b10\s+to\s+the\s+power\s+(-?\d{1,3})\b/gi, (_m, b) => "10" + toSup(b));
  // Variable powers: x^2, y^-3, a^n stays if n is number
  s = s.replace(/\b([a-zA-Z])\^(-?\d{1,3})\b/g, (_m, v, n) => v + toSup(n));
  // Common physics: mc2, v2, r2, t2 → mc², v², r², t² (single lowercase var + 2/3 word-boundary)
  s = s.replace(/\b(mc|[vrtcefdpn])([23])\b/g, (_m, v, n) => v + toSup(n));
  // Units squared / cubed: m2, cm3, km2, s2, kg2 etc.
  s = s.replace(/\b(m|cm|mm|km|nm|μm|s|ms|kg|mg|N|J|W|Hz|A|V|C|K|mol|Pa|rad)([23])\b/g, (_m, u, n) => u + toSup(n));
  // Chemistry subscripts: H2O, CO2, O2, N2, H2SO4, Fe2O3, CH4, NH3, Ca(OH)2
  s = s.replace(/([A-Z][a-z]?)(\d)(?=[A-Z(]|\b)/g, (_m, el, n) => el + toSub(n));
  s = s.replace(/(\))(\d)(?=[A-Z(]|\b|\s)/g, (_m, p, n) => p + toSub(n));
  // Arrows / degrees
  s = s.replace(/(^|[^-])-->(?!\w)/g, "$1→").replace(/(^|[^-])->(?!\w)/g, "$1→");
  s = s.replace(/(\d)\s*deg(?:ree|rees)?\s*C\b/gi, "$1°C");
  s = s.replace(/\balpha\b/gi, "α").replace(/\bbeta\b/gi, "β").replace(/\bgamma\b/gi, "γ").replace(/\btheta\b/gi, "θ").replace(/\blambda\b/gi, "λ").replace(/\bomega\b/gi, "ω").replace(/\bmu\b/gi, "μ");
  // Collapse whitespace
  return s.replace(/[ \t]+/g, " ").trim();
}

function mermaidLabel(text: string, max = 60) {
  const clean = beautifyMath(String(text || ""))
    // Strip Private-Use-Area glyphs left over from NCERT symbol-font extraction
    // (e.g. \uF041\uF063\uF074 encodes bullets/decorators) so labels render text.
    .replace(/[\uE000-\uF8FF]/g, " ")
    .replace(/["`]/g, "'")
    .replace(/[\[\]{}()<>|;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean.length > max ? `${clean.slice(0, max - 1)}…` : clean) || "NCERT idea";
}

// ---------- Napkin-AI-style Mermaid infographics ----------
// Six distinct visual layouts with coloured classDefs so every slide feels
// like a hand-crafted infographic instead of a plain flowchart.
// Mermaid v11 requires each classDef on its own line (or terminated with a
// semicolon followed by a newline). Joining with a bare space produced
// "Syntax error in text" for every slide, so every diagram fell back to the
// error message. Keep one statement per line.
const MERMAID_STYLES = [
  "classDef hub fill:#4f46e5,stroke:#312e81,stroke-width:2px,color:#ffffff;",
  "classDef primary fill:#eef2ff,stroke:#4f46e5,stroke-width:1.5px,color:#1e1b4b;",
  "classDef accent fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#78350f;",
  "classDef ok fill:#dcfce7,stroke:#15803d,stroke-width:1.5px,color:#14532d;",
  "classDef info fill:#e0f2fe,stroke:#0369a1,stroke-width:1.5px,color:#0c4a6e;",
  "classDef warn fill:#ffe4e6,stroke:#be123c,stroke-width:1.5px,color:#881337;",
].join("\n  ");

export function buildMermaidFlow(title: string, bullets: string[], slideIndex: number): string {
  const clean = (bullets || []).map((b) => mermaidLabel(b, 52)).filter(Boolean).slice(0, 6);
  const T = mermaidLabel(title, 44);
  if (clean.length === 0) {
    return `flowchart TD\n  H(("${T}")):::hub\n  H --> A["Refer the NCERT passage"]:::primary\n  ${MERMAID_STYLES}`;
  }
  const palette = ["primary", "accent", "ok", "info", "warn", "primary"];
  const layout = slideIndex % 6;

  if (layout === 0) {
    // Mind-map: central hub, radial branches with alternating colours
    const branches = clean.map((c, i) => `  H --> N${i}["${c}"]:::${palette[i % palette.length]}`).join("\n");
    return `flowchart TD\n  H(("${T}")):::hub\n${branches}\n  ${MERMAID_STYLES}`;
  }

  if (layout === 1) {
    // Numbered pipeline with a starter chip
    const nodes = clean.map((c, i) => `  S${i}["${i + 1}. ${c}"]:::${i === 0 ? "primary" : i === clean.length - 1 ? "ok" : "info"}`).join("\n");
    const edges = clean.slice(0, -1).map((_, i) => `  S${i} --> S${i + 1}`).join("\n");
    return `flowchart LR\n  T[["${T}"]]:::hub\n  T --> S0\n${nodes}\n${edges}\n  ${MERMAID_STYLES}`;
  }

  if (layout === 2) {
    // Two-column compare / grouped ideas
    const half = Math.ceil(clean.length / 2);
    const L = clean.slice(0, half);
    const R = clean.slice(half);
    const lines: string[] = [`flowchart TB`, `  T[["${T}"]]:::hub`, `  subgraph LEFT["Key ideas"]`, `    direction TB`];
    L.forEach((c, i) => lines.push(`    L${i}["${c}"]:::primary`));
    lines.push(`  end`, `  subgraph RIGHT["Supporting points"]`, `    direction TB`);
    (R.length ? R : [clean[0]]).forEach((c, i) => lines.push(`    R${i}["${c}"]:::accent`));
    lines.push(`  end`, `  T --> LEFT`, `  T --> RIGHT`, `  ${MERMAID_STYLES}`);
    return lines.join("\n");
  }

  if (layout === 3) {
    // Cycle of circular nodes
    const nodes = clean.map((c, i) => `  C${i}(("${c}")):::${palette[i % palette.length]}`).join("\n");
    const edges = clean.map((_, i) => `  C${i} --> C${(i + 1) % clean.length}`).join("\n");
    return `flowchart LR\n  H[["${T}"]]:::hub\n  H --> C0\n${nodes}\n${edges}\n  ${MERMAID_STYLES}`;
  }

  if (layout === 4) {
    // Hierarchy: root → 2 branches → leaves
    const [a, b, ...rest] = clean;
    const mid = Math.ceil(rest.length / 2);
    const left = rest.slice(0, mid);
    const right = rest.slice(mid);
    const lines: string[] = [`flowchart TD`, `  H(("${T}")):::hub`, `  H --> A["${a}"]:::primary`];
    if (b) lines.push(`  H --> B["${b}"]:::accent`);
    left.forEach((c, i) => lines.push(`  A --> LA${i}["${c}"]:::info`));
    right.forEach((c, i) => lines.push(`  B --> RB${i}["${c}"]:::ok`));
    lines.push(`  ${MERMAID_STYLES}`);
    return lines.join("\n");
  }

  // layout 5 — Cause → Concept → Effect (three-column story)
  const third = Math.max(1, Math.floor(clean.length / 3));
  const causes = clean.slice(0, third);
  const core = clean.slice(third, third * 2);
  const effects = clean.slice(third * 2);
  const lines: string[] = [`flowchart LR`, `  subgraph CAUSE["Because"]`, `    direction TB`];
  (causes.length ? causes : [clean[0]]).forEach((c, i) => lines.push(`    CA${i}["${c}"]:::accent`));
  lines.push(`  end`, `  subgraph CORE["${T}"]`, `    direction TB`);
  (core.length ? core : [clean[Math.min(1, clean.length - 1)]]).forEach((c, i) => lines.push(`    CO${i}["${c}"]:::primary`));
  lines.push(`  end`, `  subgraph EFFECT["So that"]`, `    direction TB`);
  (effects.length ? effects : [clean[clean.length - 1]]).forEach((c, i) => lines.push(`    EF${i}["${c}"]:::ok`));
  lines.push(`  end`, `  CAUSE --> CORE --> EFFECT`, `  ${MERMAID_STYLES}`);
  return lines.join("\n");
}

// Keyword → 3D scene category. Each entry lists lower-case cues we look for in
// the slide's title, bullets and notes so the mapped 3D viewer always
// reinforces the content the student is reading, not a generic default.
const MODEL_CATEGORY_KEYWORDS: Array<{ key: ModelCategoryKey; cues: string[] }> = [
  { key: "physics_circuit", cues: ["circuit", "current", "voltage", "resistor", "resistance", "ohm", "ampere", "battery", "electric", "electricity", "conductor", "electromagnet", "magnet", "magnetic", "solenoid", "coil", "bulb", "switch"] },
  { key: "chemistry_atom", cues: ["atom", "atomic", "electron", "proton", "neutron", "nucleus", "isotope", "molecule", "bond", "ion", "acid", "base", "salt", "reaction", "equation", "oxide", "hydro", "compound", "element", "periodic"] },
  { key: "biology_cell", cues: ["cell", "organ", "tissue", "stomata", "photosynthesis", "chloroplast", "mitochond", "nucleus of the cell", "plant", "leaf", "root", "respiration", "digest", "heart", "blood", "neuron", "gene", "dna", "life", "reproduction"] },
  { key: "math_geometry", cues: ["triangle", "circle", "square", "rectangle", "polygon", "angle", "geometry", "theorem", "pythago", "coordinate", "graph", "axis", "vector", "area", "volume", "perimeter", "trigono", "sine", "cosine", "tangent"] },
];

const MODEL_PICK_THRESHOLD = 2;

/** Detailed scan: which cues hit in each source field, and which category wins. */
export function analyzeModelSelection(
  topic: string,
  title: string,
  bullets: string[] = [],
  notes: string[] = [],
): SlideDebug {
  const titleTxt = String(title || "").toLowerCase();
  const bulletsTxt = (bullets || []).join(" ").toLowerCase();
  const notesTxt = (notes || []).join(" ").toLowerCase();
  const hay = [topic, titleTxt, bulletsTxt, notesTxt].filter(Boolean).join(" ").toLowerCase();

  const category_hits = MODEL_CATEGORY_KEYWORDS.map(({ key, cues }) => {
    const found = cues.filter((c) => hay.includes(c));
    return { key, hits: found.length, cues: found };
  });

  const best = category_hits.reduce(
    (acc, c) => (c.hits > acc.hits ? c : acc),
    { key: "none" as ModelCategoryKey, hits: 0, cues: [] as string[] },
  );

  const passed = best.hits >= MODEL_PICK_THRESHOLD && best.key !== "none";
  const chosen_category: ModelCategoryKey = passed ? best.key : "none";
  const reason = passed
    ? `Picked "${best.key}" — ${best.hits} cue hit(s) ≥ threshold ${MODEL_PICK_THRESHOLD} (${best.cues.slice(0, 6).join(", ")}).`
    : best.hits > 0
      ? `Skipped 3D — top category "${best.key}" only had ${best.hits}/${MODEL_PICK_THRESHOLD} required cue hit(s) (${best.cues.join(", ") || "none"}).`
      : `Skipped 3D — no NCERT keyword cues matched any known 3D category.`;

  const collectField = (txt: string): string[] => {
    const found = new Set<string>();
    for (const { cues } of MODEL_CATEGORY_KEYWORDS) for (const c of cues) if (txt.includes(c)) found.add(c);
    return [...found];
  };

  return {
    chosen_category,
    reason,
    threshold: MODEL_PICK_THRESHOLD,
    total_hits: best.hits,
    category_hits,
    keyword_sources: {
      title: collectField(titleTxt),
      bullets: collectField(bulletsTxt),
      notes: collectField(notesTxt),
    },
  };
}

function pickModelCategory(_subject: string, ...textParts: Array<string | string[] | undefined>): ModelCategoryKey {
  const flat = textParts.flat().filter(Boolean).map((s) => String(s));
  // Rough split: first item = topic, second = title, rest bullets+notes.
  const [topic = "", title = "", ...rest] = flat;
  const bullets = rest.slice(0, Math.max(1, Math.ceil(rest.length / 2)));
  const notes = rest.slice(bullets.length);
  return analyzeModelSelection(topic, title, bullets, notes).chosen_category;
}

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
  source_basis?: "uploaded-teacher-pdfs"|"official-online-supplement";
  source_books: Array<{ id: string; chapter: string; class: string; subject: string }>;
  context_chars: number;
  slides: Slide[];
  activities: Activity[];
  activity_matches: ActivityMatch[];
  video: { title: string; scenes: VideoScene[] };
  figures_report?: FiguresReport;
  /** Slides whose PW/NCERT notes failed LaTeX validity or grounding checks. */
  notes_report?: { flagged_slide_indices: number[]; pass: boolean };

};

async function supa() {
 const {supabaseAdmin}=await import("@/integrations/supabase/client.server");return supabaseAdmin;
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
    .replace(/[^\p{L}\p{M}0-9]+/gu, " ")
    .replace(/\b(ch|chapter|class|ncert|part|book|vol|volume)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classNumber(value: string) {
  return value.match(/(?:^|\D)(9|10|11|12)(?=\D|$)/)?.[1] ?? normalizeText(value);
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
    history: isJunior ? ["history", "itihas", "social science"] : ["history", "itihas"],
    geography: isJunior ? ["geography", "bhugol", "social science"] : ["geography", "bhugol"],
    "political science": isJunior ? ["political science", "civics", "social science", "democratic politics"] : ["political science", "political", "politics"],
    "social science": ["social science", "history", "geography", "civics", "political science", "economics"],
    english: ["english"],
    hindi: ["hindi"],
    sanskrit: ["sanskrit"],
    "computer science": ["computer", "computer science", "informatics", "information technology", "python", "it"],
    "information technology": ["computer", "computer science", "informatics", "information technology", "it"],
  };

  return map[normalized] ?? [normalized];
}

export function subjectMatches(actual: string, requested: string, klass?: string) {
  const a = normalizeText(actual);
  if (!a || !requested.trim()) return false;
  // The shared word “science” must not make a Science textbook a source
  // for Computer Science or Social Science when those books are absent.
  if(a==='science'&&!['science','physics','chemistry','biology','vigyan','bhautiki','rasayan','jeev'].includes(normalizeText(requested)))return false;
  return subjectAliases(requested, klass).some((alias) => {
    if (alias === "science" && /computer|political|social/.test(a)) return false;
    return a === alias || (alias.length >= 4 && a.includes(alias)) || (a.length >= 4 && alias.includes(a));
  });
}

export function bookMatchesLesson(book: { class: string; subject: string; file_name?: string | null; chapter?: string | null }, klass: string, subject: string) {
  return combinedReferenceMatches(book, klass, subject) || (classNumber(book.class) === classNumber(klass) && subjectMatches(book.subject, subject, klass));
}

/**
 * Syllabus dropdown labels look like "Chapter 7: Motion (Physics)".
 * Strip the numbering prefix and the trailing subject tag so the RAG search
 * ranks on the real chapter name ("motion") instead of "physics"/"chapter".
 */
export function cleanSyllabusLabel(label: string) {
  return (label || "")
    .replace(/^\s*(chapter|ch\.?|unit|lesson|paath|path)\s*\d+\s*[:.\-–]?\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, " ")
    .trim();
}

// Subject words are useless as ranking terms — every chunk in the book has them.
const NOISE_TERMS = new Set([
  "physics", "chemistry", "biology", "science", "mathematics", "math",
  "chapter", "ncert", "class", "computer", "english", "hindi", "sanskrit",
]);

function buildTerms(data: z.infer<typeof Input>) {
  const raw = [
    cleanSyllabusLabel(data.topic),
    cleanSyllabusLabel(data.chapter),
    ...(data.subtopics || "").split(/[,;\n]/),
  ];
  const terms = new Set<string>();
  for (const item of raw) {
    const n = normalizeText(item || "");
    if (!n) continue;
    terms.add(n);
    for (const word of n.split(" ")) {
      if (word.length > 3 && !/^\d+$/.test(word) && !NOISE_TERMS.has(word)) terms.add(word);
    }
  }
  terms.add("activity");
  terms.add("experiment");
  return [...terms];

}

function splitSentences(context: string) {
  return context
    .replace(/\s+/g, " ")
    .replace(/([.!?।])\s+(?=[\p{L}0-9])/gu, "$1|SPLIT|")
    .split("|SPLIT|")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 28)
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
  return sentences.filter(s=>!isSourceTask(s)&&readableSourceRelation(s));
}

function extractDefinitionSentences(sentences: string[]) {
  return sentences.filter(s=>isDefinitionStatement(s)&&!isSourceTask(s));
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
  const seen = new Set<string>();
  return candidates.filter((item) => {
    if(!validStudyTerm(item.term,item.meaning))return false;
    const key = normalizeText(item.term);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function makeSlide(title: string, source: string[], topic: string, visual: string, index: number, subject = ""): Slide {
  const cleaned = uniqueByNormalized(filterJunkSentences(source)).filter(Boolean);
  // Keep complete statements; clipping mid-equation produces broken notes.
  // Sparse excerpts should not be padded with repeated placeholder bullets.
  const bullets = cleaned.slice(0, 6).map((s) => beautifyMath(s));
  const notesSource = cleaned.slice(6, 12).length ? cleaned.slice(6, 12) : cleaned.slice(0, 4);
  const bulletsOut = bullets.slice(0, 6);
  const prettyTitle = beautifyMath(title);
  const figures = extractFigureRefs(cleaned.join(" "));
  const isLang = isLanguageSubject(subject);
  return {
    title: prettyTitle,
    bullets: bulletsOut,
    notes: notesSource.slice(0, 4).map((s) => beautifyMath(s)),
    key_terms: extractKeyTerms(cleaned, topic).map((k) => ({ term: beautifyMath(k.term), meaning: beautifyMath(k.meaning) })),
    ncert_quote: cleaned[0] ? beautifyMath(trimToWords(cleaned[0], 180)) : undefined,
    visual,
    visual_prompt: `Draw a clean labelled 2D NCERT diagram for ${prettyTitle}. Include arrows, labels, symbols/formulas, and only details supported by the grounding excerpt.`,
    grounding: cleaned.join(" "),
    caption: figures.length ? `Refer NCERT ${figures.join(", ")}` : `NCERT-grounded summary for ${prettyTitle}.`,
    kind: "content",
    figures,
    mermaid_flow: buildMermaidFlow(prettyTitle, bulletsOut, index),
    flow_graph: buildFlowGraph(prettyTitle, bulletsOut, index),
    model_category: isLang ? "none" : pickModelCategory("", topic, prettyTitle, bulletsOut, notesSource),
    debug: analyzeModelSelection(topic, prettyTitle, bulletsOut, notesSource),
  };
}

function makeBreakSlide(afterIndex: number): Slide {
  const title = `Break time — recap slides ${afterIndex - 9}–${afterIndex}`;
  return {
    title,
    bullets: [
      "Stretch, breathe and revise the last 10 slides.",
      "Ask one doubt aloud before we continue.",
      "Recall two key ideas without looking at the notes.",
    ],
    notes: [],
    key_terms: [],
    visual: "sparkles",
    kind: "break",
    caption: "Short 2-minute break before the next 10 slides.",
    flow_graph: buildFlowGraph(title, ["Stretch", "Recall", "Doubt", "Resume"], afterIndex),
    model_category: "none",
  };
}

// ---------- MCQ builder ----------
function pickAnswerKey(seed: number): "A" | "B" | "C" | "D" {
  return (["A", "B", "C", "D"] as const)[seed % 4];
}

function buildMcqsFromContext(topic: string, sentences: string[], subject: string, count = 10): Mcq[] {
  return sourceQuizItems(sentences, subject, count);
}

function makeMcqSlide(mcq: Mcq, index: number, total: number, topic: string): Slide {
  return {
    title: `MCQ ${index + 1} / ${total} — ${topic}`,
    bullets: [mcq.question],
    notes: [],
    key_terms: [],
    visual: "brain",
    kind: "mcq",
    mcq,
    caption: "Tap Show Answer to reveal the correct option.",
    model_category: "none",
  };
}

export function fallbackSlides(topic: string, context: string): Slide[] {
  const sentences = uniqueByNormalized(filterJunkSentences(splitSentences(context))).slice(0, 160);
  const visuals = ["lightbulb", "prism", "atom", "ruler", "beaker", "microscope", "bolt", "function", "brain", "sparkles", "magnet", "leaf", "dna", "planet", "heart"];
  return Array.from({ length: 10 }, (_, i) => {
    const bs = sentences.slice(i * 7, i * 7 + 12);
    return makeSlide(i === 0 ? topic : `${topic} — Key idea ${i}`, bs, topic, visuals[i] ?? "lightbulb", i);
  });
}

function validateSlideAgainstContext(slide: Slide, contextNorm: string, slideIndex = 0): SlideVerification {
  const parts = [
    ...(slide.bullets || []),
    ...(slide.notes || []),
    ...(slide.key_terms || []).map((t) => `${t.term} ${t.meaning}`),
    slide.ncert_quote || "",
  ].map((s) => String(s || "").trim()).filter(Boolean);

  const matchRatio = (text: string) => {
    const tokens = normalizeText(text).split(" ").filter((w) => w.length > 4);
    if (tokens.length === 0) return 1;
    const hits = tokens.filter((t) => contextNorm.includes(t)).length;
    return hits / tokens.length;
  };

  let matched = 0;
  const missing: string[] = [];
  for (const p of parts) {
    if (matchRatio(p) >= 0.5) matched++;
    else missing.push(trimToWords(p, 110));
  }
  const coverage = parts.length === 0 ? 0 : Math.round((matched / parts.length) * 100);

  // Diagram validation: verify the requested visual content is grounded in the
  // same NCERT context. The actual image is generated locally; we do not
  // use local SVG fallback generation for validation or display.
  const diagramText = [slide.title, slide.visual_prompt || "", slide.caption || ""].join(" ").trim();
  const diagram_match = diagramText ? Math.round(matchRatio(diagramText) * 100) : 0;

  let diagram_label_fit: "pass" | "adjusted" = "pass";
  const diagram_issues: string[] = [];
  void slideIndex;

  const overall_pass = coverage >= 60 && diagram_match >= 40 && diagram_label_fit === "pass";
  return {
    coverage,
    matched,
    total: parts.length,
    missing: missing.slice(0, 3),
    diagram_match,
    diagram_label_fit,
    diagram_issues,
    overall_pass,
  };
}

/** Normalize a figure ref like "Fig. 12.3", "figure 12.3", "Fig 12.3a" → "fig 12.3a". */
function normalizeFigureRef(ref: string): string {
  return String(ref || "")
    .toLowerCase()
    .replace(/figure/g, "fig")
    .replace(/[.\s]+/g, " ")
    .replace(/^fig\s+/, "fig ")
    .trim();
}

/**
 * Cross-check every NCERT figure reference against the slide it was placed on.
 * A slide "correctly places" a figure iff that figure ref appears in the
 * slide's own source text (grounding + bullets + notes + chapter_text +
 * ncert_quote + caption). Figures found in the full context but placed on no
 * slide are flagged as `unplaced`.
 */
export function validateFigurePlacement(slides: Slide[], context: string): { report: FiguresReport; perSlide: FigurePlacementCheck[] } {
  const allInContext = extractFigureRefs(context);
  const contextSet = new Set(allInContext.map(normalizeFigureRef));

  const perSlide: FigurePlacementCheck[] = slides.map((s) => {
    const ownText = [
      s.title,
      s.caption || "",
      s.ncert_quote || "",
      s.grounding || "",
      s.chapter_text || "",
      ...(s.bullets || []),
      ...(s.notes || []),
    ].join(" ");
    const expected = extractFigureRefs(ownText);
    const expectedNorm = new Set(expected.map(normalizeFigureRef));
    const placed = (s.figures || []).slice();
    const placedNorm = placed.map(normalizeFigureRef);

    const correct = placed.filter((_, i) => expectedNorm.has(placedNorm[i]));
    const swapped = placed.filter((_, i) => !expectedNorm.has(placedNorm[i]));
    const missing = expected.filter((e) => !placedNorm.includes(normalizeFigureRef(e)));

    return {
      expected,
      placed,
      correct,
      swapped,
      missing,
      pass: swapped.length === 0 && missing.length === 0,
    };
  });

  const placedAcross = new Set<string>();
  slides.forEach((s) => (s.figures || []).forEach((f) => placedAcross.add(normalizeFigureRef(f))));
  const unplaced = allInContext.filter((f) => !placedAcross.has(normalizeFigureRef(f)));

  const failing_slide_indices = perSlide.reduce<number[]>((acc, c, i) => {
    if (!c.pass) acc.push(i);
    return acc;
  }, []);

  return {
    perSlide,
    report: {
      context_figures: allInContext,
      unplaced,
      failing_slide_indices,
      pass: unplaced.length === 0 && failing_slide_indices.length === 0,
    },
  };
}



export function buildLocalSlides(topic: string, subtopics: string, context: string, subject = "", mode: "topic" | "chapter" = "topic", klass = "", exactConcepts?:string[]): Slide[] {
  const rawSentences = uniqueByNormalized(splitSentences(context));
  const lang = isLanguageSubject(subject);
  const sentences = filterJunkSentences(rawSentences,lang);
  if (sentences.length === 0) return fallbackSlides(topic, context);

  // ---------- LANGUAGE / CHAPTER MODE ----------
  // English / Hindi / Sanskrit (or any explicit chapter mode): paginate the
  // FULL chapter text verbatim, ~180 words per slide, with a break slide
  // after every 10 content slides.
  if (lang || mode === "chapter") {
    const paragraphs = sentences.join(" ").split(/(?<=[.!?])\s+/).filter((p) => p.trim().length > 0);
    const wordsPerSlide = 160;
    const pages: string[] = [];
    let buf: string[] = [];
    let count = 0;
    for (const p of paragraphs) {
      const w = p.split(/\s+/).length;
      if (count + w > wordsPerSlide && buf.length) {
        pages.push(buf.join(" "));
        buf = [p];
        count = w;
      } else {
        buf.push(p);
        count += w;
      }
    }
    if (buf.length) pages.push(buf.join(" "));

    const contentSlides: Slide[] = pages.map((text, i) => {
      const figures = extractFigureRefs(text);
      const s: Slide = {
        title: `${topic} — Page ${i + 1}`,
        bullets: [],
        notes: [],
        key_terms: [],
        visual: "lightbulb",
        kind: "chapter",
        chapter_text: beautifyMath(text),
        figures,
        caption: figures.length ? `Refer NCERT ${figures.join(", ")}` : `Chapter page ${i + 1}`,
        flow_graph: buildFlowGraph(topic, text.split(/(?<=[.!?])\s+/).slice(0, 6), i),
        model_category: "none",
      };
      return s;
    });

    // Interleave a break every 10 content slides.
    const withBreaks: Slide[] = [];
    contentSlides.forEach((s, idx) => {
      withBreaks.push(s);
      if ((idx + 1) % 10 === 0 && idx !== contentSlides.length - 1) {
        withBreaks.push(makeBreakSlide(idx + 1));
      }
    });
    return withBreaks;
  }

  // ---------- TOPIC MODE (science / math / social) ----------
  // Each selected concept gets its own evidence, with no unrelated filler to
  // reach a fixed slide count. The presentation layer handles continuation pages.
  const selectedConcepts: string[] = [];
  let depth = 0, start = 0;
  const selection = subtopics || "";
  for (let i=0;i<=selection.length;i++) {
    const char = selection[i];
    if (char === "(" || char === "[") depth++;
    if (char === ")" || char === "]") depth=Math.max(0,depth-1);
    if (i===selection.length || (depth===0 && /[,;\n]/.test(char))) {
      const name=selection.slice(start,i).trim();
      if(name&&!selectedConcepts.includes(name))selectedConcepts.push(name);
      start=i+1;
    }
  }
  const secondaryScience=/^(?:9|10)$/.test(classNumber(klass))&&subject==="Science";
  const seniorScience=isSeniorScienceStudy(klass,subject);
  const chapterTopics=secondaryScience||seniorScience?chaptersFor(classNumber(klass),subject).find(chapter=>normalizeText(cleanSyllabusLabel(chapter.chapter))===normalizeText(cleanSyllabusLabel(topic)))?.subtopics:undefined;
  const seniorChapter=seniorScience?chaptersFor(classNumber(klass),subject).find(chapter=>normalizeText(cleanSyllabusLabel(chapter.chapter))===normalizeText(cleanSyllabusLabel(topic))):undefined;
  const defaults=seniorChapter?subtopicsFor(classNumber(klass),subject,seniorChapter.chapter):chapterTopics;
  const concepts = exactConcepts?.length?exactConcepts:selectedConcepts.length ? selectedConcepts : defaults?.length ? defaults : [cleanSyllabusLabel(topic)];
  const conceptSlides: Slide[] = [];
  for (const name of concepts) {
    const sectionEvidence=seniorScience?seniorScienceEvidence(name,context):secondaryScience?secondaryScienceSectionEvidence(name,context):[];
    const source = sectionEvidence.length?sectionEvidence:topicEvidence(name, sentences);
    if (!source.length) {
      // A missing topic is explicit; do not relabel an unrelated paragraph.
      conceptSlides.push({ title: name, kind: "content", bullets: [`Readable source text for ${name} is missing from the selected textbook. Re-ingest the matching chapter PDF from Upload, then regenerate this lesson.`], notes: [], key_terms: [], visual: "book", grounding: "", caption: "Source text needs attention for this topic." });
      continue;
    }
    conceptSlides.push(makeSlide(titleCase(name), source, topic, "book", conceptSlides.length, subject));
  }
  return conceptSlides;

}


function normalizeSlides(slides: unknown, topic: string, context: string): Slide[] {
  const fallback = fallbackSlides(topic, context);
  const parsed: Slide[] = Array.isArray(slides)
    ? slides.map((slide, index) => {
        const v = slide as Partial<Slide> & { key_terms?: unknown; notes?: unknown };
        const bullets =
          Array.isArray(v.bullets) && v.bullets.length > 0
            ? v.bullets.slice(0, 7).map((b) => beautifyMath(String(b)))
            : fallback[index]?.bullets ?? [];
        const notes = Array.isArray(v.notes)
          ? (v.notes as unknown[]).slice(0, 4).map((n) => beautifyMath(String(n)))
          : fallback[index]?.notes ?? [];
        const key_terms = Array.isArray(v.key_terms)
          ? (v.key_terms as Array<{ term?: unknown; meaning?: unknown }>)
              .slice(0, 4)
              .map((t) => ({ term: beautifyMath(String(t?.term ?? "")), meaning: beautifyMath(String(t?.meaning ?? "")) }))
              .filter((t) => t.term)
          : [];
        const title = beautifyMath(String(v.title || fallback[index]?.title || topic));
        // Always regenerate the mermaid flow from the (beautified) bullets so
        // every slide gets one of the six styled layouts and never a raw AI
        // graph that could break the renderer.
        const mermaid_flow = buildMermaidFlow(title, bullets, index);
        const flow_graph = buildFlowGraph(title, bullets, index);
        return {
          title,
          bullets,
          notes,
          key_terms,
          ncert_quote: v.ncert_quote ? beautifyMath(String(v.ncert_quote)) : undefined,
          visual: String(v.visual || fallback[index]?.visual || "lightbulb"),
          visual_prompt: v.visual_prompt ? String(v.visual_prompt) : fallback[index]?.visual_prompt,
          grounding: v.grounding ? String(v.grounding) : fallback[index]?.grounding,
          caption: v.caption ? beautifyMath(String(v.caption)) : fallback[index]?.caption,
          mermaid_flow,
          flow_graph,
          model_category: pickModelCategory("", topic, title, bullets, notes),
          debug: analyzeModelSelection(topic, title, bullets, notes),
        };
      })
    : [];
  return [...parsed, ...fallback].slice(0, 10);
}

function fallbackVideo(topic: string, activities: Activity[]): { title: string; scenes: VideoScene[] } {
  const source = activities.flatMap(activity => [...activity.steps,
    { step: activity.steps.length + 1, title: 'Observe & explain', description: `${activity.observation} ${activity.conclusion}` }]);
  return {
    title: `${topic} activity animation`,
    scenes: source.map((step, index) => ({
      scene: index + 1,
      title: step.title,
      duration_s: 8,
      visual_prompt: `Labelled apparatus schematic: ${step.description}`,
      narration: step.description,
    })),
  };
}

/** Main lesson generation function — local NCERT-excerpt builder, no paid AI calls. */
async function completeAttentionFallback(data:z.infer<typeof Input>,lessonKey:string):Promise<GenerationResult|null>{
  const {attentionLessonSelection}=await import('./attention-selection');
  const requested=attentionLessonSelection(data,true);if(!requested)return null;
  const {recoverAttentionTopic}=await import('./attention-topic-notes.server');
  const slides:Slide[]=[],evidence:string[]=[];
  const recovered:Array<Awaited<ReturnType<typeof recoverAttentionTopic>>>=[];
  for(let start=0;start<requested.length;start+=3)recovered.push(...await Promise.all(requested.slice(start,start+3).map(recoverAttentionTopic)));
  for(let index=0;index<requested.length;index++){
    const scope=requested[index],notes=recovered[index];if(!notes){const {loadTopicNotes}=await import('./topic-notes-store.server');const saved=await loadTopicNotes(scope);slides.push({title:scope.topic,kind:'content',visual:'book',bullets:[],notes:[],key_terms:[],sections:saved?.sections||[],topic_recovery:{status:saved?.mode||'missing',sourceUrl:saved?.sourceUrl},caption:'Teacher notes for this topic'});continue;}
    evidence.push(notes.grounding);
    const sections=sequenceChemistryNotes(withPhysicsDimensions(learningScaffold(scope.topic,notes.sections,isSeniorScienceStudy(scope.klass,scope.subject)||/^(9|10)$/.test(scope.klass)&&scope.subject==='Science'),scope.subject,scope.topic),scope.subject,scope.chapter);
    slides.push({title:scope.topic,kind:'content',visual:'book',bullets:[],notes:[],key_terms:[],sections,grounding:notes.grounding,caption:'Class-aligned supplementary notes',source_recovery:{attempts:3,kind:'official-online-supplement',url:notes.sources[0]?.url,sources:notes.sources},notes_quality:reviewNotes(sections,false)});
  }
  const {topicSourceComplete}=await import('./sparse-topic-recovery.server');
  if(slides.some(slide=>!slide.topic_recovery&&!topicSourceComplete(slide)))return null;
  const context=evidence.join('\n\n'),mcqs=buildMcqsFromContext(data.topic,splitSentences(context),data.subject,10);
  const base:GenerationResult={source_basis:'official-online-supplement',source_books:[],context_chars:context.length,slides:[...slides,...mcqs.map((mcq,index)=>makeMcqSlide(mcq,index,mcqs.length,data.topic))],activities:[],activity_matches:[],video:fallbackVideo(data.topic,[])};
  const db=await supa();
  const out=await appendSocialRevisionNotes(await appendUploadedReferenceNotes(base,db,data.klass,data.subject,data.chapter||data.topic),db,data.klass,data.subject,data.chapter||data.topic);
  try{const cache=await cacheSupa();await(cache as any).from('lesson_cache').upsert({cache_key:lessonKey,klass:data.klass,subject:data.subject,chapter:data.chapter,topic:data.topic,subtopics:data.subtopics,result:out});}catch{/* The verified notes remain usable if cache storage is unavailable. */}
  return out;
}

export const generateLesson = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<GenerationResult> => {
    // Lesson cache — same (class, subject, chapter, topic, subtopics, mode) returns instantly.
    // Quiz items are rebuilt from source statements after cache lookup.
    const lessonKey = hashKey([
      "lesson-v67-all-subject-source-recovery",
      data.klass,
      data.subject,
      data.chapter,
      data.topic,
      data.subtopics,
      data.mode,
    ]);
    // Every successful return (including cache hits and official recovery) passes
    // through the additive support layer below. Core generation stays unchanged.
    const run = async (): Promise<GenerationResult> => {
    let attentionTried=false;
    const attentionFallback=async()=>{if(attentionTried)return null;attentionTried=true;return completeAttentionFallback(data,lessonKey);};
    try{
    const cdb = await cacheSupa();
    if (!data.nocache) {
      try {
        const { data: hit } = await (cdb as any)
          .from("lesson_cache")
          .select("result")
          .eq("cache_key", lessonKey)
          .maybeSingle();
        if (hit?.result) {
          // Rebuild cached quizzes with the current source-quality rules.
          const cached = hit.result as GenerationResult;
          let contentOnly = (cached.slides || []).filter((sl) => sl.kind !== "mcq" && !sl.teacher_revision);
          const {canonicalOfficialRecoveryTopic}=await import('./official-recovery-scope');
          const {topicSourceComplete,recoverSparseTopicNotes}=await import('./sparse-topic-recovery.server');
          const damagedIndices=new Set(contentOnly.flatMap((slide,index)=>!isLanguageSubject(data.subject)&&!slide.teacher_pdf&&slide.sections?.some(section=>section.kind!=='diagram'&&section.lines.some(line=>sourceExtractionIssue(line)))?[index]:[]));
          contentOnly=contentOnly.map((slide,index)=>damagedIndices.has(index)?{...slide,sections:quarantineExtractionSections(slide.sections)}:slide);
          const repairIndices=contentOnly.flatMap((slide,index)=>(!!slide.topic_recovery||damagedIndices.has(index)||canonicalOfficialRecoveryTopic({klass:data.klass,subject:data.subject,chapter:data.chapter||data.topic,topic:slide.title}))&&(!!slide.topic_recovery||!topicSourceComplete(slide))?[index]:[]);
          if(repairIndices.length){
            const repaired=await recoverSparseTopicNotes(repairIndices.map(index=>contentOnly[index]),{klass:data.klass,subject:data.subject,chapter:data.chapter||data.topic,sources:contentOnly.map(slide=>slide.grounding||slide.chapter_text||'')});
            contentOnly=contentOnly.map((slide,index)=>{const at=repairIndices.indexOf(index);return at<0?slide:repaired.slides[at];});
            await(cdb as any).from('lesson_cache').update({result:{...cached,slides:[...contentOnly,...cached.slides.filter(slide=>slide.kind==='mcq')]}}).eq('cache_key',lessonKey);
          }
          const seedSentences: string[] = [];
          for (const sl of contentOnly) {
            if(sl.topic_recovery)continue;
            if (sl.chapter_text) seedSentences.push(...splitSentences(sl.chapter_text));
            if (sl.grounding) seedSentences.push(...splitSentences(sl.grounding));
            if (sl.bullets) seedSentences.push(...sl.bullets);
            if (sl.notes) seedSentences.push(...sl.notes);
          }
          const freshMcqs = buildMcqsFromContext(data.topic, seedSentences, data.subject, 10);
          const mcqSlides: Slide[] = freshMcqs.map((m, i) => makeMcqSlide(m, i, freshMcqs.length, data.topic));
          const db=await supa();
          return appendSocialRevisionNotes(await appendUploadedReferenceNotes({ ...cached, slides: [...contentOnly, ...mcqSlides] }, db, data.klass, data.subject, data.chapter || data.topic),db,data.klass,data.subject,data.chapter||data.topic);
        }
      } catch {
        /* miss */
      }
    }

    const s = await supa();
    const uploadedSocialFallback=async()=>{
      if(data.subject!=="Social Science")return null;
      const attention=await attentionFallback();if(attention)return attention;
      const supplied=await appendSocialRevisionNotes({source_basis:"uploaded-teacher-pdfs",source_books:[],context_chars:0,slides:[],activities:[],activity_matches:[],video:{title:data.chapter||data.topic,scenes:[]}},s,data.klass,data.subject,data.chapter||data.topic);
      return supplied.slides.some(slide=>slide.teacher_pdf)?supplied:null;
    };
    const terms = buildTerms(data);

    // Existing textbooks are public learning sources. Only uploads require sign-in.
    // Retain strict class/subject matching and exclude reference-only note sources.
    const inventory = await readLessonTextbooks(s);
    const lessonSubject = data.subject === "Social Science" ? socialChapterPart(data.chapter||"") || data.subject : data.subject;
    let candidates = inventory.filter(book => bookMatchesLesson(book, data.klass, lessonSubject) && (!/^(Hindi|Sanskrit)$/.test(data.subject) || languageVolumeMatches(book,data.chapter||data.topic)));
    if (candidates.length === 0) {
      const supplied=await uploadedSocialFallback();if(supplied)return supplied;
      throw new Error(`No matching Class ${data.klass} ${data.subject} NCERT textbook is available in the uploaded library. You can browse existing books without signing in. An administrator can add the missing textbook; material from another class or subject will not be substituted.`);
    }

    // 2. Pre-rank by metadata
    const chapterTermsPre = data.chapter ? [normalizeText(cleanSyllabusLabel(data.chapter)), ...normalizeText(cleanSyllabusLabel(data.chapter)).split(" ")] : [];
    const preRanked = candidates
      .map((b) => ({ b, m: score(`${b.chapter} ${b.file_name} ${b.subject} ${b.class}`, [...terms, ...chapterTermsPre]) }))
      .sort((a, z) => z.m - a.m);
    const cap = candidates.length <= 10 ? candidates.length : 10;
    const topCandidates = preRanked.slice(0, cap).map((x) => x.b);
    candidates = topCandidates;

    // 3. Fetch chunks PER BOOK in parallel: a baseline window plus a
    //    keyword-targeted fetch so chapters deep inside a large book are found.
    const keywordTerms = terms
      .filter((t) => t !== "activity" && t !== "experiment" && t.length > 3)
      .slice(0, 6);
    const keywordFilter = keywordTerms.map((t) => `content.ilike.%${t.replace(/[,%]/g, " ")}%`).join(",");
    const perBookChunks = await Promise.all(
      topCandidates.flatMap((b) => {
        const base = s
          .from("ncert_chunks")
          .select("book_id, chunk_index, content")
          .eq("book_id", b.id)
          .order("chunk_index", { ascending: true })
          .limit(300)
          .then((r) => r.data ?? []);
        if (!keywordFilter) return [base];
        const targeted = s
          .from("ncert_chunks")
          .select("book_id, chunk_index, content")
          .eq("book_id", b.id)
          .or(keywordFilter)
          .order("chunk_index", { ascending: true })
          .limit(400)
          .then((r) => r.data ?? []);
        return [base, targeted];
      }),
    );
    const chunkMap = new Map<string, { book_id: string; chunk_index: number; content: string }>();
    for (const row of perBookChunks.flat()) chunkMap.set(`${row.book_id}:${row.chunk_index}`, row as any);
    const chunks = [...chunkMap.values()];



    const chapterTerms = data.chapter ? [normalizeText(cleanSyllabusLabel(data.chapter)), ...normalizeText(cleanSyllabusLabel(data.chapter)).split(" ")] : [];
    // Reference books uploaded alongside NCERT (PW, Shobhit Nirwan, Med Easy,
    // mind maps, chapter notes) carry the best diagrams and formula sheets, so
    // they are boosted and always allowed to sit next to the NCERT text.
    const REF_BOOK = REF_BOOK_PATTERN;
    const isRef = (b: { file_name?: string | null; chapter?: string | null }) =>
      REF_BOOK.test(`${b.file_name ?? ""} ${b.chapter ?? ""}`);
    const bookScores = candidates
      .map((book) => {
        const englishBook = data.subject === "English" ? ENGLISH_CHAPTERS[classNumber(data.klass)]?.find(c => c.chapter === data.chapter)?.book.replace(/ \(.*$/, "") : undefined;
        const matchingReader = englishBook && normalizeText(`${book.chapter} ${book.file_name}`).includes(normalizeText(englishBook));
        const metadataScore = score(`${book.chapter} ${book.file_name}`, [...terms, ...chapterTerms]) + (matchingReader ? 1000 : 0);
        const chunkScore = (chunks ?? [])
          .filter((chunk) => chunk.book_id === book.id)
          .reduce((sum, chunk) => sum + score(chunk.content, terms), 0);
        const raw = metadataScore * 5 + chunkScore;
        return { ...book, _s: isRef(book) ? raw * 1.35 + 2 : raw };
      })
      .sort((a, b) => b._s - a._s);

    let bestScore = bookScores[0]?._s ?? 0;
    let selectedBooks = bestScore > 0
      ? bookScores.filter((book) => book._s >= Math.max(1, bestScore * 0.35)).slice(0, 4)
      : bookScores.slice(0, 4);
    // Guarantee at least one reference book in the mix when one scored at all.
    if (!selectedBooks.some(isRef)) {
      const ref = bookScores.find((b) => isRef(b) && b._s > 0);
      if (ref) selectedBooks = [...selectedBooks.slice(0, 3), ref];
    }
    if (!selectedBooks.some((b) => !isRef(b))) {
      const primary = bookScores.find((b) => !isRef(b));
      if (primary) selectedBooks = [primary, ...selectedBooks.slice(0, 3)];
    }
    let selectedIds = new Set(selectedBooks.map((book) => book.id));
    let selectedChunks = (chunks ?? []).filter((chunk) => selectedIds.has(chunk.book_id));

    // Broader inventory search, still restricted to the selected class/subject.
    const hasTopicalHit = (chunks ?? []).some((c) => score(c.content, terms) > 8);
    if (!hasTopicalHit) {
      const allBooks2 = inventory;
      const ranked2 = (allBooks2 ?? [])
        .filter((b) => bookMatchesLesson(b, data.klass, lessonSubject))
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
    // Reference supplements stay separate from the primary textbook evidence.
    const primaryIds = new Set((data.subject === "Social Science" ? topCandidates : selectedBooks).filter((b) => !isRef(b)).map((b) => b.id));
    if (!primaryIds.size) throw new Error(`Upload the Class ${data.klass} ${data.subject} NCERT textbook for this lesson. Reference notes alone cannot establish the chapter's prescribed content.`);
    selectedChunks = selectedChunks.filter((chunk) => primaryIds.has(chunk.book_id));
    const ranked = selectedChunks
      .map((c) => ({ ...c, _s: score(c.content, terms) }))
      .sort((a, b) => b._s - a._s)
      .filter((c) => c._s > 0);
    // Activity candidates must be topic-relevant first, then activity-flavoured.
    const topicTerms = terms.filter((t) => t !== "activity" && t !== "experiment");
    const activityChunks = selectedChunks
      .map((c) => {
        const topical = score(c.content, topicTerms);
        const activityish = score(c.content, ["activity", "experiment"]);
        return { ...c, _s: topical * 3 + (topical > 0 ? activityish : 0) };
      })
      .filter((c) => c._s > 0)
      .sort((a, b) => b._s - a._s)
      .filter((c) => normalizeText(c.content).includes("activity") || c._s > 12)
      .slice(0, 12);


    const pickedMap = new Map<string, string>();
    for (const chunk of [...ranked.slice(0, 28), ...activityChunks]) {
      pickedMap.set(`${chunk.book_id}:${chunk.chunk_index}`, splitReferenceContent(chunk.content).text);
    }
    const picked = [...pickedMap.values()].length > 0 ? [...pickedMap.values()] : selectedChunks.slice(0, 24).map((c) => splitReferenceContent(c.content).text);
    const recoverySources:string[]=[];
    let context = picked.join("\n---\n").slice(0, 30000);
    if (data.chapter) {
      const sourcePages = await Promise.all([...primaryIds].map(async bookId => {
        const { data: pages } = await s.from("ncert_pages").select("page_number,text").eq("book_id", bookId).order("page_number").limit(1000);
        const titles = chaptersFor(classNumber(data.klass), data.subject).map(chapter => chapter.chapter);
        if (/^(Hindi|Sanskrit)$/.test(data.subject)) {
          if(pages?.length)return pages.map(page=>splitReferenceContent(page.text).text);
          const {data:ordered,error}=await s.from("ncert_chunks").select("chunk_index,content").eq("book_id",bookId).order("chunk_index").limit(3000);
          if(error)throw new Error("The selected language volume could not be read. Please retry.");
          return (ordered||[]).map(row=>splitReferenceContent(row.content).text);
        }
        if (data.subject === "Social Science") {
          const target = socialTitle(data.chapter);
          const headings = titles.filter(title=>socialChapterPart(title)===lessonSubject).map(socialTitle);
          const scoped = scopeSocialChapterPages(pages || [], target, headings);
          if (scoped.length) return scoped;
          // Some historical chapter PDFs saved chunks but no page records.
          const { data: ordered, error: readError } = await s.from("ncert_chunks").select("chunk_index,content").eq("book_id",bookId).order("chunk_index").limit(3000);
          if(readError)throw new Error("The selected Social Science chapter text could not be read.");
          const recovered=scopeSocialChapterPages((ordered||[]).map(row=>({page_number:row.chunk_index,text:row.content})),target,headings);
          return recovered;
        }
        if (data.subject !== "English") {
          const scoped=scopeTextbookPages(pages||[],data.chapter,titles);
          if(scoped.length)return scoped;
          const {data:chunks,error}=await s.from("ncert_chunks").select("chunk_index,content").eq("book_id",bookId).order("chunk_index").limit(3000);
          if(error)throw new Error("The selected chapter source could not be read. Please retry.");
          return scopeTextbookPages((chunks||[]).map(row=>({page_number:row.chunk_index,text:row.content})),data.chapter,titles);
        }
        const scoped = scopeEnglishChapterPages(pages || [], data.chapter, titles);
        if (scoped.length) return scoped;
        // Older uploads may have chunks but no page records. Keep their source order.
        const { data: orderedChunks } = await s.from("ncert_chunks").select("chunk_index,content").eq("book_id", bookId).order("chunk_index").limit(3000);
        return scopeEnglishChapterPages([{page_number: 1, text: (orderedChunks || []).map(c => c.content).join("\n")}], data.chapter, titles);
      }));
      // Duplicate uploads can have different whitespace/OCR layers. Choose one complete
      // matching textbook instead of concatenating the same chapter from several copies.
      recoverySources.push(...sourcePages.map(pages=>pages.join("\n\n")).filter(Boolean));
      const chosen=sourcePages.map((pages,index)=>({pages,index,words:(pages.join(" ").match(/[A-Za-z]{3,}/g)||[]).length})).filter(row=>row.pages.length).sort((a,b)=>b.words-a.words)[0];
      const scoped = [...new Set(chosen?chosen.pages:sourcePages.flat())];
      if(chosen){const bookId=[...primaryIds][chosen.index];selectedBooks=bookScores.filter(book=>book.id===bookId);}
      if (scoped.length) context = scoped.join("\n\n");
      else if (data.subject === "Social Science") {const supplied=await uploadedSocialFallback();if(supplied)return supplied;throw new Error(`The uploaded sources for “${socialTitle(data.chapter)}” do not contain readable chapter text or matching teacher PDF pages. Add the correct chapter PDF in Upload books and notes.`);}
      else if (data.subject === "English") throw new Error(`Readable text for “${data.chapter}” was not located in the uploaded Class ${data.klass} English books. Upload or re-ingest the matching chapter PDF. Other chapters will not be used in its place.`);
      else throw new Error(`Readable text for “${data.chapter}” was not located in the matching Class ${data.klass} ${data.subject} source. Material from another chapter will not be used. An administrator can add or reprocess the matching chapter PDF.`);
    }
    if (!context.trim()) {
      throw new Error(`The matching Class ${data.klass} ${data.subject} PDF was found, but no readable text chunks were saved. Re-ingest that PDF from Upload.`);
    }

    // 4a. Dedicated reference-book channel (PW / Physics Wallah, Med Easy, mind
    //     maps, short notes). These books hold the formula sheets, derivations
    //     and labelled diagrams, so their chunks are retrieved and ranked on
    //     their own instead of competing with NCERT for the same slots.
    // Reference books may supply separately labelled figures, never the note text.
    const refContext = "";

    // 4. Build slides + activity + storyboard locally from saved NCERT text.
    // For English/Hindi/Sanskrit (or explicit chapter mode) we paginate the full
    // chapter text verbatim with break slides every 10 pages.
    const lessonMode = isLanguageSubject(data.subject) ? "chapter" : data.mode;
    const {attentionLessonSelection}=await import('./attention-selection');
    const exactAttentionSelection=attentionLessonSelection(data);
    const slidesRaw = buildLocalSlides(data.topic, data.subtopics, context, data.subject, lessonMode, data.klass,exactAttentionSelection?.map(scope=>scope.topic));
    const contextNorm = normalizeText(context);
    const preSlides = slidesRaw.map((sl, i) => ({ ...sl, verification: validateSlideAgainstContext(sl, contextNorm, i) }));

    // Figure-placement validation: verify every NCERT figure ref extracted
    // from the PDF is on the correct slide (no swaps, no missing).
    const figCheck = validateFigurePlacement(preSlides, context);
    const contentSlides = preSlides.map((sl, i) => ({
      ...sl,
      verification: { ...(sl.verification as SlideVerification), figures_check: figCheck.perSlide[i], overall_pass: (sl.verification?.overall_pass ?? false) && figCheck.perSlide[i].pass },
    }));

    // Add source-supported comprehension questions only when usable definitions
    // and distinct alternatives exist. Never pad to a fixed question count.
    const mcqSource = splitSentences(context);
    const mcqs = buildMcqsFromContext(data.topic, mcqSource, data.subject, 10);
    const mcqSlides: Slide[] = mcqs.map((m, i) => makeMcqSlide(m, i, mcqs.length, data.topic));

    // Structured teacher notes: Groq rewrites the retrieved NCERT excerpts into
    // Definition / Formula / SI unit / Properties / Example / Important points /
    // Memory trick sections. Any line not supported by the NCERT context is
    // dropped, and if the gateway is unavailable the deterministic local
    // sectioniser is used, so notes are always present and always NCERT-only.
    let notedSlides:Slide[] = await attachTeacherNotes(contentSlides, {
      apiKey: process.env.GROQ_API_KEY,
      klass: String(data.klass || ""),
      subject: String(data.subject || ""),
      chapter: String(data.chapter || data.topic || ""),
      context,
      refContext,
    });
    // Pre-save verification with auto-fix: invalid LaTeX is first rewritten
    // into a valid equivalent (deterministically, then by Groq) and only the
    // lines that still fail — or that the NCERT / PW context does not support —
    // are quarantined. Verification re-runs after every repair.
    let recoveryEvidence='';
    {
      const {recoverSparseTopicNotes}=await import('@/lib/sparse-topic-recovery.server');
      if(!isLanguageSubject(data.subject)&&lessonMode!=='chapter')notedSlides=notedSlides.map(slide=>({...slide,sections:quarantineExtractionSections(slide.sections)}));
      const recovered=await recoverSparseTopicNotes(notedSlides,{klass:String(data.klass),subject:data.subject,chapter:data.chapter||data.topic,sources:[context,...recoverySources],verbatim:isLanguageSubject(data.subject)||lessonMode==='chapter'});
      notedSlides=recovered.slides;
      recoveryEvidence=recovered.extraEvidence.join('\n\n');
    }
    const groundNorm = normalizeForGrounding(`${context}\n${refContext}\n${recoveryEvidence}`);
    const fixedChecks = await autoFixAndVerifyNotes(
      notedSlides.map((sl) => sl.topic_recovery?undefined:(sl as any).sections as NoteSection[] | undefined),
      groundNorm,
      {
        apiKey: process.env.GROQ_API_KEY,
        subject: String(data.subject || ""),
        chapter: String(data.chapter || data.topic || ""),
      },
    );
    let verifiedSlides:Slide[] = notedSlides.map((sl, i) => {
      if(sl.topic_recovery)return sl;
      const { sections:checkedSections, check } = fixedChecks[i];
      const seniorScience=isSeniorScienceStudy(data.klass,data.subject);
      const sections=seniorScience?seniorStudyContent(sl.title,checkedSections):checkedSections;
      const activity = sourceDiscussion(sl.title, sections, data.subject, data.klass);
      const activitySections=activity ? [...sections, activity] : sections;
      const concludedSections=seniorScience?seniorActivityConclusions(sl.title,activitySections):activitySections;
      const completeSections = sequenceChemistryNotes(withPhysicsDimensions(learningScaffold(sl.title, concludedSections, seniorScience||/^(?:9|10)$/.test(classNumber(data.klass))&&data.subject==="Science"), data.subject, sl.title), data.subject, data.chapter || sl.title);
      const prev = sl.verification as SlideVerification | undefined;
      return {
        ...sl,
        sections: completeSections,
        notes_quality: reviewNotes(completeSections,!seniorScience),
        verification: {
          ...(prev as SlideVerification),
          notes_check: check,
          overall_pass: (prev?.overall_pass ?? false) && check.pass,
        },
      };
    });
    const secondaryScience=(/^(?:9|10)$/.test(classNumber(data.klass))&&data.subject==="Science")||isSeniorScienceStudy(data.klass,data.subject);
    {
      const {topicSourceComplete}=await import('@/lib/sparse-topic-recovery.server');
      const incomplete=verifiedSlides.filter(slide=>!slide.topic_recovery&&!topicSourceComplete(slide,isLanguageSubject(data.subject)||lessonMode==='chapter'));
      if(incomplete.length){
        const {loadTopicNotes}=await import('./topic-notes-store.server');
        verifiedSlides=await Promise.all(verifiedSlides.map(async slide=>{
          if(!incomplete.includes(slide))return slide;
          const saved=await loadTopicNotes({klass:data.klass,subject:data.subject,chapter:data.chapter||data.topic,topic:slide.title});
          return saved?{...slide,sections:saved.sections,topic_recovery:{status:saved.mode,sourceUrl:saved.sourceUrl}}:{...slide,topic_recovery:{status:'missing' as const},caption:'Teacher notes needed for this topic'};
        }));
      }
    }
    if(secondaryScience&&!verifiedSlides.some(slide=>slide.topic_recovery)&&!verifiedSlides.some(slide=>(slide.sections||[]).filter(section=>section.kind!=="diagram").flatMap(section=>section.lines).filter(substantiveStudyLine).length>=3)){
      throw new Error(`The selected Class ${data.klass} ${data.subject} chapter does not contain enough readable explanations for study notes. Add or reprocess the matching textbook chapter, then regenerate. Classroom activities alone will not be saved as complete notes.`);
    }
    const needsStudyReview=(slide:Slide)=>secondaryScience&&(!slide.kind||slide.kind==="content"||slide.kind==="chapter");
    const notes_report = {
      flagged_slide_indices: verifiedSlides
        .map((sl, i) => (sl.verification?.notes_check?.pass === false || needsStudyReview(sl)&&!sl.notes_quality?.ready ? i : -1))
        .filter((i) => i >= 0),
      pass: verifiedSlides.every((sl) => sl.verification?.notes_check?.pass !== false && (!needsStudyReview(sl)||sl.notes_quality?.ready)),
    };
    const slides = [...verifiedSlides, ...mcqSlides];

    const activities = extractExperimentActivities(data.topic, context);
    const video = fallbackVideo(data.topic, activities);


    // Build verifiable activity matches with confidence
    const bookMeta = new Map(selectedBooks.map((b) => [b.id, b]));
    const maxRaw = Math.max(1, ...activityChunks.map((c) => c._s));
    const chapterEvidence = normalizeText(context);
    const matchPool = (activityChunks.length > 0 ? activityChunks : ranked.slice(0, 5).map((c) => ({ ...c, _s: c._s }))).filter(chunk => {
      const excerpt = normalizeText(splitReferenceContent(chunk.content).text).slice(0,120);
      return bookMeta.has(chunk.book_id) && excerpt.length>=40 && chapterEvidence.includes(excerpt);
    });

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

    const baseOutput: GenerationResult = await appendUploadedReferenceNotes({
      source_books: selectedBooks.map((b) => ({ id: b.id, chapter: b.chapter, class: b.class, subject: b.subject })),
      context_chars: context.length,
      slides,
      activities,
      activity_matches,
      video,
      figures_report: figCheck.report,
      notes_report,
    }, s, data.klass, data.subject, data.chapter || data.topic);

    const out=await appendSocialRevisionNotes(baseOutput,s,data.klass,data.subject,data.chapter||data.topic);

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
    }catch(error){
      const message=error instanceof Error?error.message:'';
      if(/No matching Class .*NCERT textbook|Upload the Class .*NCERT textbook|Readable text for .*was not located|uploaded sources for .*do not contain readable chapter/i.test(message)){
        const attention=await attentionFallback();if(attention)return attention;
      }
      throw error;
    }
    };
    const original = await run();
    const { addLessonTeachingSupport } = await import('./lesson-teaching-support.server');
    const enhanced = await addLessonTeachingSupport(original, { klass: String(data.klass), subject: data.subject, chapter: data.chapter || data.topic });
    if (enhanced !== original) {
      try {
        const cache = await cacheSupa();
        await (cache as any).from('lesson_cache').upsert({ cache_key: lessonKey, klass: String(data.klass), subject: data.subject, chapter: data.chapter || '', topic: data.topic, subtopics: data.subtopics, result: enhanced });
      } catch { /* Keep the completed lesson usable if caching is unavailable. */ }
    }
    return enhanced;
  });

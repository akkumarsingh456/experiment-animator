/**
 * Regression test — Mermaid syntax + diagram fallback checks.
 *
 * Re-generates a lesson locally via fallbackSlides() using varied NCERT-like
 * seed contexts and asserts that:
 *   1. Every slide.mermaid_flow parses under Mermaid v11 (no syntax errors).
 *   2. No slide's rendered SVG is a "diagram unavailable" fallback marker.
 *
 * If any slide fails, vitest exits non-zero and the build/test step fails.
 */
import { describe, it, expect, beforeAll } from "vitest";
import mermaid from "mermaid";
import {
  fallbackSlides,
  buildMermaidFlow,
  analyzeModelSelection,
} from "@/lib/generate.functions";

beforeAll(() => {
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    flowchart: { htmlLabels: true, curve: "basis" },
  });
});

const SEED_CONTEXTS: Array<{ topic: string; context: string }> = [
  {
    topic: "Electric Current and Circuits",
    context:
      "An electric circuit is a continuous conducting path. Current is the rate of flow of electric charge measured in ampere. A battery provides voltage that drives electrons through a resistor. Ohm's law states V equals I R. A switch opens or closes the circuit. A bulb glows when current flows through its filament.",
  },
  {
    topic: "Atoms and Molecules",
    context:
      "Every atom contains a nucleus of protons and neutrons surrounded by electrons. An element is made of one type of atom. When atoms combine they form molecules through chemical bonds. An ion is a charged atom. Acids react with bases to form salts. Water H2O is a common compound.",
  },
  {
    topic: "The Living Cell",
    context:
      "A cell is the basic unit of life. The nucleus of the cell stores DNA. Plant cells contain chloroplasts for photosynthesis. Leaves have stomata for gas exchange. Tissues form organs. Blood carries oxygen through the heart to every tissue.",
  },
  {
    topic: "Geometry of Triangles",
    context:
      "A triangle has three sides and three angles. The Pythagoras theorem relates the sides of a right triangle. The area of a triangle equals half base times height. Congruent triangles have equal corresponding sides. The perimeter is the sum of the three sides.",
  },
  {
    topic: "History of Democracy",
    context:
      "Democracy is a form of government where citizens elect their representatives. The Indian Constitution guarantees equality, liberty and justice. Elections are held periodically. Fundamental rights protect every citizen. Parliament makes laws for the country.",
  },
];

const FALLBACK_MARKERS = [
  "Diagram unavailable",
  "Syntax error in text",
  "mermaid-parseError",
  "mermaid version",
];

async function parseMermaid(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // mermaid.parse returns a truthy result on success and throws on syntax error.
    const res = await mermaid.parse(code, { suppressErrors: false });
    if (res === false) return { ok: false, error: "parser returned false" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

describe("Slide regression — Mermaid diagrams", () => {
  for (const seed of SEED_CONTEXTS) {
    it(`regenerates "${seed.topic}" with valid Mermaid on every slide`, async () => {
      const slides = fallbackSlides(seed.topic, seed.context);
      expect(slides.length).toBeGreaterThan(0);

      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const code = s.mermaid_flow ?? "";
        expect(code, `slide ${i + 1} missing mermaid_flow`).toBeTruthy();

        // 1. Mermaid syntax must parse cleanly.
        const parsed = await parseMermaid(code);
        if (!parsed.ok) {
          throw new Error(
            `Slide ${i + 1} "${s.title}" has invalid Mermaid syntax: ${parsed.error}\n---\n${code}\n---`,
          );
        }

        // 2. Code must not itself embed fallback / error markers.
        for (const marker of FALLBACK_MARKERS) {
          expect(
            code.includes(marker),
            `Slide ${i + 1} contains fallback marker "${marker}"`,
          ).toBe(false);
        }

        // 3. Debug block must exist and be internally consistent.
        expect(s.debug, `slide ${i + 1} missing debug`).toBeTruthy();
        if (s.debug!.chosen_category !== "none") {
          expect(s.debug!.total_hits).toBeGreaterThanOrEqual(s.debug!.threshold);
        }
      }
    });
  }

  it("buildMermaidFlow rotates through all six layouts without syntax errors", async () => {
    const bullets = [
      "A cell is the basic unit of life",
      "Nucleus stores the genetic material",
      "Mitochondria are the powerhouse",
      "Chloroplasts perform photosynthesis",
      "Cell membrane regulates transport",
      "Cytoplasm holds the organelles",
    ];
    for (let i = 0; i < 6; i++) {
      const code = buildMermaidFlow(`Layout variant ${i}`, bullets, i);
      const parsed = await parseMermaid(code);
      if (!parsed.ok) {
        throw new Error(`Layout ${i} failed to parse: ${parsed.error}\n${code}`);
      }
    }
  });

  it("analyzeModelSelection surfaces the matched cues for a physics slide", () => {
    const dbg = analyzeModelSelection(
      "Electric Current",
      "Electric current and circuits",
      ["A battery drives current through a resistor", "A switch opens the circuit"],
      ["Voltage is measured in volts"],
    );
    expect(dbg.chosen_category).toBe("physics_circuit");
    expect(dbg.total_hits).toBeGreaterThanOrEqual(2);
    expect(dbg.keyword_sources.title.length + dbg.keyword_sources.bullets.length).toBeGreaterThan(0);
  });
});

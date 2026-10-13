import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TopicVisualStructures } from "@/components/TopicVisualStructures";
import { renderSourceConceptMap, sourceConceptFacts } from "@/lib/source-concept-map";
import { geometryDiagram } from "@/lib/geometry-diagrams";
import { renderLessonIllustration } from "@/lib/napkin-infographic";
import { aiFormulaSheet, formulaEvidence, hasQuantitativeFormulaEvidence } from "@/lib/formula-notation";
import { mapWithConcurrency } from "@/lib/ncert-teacher-notes";

describe("More source-based structures across subjects", () => {
  it.each(["Physics", "Chemistry", "Biology", "Mathematics", "History", "Geography", "Political Science", "Economics", "Accountancy", "Computer Science", "English", "Hindi"])("shows factual study maps for %s", (subject) => {
    const input = { title: "Selected topic", sections: [{ heading: "Teacher Notes", lines: ["**Explanation:** A factual explanation from the selected source.", "**Explanation:** A second supported idea.", "**Definition:** A third supported idea.", "**Activity:** Discuss with a partner."] }] };
    const html = renderToStaticMarkup(<TopicVisualStructures subject={subject} input={input} />);
    expect(html).toContain(/English|Hindi/.test(subject) ? "Reading path:" : /Mathematics/.test(subject) ? "mathematics-topic-visual" : "Source-based concept map");
    if (/Mathematics/.test(subject)) expect(html.match(/<figure/g)).toHaveLength(1);
    else if (!/English|Hindi/.test(subject)) expect(html.match(/<figure/g)).toHaveLength(2);
    expect(sourceConceptFacts(input)).toHaveLength(3);
  });
  it("preserves Hindi, escapes source markup, and wraps without ellipses", () => {
    const input = { title: "कविता", notes: ["कविता में प्रकृति के सौंदर्य का वर्णन है।", '<script>alert("test")</script> & a long explanation '.repeat(16)] };
    const svg = renderSourceConceptMap(input);
    expect(svg).toContain("प्रकृति"); expect(svg).not.toContain("<script>"); expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("…"); expect(svg).toBe(renderSourceConceptMap(input));
  });
  it("does not invent a graph, chronology or current circuit from ambiguous keywords", () => {
    const svg = renderLessonIllustration({ title: "Current affairs", subject: "Political Science", notes: ["An idea from this chapter."] });
    expect(svg).toContain("Current affairs"); expect(svg).not.toContain("An idea from this chapter."); expect(svg).not.toContain("ammeter"); expect(svg).not.toContain("dependent variable");
    expect(geometryDiagram("Right triangles", "History")).toBeNull();
    expect(geometryDiagram("Triangles", "Mathematics")).toBeNull();
    expect(geometryDiagram("Pythagoras theorem", "Mathematics")?.svg).toContain("hypotenuse");
    expect(geometryDiagram("Tangents to a circle", "Mathematics")?.caption).toContain("perpendicular");
  });
  it("leaves a missing source empty rather than drawing made-up facts", () => {
    expect(renderToStaticMarkup(<TopicVisualStructures input={{ title: "Missing", sections: [{ heading: "Teacher Notes", lines: ["**Activity:** Discuss this chapter."] }] }} />)).toBe("");
  });
});

describe("Expanded formula and derivation coverage", () => {
  it.each([
    ["Physics", "$v=u+at$"], ["Chemistry", "C_2H_5Br + OH^- → C_2H_5OH + Br^-"],
    ["Mathematics", "\\int_0^1 x^2 dx = 1/3"], ["Biology", "frequency ≥ 10 kHz"],
  ])("detects source formulas for %s in any chapter", (_subject, source) => {
    expect(hasQuantitativeFormulaEvidence(source)).toBe(true);
    expect(formulaEvidence(["Prerequisite explanation", source, "Source derivation follows."])).toContain(source);
  });
  it("does not treat ordinary prose as formula evidence", () => {
    expect(hasQuantitativeFormulaEvidence("The chapter explains patterns in the reaction process.")).toBe(false);
  });
  it("limits simultaneous formula batches and preserves chapter order", async () => {
    let active = 0, peak = 0;
    const results = await mapWithConcurrency([0,1,2,3,4,5,6],3,async value => {
      active++; peak = Math.max(peak,active);
      await new Promise(resolve=>setTimeout(resolve,2));
      active--; return value * 2;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(results).toEqual([0,2,4,6,8,10,12]);
  });
  it("keeps late equations and neighbouring steps in a complete JSON payload", () => {
    const source = [...Array.from({ length: 20 }, (_, i) => `Introductory statement ${i}.`), "Start from the definition.", "$a = (v-u)/t$", "Hence multiply both sides by t.", "$v = u+at$"];
    const evidence = formulaEvidence(source);
    expect(evidence).toContain("$v = u+at$"); expect(evidence).toContain("Start from the definition.");
    expect(JSON.parse(JSON.stringify(evidence))).toEqual(evidence);
    expect(evidence.indexOf("$a = (v-u)/t$")).toBeLessThan(evidence.indexOf("$v = u+at$"));
  });
  it("retains more than five relations, all symbols/units and multiple complete proofs", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    const formula = Array.from({ length: 9 }, (_, i) => `Relation ${i}: $x_${i} = y_${i}$`);
    const variables = Array.from({ length: 12 }, (_, i) => `$x_${i}$: source variable ${i}`);
    const unit = Array.from({ length: 9 }, (_, i) => `Quantity ${i}: dimensionless`);
    const derivations = formula.map((relation) => ({ formula: relation, steps: ["Use the given definition $x = y+z$.", "Substitute $z=0$, giving $x=y$."] }));
    const fetchMock = vi.fn(async (_url: unknown, request: RequestInit) => {
      const body = JSON.parse(String(request.body));
      expect(body.reasoning.effort).toBe("high"); expect(body.input[0].content).toContain("late relation");
      const payload = { slides: [{ index: 0, formula, variables, unit, derivation: [], derivations }, { index: 99, formula, variables, unit, derivation: [], derivations }] };
      return new Response(`data: ${JSON.stringify({ type: "response.output_text.done", text: JSON.stringify(payload) })}\n\n`, { headers: { "Content-Type": "text/event-stream" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await aiFormulaSheet({ klass: "11", subject: "Mathematics", chapter: "Relations", slides: [{ index: 0, title: "Relations", excerpts: [...formula, "late relation $x=y$"] }] });
      expect(result.get(0)?.formula).toHaveLength(9); expect(result.get(0)?.variables).toHaveLength(12);
      expect(result.get(0)?.unit).toHaveLength(9); expect(result.get(0)?.derivations).toHaveLength(9); expect(result.has(99)).toBe(false);
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
});

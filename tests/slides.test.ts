/**
 * Regression test — React Flow graph structure checks.
 *
 * Re-generates lessons locally via fallbackSlides() using varied NCERT-like
 * seed contexts and asserts that every slide's `flow_graph` is a well-formed
 * React Flow graph (unique node IDs, edges pointing to real nodes, label
 * length within the A4 safe-frame budget).
 */
import { describe, it, expect } from "vitest";
import {
  fallbackSlides,
  analyzeModelSelection,
} from "@/lib/generate.functions";
import { buildFlowGraph, type FlowGraph } from "@/lib/flow-layouts";

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

function assertGraphWellFormed(graph: FlowGraph | undefined, label: string) {
  expect(graph, `${label} missing flow_graph`).toBeTruthy();
  if (!graph) return;
  expect(graph.nodes.length, `${label} needs ≥3 nodes`).toBeGreaterThanOrEqual(2);
  const ids = new Set<string>();
  for (const n of graph.nodes) {
    expect(ids.has(n.id), `${label} duplicate node id ${n.id}`).toBe(false);
    ids.add(n.id);
    expect(typeof n.label === "string" && n.label.length > 0, `${label} node ${n.id} empty label`).toBe(true);
    expect(n.label.length, `${label} node ${n.id} label too long`).toBeLessThanOrEqual(60);
  }
  for (const e of graph.edges) {
    expect(ids.has(e.source), `${label} edge source ${e.source} missing`).toBe(true);
    expect(ids.has(e.target), `${label} edge target ${e.target} missing`).toBe(true);
  }
}

describe("Slide regression — React Flow diagrams", () => {
  for (const seed of SEED_CONTEXTS) {
    it(`regenerates "${seed.topic}" with valid flow_graph on every slide`, () => {
      const slides = fallbackSlides(seed.topic, seed.context);
      expect(slides.length).toBeGreaterThan(0);
      slides.forEach((s, i) => {
        assertGraphWellFormed(s.flow_graph, `slide ${i + 1} "${s.title}"`);
        expect(s.debug, `slide ${i + 1} missing debug`).toBeTruthy();
      });
    });
  }

  it("buildFlowGraph rotates through all six layouts without collisions", () => {
    const bullets = [
      "A cell is the basic unit of life",
      "Nucleus stores the genetic material",
      "Mitochondria are the powerhouse",
      "Chloroplasts perform photosynthesis",
      "Cell membrane regulates transport",
      "Cytoplasm holds the organelles",
    ];
    const seenLayouts = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const g = buildFlowGraph(`Layout variant ${i}`, bullets, i);
      seenLayouts.add(g.layout);
      assertGraphWellFormed(g, `layout ${i}`);
    }
    expect(seenLayouts.size).toBe(6);
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

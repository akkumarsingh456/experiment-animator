import { describe, expect, it } from "vitest";
import { renderNapkinInfographic } from "@/lib/napkin-infographic";

describe("local lesson infographics", () => {
  it("creates stable but distinct SVGs for different lesson slides", () => {
    const first = renderNapkinInfographic({
      title: "Electric Current",
      subject: "Physics",
      slideIndex: 0,
      keyTerms: [{ term: "Resistance", meaning: "Opposition to current" }],
    });
    const repeat = renderNapkinInfographic({
      title: "Electric Current",
      subject: "Physics",
      slideIndex: 0,
      keyTerms: [{ term: "Resistance", meaning: "Opposition to current" }],
    });
    const second = renderNapkinInfographic({
      title: "Electric Current",
      subject: "Physics",
      slideIndex: 1,
      keyTerms: [{ term: "Potential difference", meaning: "Work done per unit charge" }],
    });
    expect(first).toBe(repeat);
    expect(second).not.toBe(first);
    expect(first).toContain("data-lesson-id");
  });

  it("uses topic-aware icon drawings and keeps SVG text escaped", () => {
    const chemistry = renderNapkinInfographic({
      title: "Acids & Bases",
      subject: "Chemistry",
      notes: ["Reaction: Acid reacts with a base to form salt and water"],
    });
    expect(chemistry).toContain("M9 2h6");
    expect(chemistry).toContain("ACIDS &amp; BASES");
    expect(chemistry).not.toContain("<script");
  });
});
import { describe, expect, it } from "vitest";
import { guidedGroups, uniqueTopicGroups } from "@/lib/guided-notes";
import { LESSON_RESOURCES, lessonResources } from "@/lib/lesson-resources";
import { buildLocalSections, selectSlideExcerpts, usefulTerm } from "@/lib/ncert-teacher-notes";

describe("Classroom notes planner", () => {
  it("matches specific official simulations and distinguishes 2D from 3D", () => {
    expect(lessonResources(["Ohm's law", "Kirchhoff's laws"], "Physics").map((r) => r.id)).toEqual(["ohms-law", "dc-circuits"]);
    expect(lessonResources(["Chemical bonding and molecular geometry"], "Chemistry")[0].dimension).toBe("3D interactive model");
    expect(lessonResources(["Mobility and drift velocity"], "Physics")).toEqual([]);
    expect(lessonResources(["Ohm's law"], "English")).toEqual([]);
    expect(LESSON_RESOURCES.every((r) => new URL(r.url).host === "phet.colorado.edu")).toBe(true);
  });
  it("removes shared prose without dropping different calculations or needed derivation steps", () => {
    const topics = uniqueTopicGroups([
      [{ heading: "Important points", kind: "list", lines: ["Conventional current is opposite to electron drift."] }],
      [{ heading: "Important points", kind: "list", lines: ["Conventional current is opposite to electron drift.", "Current is measured in amperes."] }, { heading: "Step-by-step derivation", kind: "derivation", lines: ["**Derivation step 1:** $Q = It$"] }],
    ]);
    expect(topics[1][0].lines).toEqual(["Current is measured in amperes."]);
    expect(topics[1][1].lines).toHaveLength(1);
  });
  it("recognises classroom packet sections without putting tasks in formula tables", () => {
    const groups = guidedGroups([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Learning Objectives:** Explain the meaning of electric current.", "**Support Practice:** Define current using a sentence starter.", "**Core Practice:** Explain why charge is conserved at a junction.", "**Challenge Practice:** Compare two circuit arrangements.", "**Exit Ticket:** Justify a claim using evidence.", "**Summary:** Current measures the rate of charge flow."] }]);
    expect(groups.map((g) => g.heading)).toEqual(["Learning objectives", "Support practice", "Core practice", "Challenge practice", "Quick recap", "Exit ticket"]);
  });
  it("does not treat equation references or the word hence as equations and derivations", () => {
    const groups = guidedGroups([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Formula:** Equation (3.33) has an important application to power transmission."] }]);
    expect(groups[0].kind).toBe("list");
    expect(guidedGroups([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Formula:** Let the length be $l$."] }])[0].kind).toBe("list");
    const lines = buildLocalSections({ title: "Current", bullets: ["Hence no electric current flows through the conductor.", "The following equation illustrates this observation."] })[0].lines;
    expect(lines.every((line) => !/^\*\*(Formula|Derivation)/.test(line))).toBe(true);
  });
  it("does not expand generic topic titles into unrelated source fragments", () => {
    expect(selectSlideExcerpts({ title: "Chapter 3: Current Electricity — NCERT point 17", bullets: ["Charge is conserved at a junction."] }, "Another important point is the behaviour of a magnetic field.")).toEqual(["Charge is conserved at a junction."]);
    expect(usefulTerm("As Long As They", "moving, will constitute an electric current.")).toBe(false);
    expect(usefulTerm("Electric Field Will Be Created", "directed from positive to negative charge.")).toBe(false);
    expect(usefulTerm("Mobility", "Drift velocity per unit applied electric field.")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { worksheetSlices } from "@/lib/lesson-pdf";

describe("Worksheet PDF pagination", () => {
  it("uses safe paragraph boundaries and exports every pixel exactly once", () => {
    const slices = worksheetSlices(2300, 1000, [800, 950, 1650, 1900, 2200], [[900, 1050]]);
    expect(slices).toEqual([[0, 800], [800, 1650], [1650, 2300]]);
  });
  it("splits an oversized block without dropping its continuation", () => {
    expect(worksheetSlices(2500, 1000, [], [[0, 2500]])).toEqual([[0, 1000], [1000, 2000], [2000, 2500]]);
  });
  it("does not add an empty page when content fits exactly", () => {
    expect(worksheetSlices(1000, 1000, [])).toEqual([[0, 1000]]);
  });
});

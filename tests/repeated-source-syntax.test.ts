import { describe, expect, it } from "vitest";
import { cleanSourceNoteLine, hasBrokenSourceMath } from "../src/lib/source-note-quality";
import { repairSourceMathSlide } from "../src/lib/source-math-repair";
import { toNoteBlocks } from "../src/lib/notes-paging";
import { guidedGroups } from "../src/lib/guided-notes";
import type { Slide } from "../src/lib/generate.functions";

describe("repeated equation extraction syntax", () => {
  const broken="we can rewrite Eq (2.20) as E = − = + δ δ δ δ V l V l (2.21)";
  it("detects the reported flattened equation without guessing a replacement", () => {
    expect(hasBrokenSourceMath(broken)).toBe(true);
    expect(cleanSourceNoteLine(broken)).toBe("");
  });
  it("catches the pattern across different equations and differential symbols", () => {
    for (const text of ["E = - = + V r", "Formula: F = = + m a", "Eq. (3.2): I = ∂ ∂ ∂ Q t", "V = Δ Δ Δ U q", "$E = - = + V$"])
      expect(hasBrokenSourceMath(text),text).toBe(true);
  });
  it("preserves valid repeated mathematical quantities and quoted examples", () => {
    for (const text of ["$E=-\\frac{dV}{dr}$", "$a=b=c$", "$x=-a=-b$", "$\\delta V=\\delta V$", "$a+a+a=3a$", "V = V and E = E", 'The invalid example "E = - = + δ δ δ" needs source review.']) {
      expect(hasBrokenSourceMath(text),text).toBe(false);
      expect(cleanSourceNoteLine(text),text).toBe(text);
    }
  });
  it("repairs saved slides too and preserves the original only in source review", () => {
    const definition="An equipotential surface is a surface over which potential has a constant value.";
    const slide: Slide={title:"Equipotential Surfaces",bullets:[],notes:[],key_terms:[],visual:"book",sections:[
      {heading:"Definitions",kind:"bullets",lines:[definition]},
      {heading:"Important points",kind:"bullets",lines:[broken,"The electric field is normal to an equipotential surface."]},
    ]};
    const repaired=repairSourceMathSlide(slide);
    expect(repaired.sections?.find(section=>section.heading==="Definitions")?.lines).toContain(definition);
    expect(repaired.sections?.find(section=>section.heading==="Important points")?.lines).not.toContain(broken);
    expect(repaired.sections?.find(section=>section.heading==="Source review — original extraction")?.lines).toContain(broken);
    expect(toNoteBlocks(repaired.sections).filter(block=>block.heading!=="Source review — original extraction").flatMap(block=>block.lines)).not.toContain(broken);
    expect(guidedGroups(repaired.sections).filter(group=>group.heading!=="Source review — original extraction").flatMap(group=>group.lines)).not.toContain(broken);
  });
});

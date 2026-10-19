import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { withPhysicsDimensions } from "@/lib/physics-dimensions";
import { repairSourceMathSlide } from "@/lib/source-math-repair";
import { reviewLessonFacts } from "@/lib/notes-factual-review";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import PagedNoteSections from "@/components/PagedNoteSections";
import { paginateLectureSections } from "@/lib/lecture-pages";
import type { Slide } from "@/lib/generate.functions";
const rows = [
  String.raw`Work / energy / heat | $[M L^{2} T^{-2}]$ | Work = force × displacement.`,
  String.raw`Frequency | $[T^{-1}]$ | Cycles per unit time.`,
  String.raw`Torque | $[M L^{2} T^{-2}]$ | Force × perpendicular distance; same dimensions as energy, different meaning.`,
  String.raw`Magnetic flux density | $[M T^{-2} I^{-1}]$ | From F = B I l for perpendicular field and conductor.`,
  String.raw`Temperature | $[\Theta]$ | Temperature needs Θ; it cannot be written using only M, L and T.`,
];
const item = (title: string): Slide => ({title,kind:"content",visual:"",bullets:[],notes:[],key_terms:[],sections:[
  {heading:"Teacher Notes",kind:"bullets",lines:["**Explanation:** Keep the original explanation, its examples and conditions."]},
  {heading:"MLT Dimensional Formula",kind:"bullets",lines:[...rows]},
  {heading:"Formulas",kind:"formula",lines:[String.raw`**Formula:** $F=BIl$`]},
]});
describe("Source report cannot remove existing lesson formulas",()=>{
  it.each(["Bar Magnets","Paramagnetic And Ferromagnetic Materials","Magnetic Field Lines And Dipole Analogy","Atomic Spectra"])("retains every saved formula in %s rather than rebuilding its appendix", title=>{
    const slide=item(title),before=JSON.stringify(slide);
    const sections=withPhysicsDimensions(slide.sections,"Physics",title,true);
    expect(sections).toBe(slide.sections);
    expect(sections[1].lines).toEqual(rows);
    const repaired=repairSourceMathSlide({...slide,sections});
    expect(repaired.sections?.find(section=>section.heading==="MLT Dimensional Formula")?.lines).toEqual(rows);
    const report=reviewLessonFacts([slide],[]);
    expect(report.claims.some(claim=>claim.text.includes("Temperature needs"))).toBe(true);
    expect(JSON.stringify(slide)).toBe(before);
    const pages=paginateLectureSections(sections,12);
    const retained=pages.flatMap(page=>page.flatMap(section=>section.lines));
    for(const row of rows)expect(retained).toContain(row);
    const ppt=renderToStaticMarkup(<PagedNoteSections sections={sections} subject="Physics"/>);
    const plan=renderToStaticMarkup(<GuidedLessonNotes slides={[slide]} klass="12" subject="Physics" title={title}/>);
    for(const html of [ppt,plan]){
      for(const name of ["Work / energy / heat","Frequency","Torque","Magnetic flux density","Temperature needs"])expect(html).toContain(name);
      expect(html).not.toContain("katex-error");
    }
    expect(JSON.stringify(slide)).toBe(before);
  });
  it("keeps existing formula reference and dimensional rows together",()=>{
    const slide=item("Bar Magnets");
    slide.sections!.push({heading:"Problem-solving formula reference",kind:"formula",lines:[String.raw`Field | $B=\mu_0 H$ | Original stated conditions.`]});
    const sections=withPhysicsDimensions(slide.sections,"Physics",slide.title,true);
    expect(sections).toBe(slide.sections);expect(sections[1].lines).toEqual(rows);
    expect(repairSourceMathSlide(slide).sections?.find(section=>section.heading==="Problem-solving formula reference")?.lines).toEqual(slide.sections![3].lines);
  });
});

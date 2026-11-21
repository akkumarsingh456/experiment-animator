import {describe,expect,it} from "vitest";
import {crossCheckGeneratedSlides} from "@/lib/generated-content-cross-check";

describe("generated content cross-check",()=>{
 it("removes flattened calculus/OCR strings like the reported velocity example",()=>{
  const broken="Instantaneous velocity is defined as the limit of the average velocity as the time interval Δt becomes infinitesimally small: d d t 0 t 0 x x v lim v lim t Δ → Δ → Δ = Δ";
  const result=crossCheckGeneratedSlides([{title:"Velocity",sections:[{heading:"Important points",kind:"bullets",lines:[broken,"Velocity is the rate of change of position with time."]}]}]);
  expect(result.removed).toBe(1);
  expect(result.slides[0].sections[0].lines).toEqual(["Velocity is the rate of change of position with time."]);
 });
 it("preserves valid prose and properly delimited equations",()=>{
  const result=crossCheckGeneratedSlides([{bullets:["Average velocity is displacement divided by the time interval.","$v_{avg}=\\frac{\\Delta x}{\\Delta t}$"]}]);
  expect(result.removed).toBe(0);
  expect(result.slides[0].bullets).toHaveLength(2);
 });
 it("checks generated teaching-support sections as well as core notes",()=>{
  const result=crossCheckGeneratedSlides([{teaching_support:[{heading:"Example",lines:["d d t 0 t 0 x x v lim v lim t Δ → Δ → Δ = Δ"]}]}]);
  expect(result.removed).toBe(1);
  expect(result.slides[0].teaching_support).toEqual([]);
 });
});

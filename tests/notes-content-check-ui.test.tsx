import { it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NotesContentCheck } from "@/components/NotesContentCheck";
import type { Slide } from "@/lib/generate.functions";
const f=vi.hoisted(()=>({load:vi.fn(async()=>({sources:[{book:"Matching textbook.pdf",location:"Chapter extract 1",text:"The equilibrium temperature of the sample is 300 kelvin."}],partial:false}))}));
vi.mock("@/lib/notes-review-sources.functions",()=>({loadNotesReviewSources:f.load}));
it("automatically compares independent sources and visibly flags a possible numeric conflict without edits",async()=>{
  const slides:Slide[]=[{title:"Existing topic",bullets:[],notes:[],key_terms:[],visual:"",sections:[{heading:"Key points",kind:"bullets",lines:["The equilibrium temperature of the sample is 900 kelvin."]}]}];
  const before=JSON.stringify(slides),host=document.createElement("div");document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<NotesContentCheck slides={slides} klass="Class 12" subject="Physics" chapter="Chapter 4: Moving Charges and Magnetism"/>));
  expect(f.load).toHaveBeenCalledWith({data:{klass:"12",subject:"Physics",chapter:"Chapter 4: Moving Charges and Magnetism"}});
  expect(host.textContent).toContain("1 possible conflicts");expect(host.textContent).toContain("Matching textbook.pdf");
  expect(host.querySelector("details")?.open).toBe(true);expect(JSON.stringify(slides)).toBe(before);
  await act(async()=>host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(host.textContent).not.toContain("1 possible conflicts");expect(JSON.stringify(slides)).toBe(before);
  await act(async()=>root.unmount());host.remove();
});

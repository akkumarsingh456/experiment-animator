import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { orderTopicSections, orderTopicGroups } from "@/lib/topic-lecture-order";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import { paginateLectureSections } from "@/lib/lecture-pages";
import { NCERT_SYLLABUS } from "@/lib/ncert-syllabus";
import type { NoteSection } from "@/lib/ncert-teacher-notes";
const lines = [
  "**Use:** Existing use of the relationship.",
  "**Formula:** $F=ma$",
  "**Important point:** Keep the stated assumptions.",
  "**Derivation of force:** $F=ma$",
  "**Derivation step 1:** $F=dp/dt$",
  "**Derivation step 2:** For constant mass, $F=ma$.",
  "**Condition:** Mass remains constant in this derivation.",
  "**Definition:** Existing explanation of the topic.",
  "**Activity:** Existing teacher-designed demonstration.",
  "**Activity materials:** Original apparatus.",
  "**Activity steps:** Observe the original setup.",
  "**Activity outcome:** Record the observations.",
];
const sections = (): NoteSection[] => [{heading:"Teacher Notes",kind:"bullets",lines:[...lines]}];
const flat = (items: Array<{lines:string[]}>) => items.flatMap(item=>item.lines);
const multiset = (items: Array<{lines:string[]}>) => flat(items).slice().sort();
describe("Rearrange existing notes per topic without content changes",()=>{
  it("orders activity, notes, important points, paired formula/proof and uses",()=>{
    const input=sections(),before=JSON.stringify(input),output=orderTopicSections(input),text=flat(output);
    expect(text.indexOf(lines[8])).toBeLessThan(text.indexOf(lines[7]));
    expect(text.indexOf(lines[7])).toBeLessThan(text.indexOf(lines[2]));
    expect(text.indexOf(lines[2])).toBeLessThan(text.indexOf(lines[1]));
    expect(text.slice(text.indexOf(lines[1]),text.indexOf(lines[1])+5)).toEqual([lines[1],lines[3],lines[4],lines[5],lines[6]]);
    expect(text.at(-1)).toBe(lines[0]);
    expect(multiset(output)).toEqual(multiset(input));expect(JSON.stringify(input)).toBe(before);
    expect(flat(orderTopicSections(output))).toEqual(text);
  });
  it("keeps repeated rows, source originals, code, diagrams and mechanisms",()=>{
    const input:NoteSection[]=[
      {heading:"Applications",kind:"bullets",lines:["Use remains.","Use remains."]},
      {heading:"Source review — original extraction",kind:"text",lines:["Original raw row.","Original raw row."]},
      {heading:"Reaction mechanism",kind:"bullets",lines:["**Step 1:** Original reagent.","**Step 2:** Original product.","**Condition:** Original temperature."]},
      {heading:"Diagram",kind:"diagram",lines:["A -> B", "|    |"]},
    ];
    const output=orderTopicSections(input);expect(multiset(output)).toEqual(multiset(input));
    expect(output.find(item=>item.heading==="Reaction mechanism")?.lines).toEqual(input[2].lines);
    expect(output.find(item=>item.kind==="diagram")?.lines).toEqual(input[3].lines);
  });
  it("puts each existing guided formula immediately before its matching proof",()=>{
    const output=orderTopicGroups([
      {heading:"Applications",kind:"list",lines:["Original use."]},
      {heading:"Formulas and relations",kind:"formula",lines:["$F=ma$","$v=u+at$"]},
      {heading:"Step-by-step derivation",kind:"derivation",lines:["**Derivation of velocity:** $v=u+at$","**Derivation step 1:** Original velocity step."]},
      {heading:"Step-by-step derivation",kind:"derivation",lines:["**Derivation of force:** $F=ma$","**Derivation step 1:** Original force step."]},
      {heading:"Activity",kind:"list",lines:["Existing activity."]},
    ]);
    expect(output.map(item=>item.lines[0])).toEqual(["Existing activity.","$F=ma$","**Derivation of force:** $F=ma$","$v=u+at$","**Derivation of velocity:** $v=u+at$","Original use."]);
  });
  it("does not invent an experiment, formula or derivation where absent",()=>{
    const input:NoteSection[]=[{heading:"Explanation",kind:"text",lines:["Only existing prose."]}];
    expect(orderTopicSections(input)).toEqual(input);
  });
  it("repeats the requested sequence separately for two topics in guided notes",()=>{
    const slides=["First topic","Second topic"].map(title=>({title,visual:"",bullets:[],notes:[],key_terms:[],sections:sections()}));
    const before=JSON.stringify(slides);
    const html=renderToStaticMarkup(<GuidedLessonNotes slides={slides} klass="12" subject="Physics" title="Existing chapter"/>);
    const host=document.createElement("div");host.innerHTML=html;
    const articles=[...host.querySelectorAll("article.guided-topic")].filter(item=>item.querySelector(".guided-topic-number"));
    expect(articles).toHaveLength(2);
    for(const article of articles){
      const text=article.textContent!;
      expect(text.indexOf("Existing teacher-designed demonstration")).toBeLessThan(text.indexOf("Existing explanation of the topic"));
      expect(text.indexOf("Existing explanation of the topic")).toBeLessThan(text.indexOf("Keep the stated assumptions"));
      expect(text.indexOf("Keep the stated assumptions")).toBeLessThan(text.indexOf("Original force")<0?text.indexOf("Mass remains constant"):text.indexOf("Original force"));
      expect(text.indexOf("Mass remains constant")).toBeLessThan(text.indexOf("Existing use of the relationship"));
    }
    expect(JSON.stringify(slides)).toBe(before);
  });
  const selected:Record<string,string[]>={"9":["Social Science","Mathematics","Science","Computer Science"],"10":["Social Science","Mathematics","Science","Computer Science"],"11":["Mathematics","Physics","Chemistry","Computer Science"],"12":["Mathematics","Physics","Chemistry","Computer Science"]};
  const chapters=Object.entries(NCERT_SYLLABUS).flatMap(([klass,subjects])=>Object.entries(subjects).filter(([subject])=>selected[klass]?.includes(subject)).flatMap(([subject,entries])=>entries.map(entry=>({klass,subject,...entry}))));
  it.each(chapters)("$klass $subject $chapter retains all entries through ordering and existing PPT pagination",()=>{
    const input=sections(),ordered=orderTopicSections(input),pages=paginateLectureSections(ordered,12);
    const retained=pages.flatMap(page=>page.flatMap(item=>item.lines));
    for(const line of lines)expect(retained).toContain(line);
    expect(multiset(ordered)).toEqual(multiset(input));
  });
});


it("keeps a worked-example condition attached when its block moves",()=>{
  const input:NoteSection[]=[{heading:"Worked example",kind:"bullets",lines:["Original worked example."]},{heading:"Conditions",kind:"bullets",lines:["Only for this example."]},{heading:"Applications",kind:"bullets",lines:["Original use."]}];
  expect(flat(orderTopicSections(input))).toEqual(["Original use.","Original worked example.","Only for this example."]);
});


it("does not infer a formula-proof association from a shared variable alone",()=>{
  const groups=orderTopicGroups([
    {heading:"Formulas and relations",kind:"formula",lines:["$F$ denotes the existing variable."]},
    {heading:"Formulas and relations",kind:"formula",lines:["$v=u+at$"]},
    {heading:"Step-by-step derivation",kind:"derivation",lines:["The target variable is $F$.","**Derivation step 1:** $a=2b$"]},
  ]);
  expect(groups.map(group=>group.lines[0])).toEqual(["$F$ denotes the existing variable.","$v=u+at$","The target variable is $F$."]);
});

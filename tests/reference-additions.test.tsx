import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { appendUploadedReferenceNotes } from "@/lib/uploaded-reference-notes";
import { encodeReferenceVisuals, splitReferenceContent, type ReferenceVisual } from "@/lib/reference-visuals";
import { BookReferenceFigures } from "@/components/BookReferenceFigures";
import { BookMapSlide } from "@/components/BookMapSlide";
import { combinedReferenceMatches, medEasyLibraryMetadata } from "@/lib/reference-books";

const figure: ReferenceVisual = { title: "Nucleophilic substitution reaction", kind: "reaction", description: "Nucleophilic substitution: reactant, reagent, reaction arrow and product.", page: 169, storage_path: "Class11/Chemistry/book.pdf.page-169.jpg", aspect: .707, crop: { x: .1, y: .2, width: .8, height: .25 } };
function book(id: string, subject: string, klass = "Class 11", ncert = false) {
  return { id, class: klass, subject, chapter: ncert ? "NCERT" : `${subject} MED EASY`, file_name: `${ncert ? "NCERT" : "MED EASY"} ${subject}.pdf`, num_chunks: 247 };
}
function mockDb(books: ReturnType<typeof book>[], chunks: Record<string,string[]>) {
  return { storage: { from: () => ({ createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://example.test/${path}` } }) }) }, from(table: string) {
    let id = ""; const query = { select: () => query, eq: (_key: string, value: string) => { id = value; return query; }, order: () => query,
      limit: async () => ({ data: table === "ncert_books" ? books : (chunks[id] || []).map((content,chunk_index) => ({ content, chunk_index })) }) };
    return query;
  } } as any;
}
function lesson(title: string) {
  const formula = { heading: "Teacher Notes", kind: "bullets", lines: ["**Formula:** $P=IV=I^2R$", "**Derivation step 1:** Use the original relation."] };
  return { source_books: [], slides: [{ title, kind: "content", sections: [formula], bullets: [], notes: [], key_terms: [] }], activities: [] } as any;
}

describe("Supplemental Med Easy/NCERT notes and exact book figures", () => {
  it.each(["Physics", "Chemistry", "Botany", "Zoology"])("labels the combined %s PDF for both senior classes and preserves its content and storage",subject=>{
    const original={class:"Unspecified Class",subject:"General",file_name:`${subject.toUpperCase()} MED EASY.pdf`,chapter:"Uploaded reference",storage_path:"UnspecifiedClass/original.pdf",full_text:"Unchanged source notes and formulas."};
    const classified=medEasyLibraryMetadata(original);
    expect(classified.class).toBe("Class 11 & 12");
    expect(classified.subject).toBe(/Botany|Zoology/.test(subject)?"Biology":subject);
    expect(classified.storage_path).toBe(original.storage_path);
    expect(classified.full_text).toBe(original.full_text);
    expect(medEasyLibraryMetadata(classified)).toEqual(classified);
    expect(combinedReferenceMatches(classified,"11",classified.subject)).toBe(true);
    expect(combinedReferenceMatches(classified,"12",classified.subject)).toBe(true);
  });
  it("leaves NCERT book classification unchanged",()=>{
    const original={class:"Class 12",subject:"Physics",file_name:"NCERT_CLASS_12_PHYSICS.pdf"};
    expect(medEasyLibraryMetadata(original)).toBe(original);
  });
  it.each(["11", "12"])("includes both Botany and Zoology screenshots in Biology for Class %s", async grade => {
    const original = lesson("Cell structure");
    const botany = {...book("botany","Biology","Unspecified"),file_name:"BOTANY MED EASY.pdf"};
    const zoology = {...book("zoology","Biology","Class 12"),file_name:"COMPLETE ZOOLOGY MED EASY.pdf"};
    const pictures = [botany,zoology].map((b,i)=>({...figure,kind:"diagram" as const,title:`Cell structure ${i+1}`,description:"Cell structure with original labels and connecting arrows.",chapter:"Cell: The Unit of Life",storage_path:`Biology/${b.id}.pdf.page-10.jpg`}));
    const chunks = Object.fromEntries([botany,zoology].map((b,i)=>[b.id,[encodeReferenceVisuals("Cell structure reference notes retained in their genuine wording.",[pictures[i]],{chapter:"Cell: The Unit of Life",visuals_checked:true})]]));
    const result = await appendUploadedReferenceNotes(original,mockDb([botany,zoology],chunks),grade,"Biology","Cell: The Unit of Life");
    expect(result.slides[0].reference_visuals).toHaveLength(2);
    expect(result.slides[0].sections).toHaveLength(3);
    expect(result.slides[0].sections[0]).toBe(original.slides[0].sections[0]);
    expect(result.source_books.map((b:any)=>b.id)).toEqual(["botany","zoology"]);
  });
  it("keeps separately requested Botany and Zoology within their subject",()=>{
    const botany={file_name:"BOTANY MED EASY.pdf"};
    const zoology={file_name:"COMPLETE ZOOLOGY MED EASY.pdf"};
    expect(combinedReferenceMatches(botany,"11","Botany")).toBe(true);
    expect(combinedReferenceMatches(zoology,"12","Zoology")).toBe(true);
    expect(combinedReferenceMatches(botany,"12","Zoology")).toBe(false);
    expect(combinedReferenceMatches(zoology,"11","Botany")).toBe(false);
  });
  it("distinguishes pages actually inspected for screenshots from older text-only pages",()=>{
    expect(splitReferenceContent(encodeReferenceVisuals("Source text",[],{chapter:"Cell"})).context?.visuals_checked).not.toBe(true);
    expect(splitReferenceContent(encodeReferenceVisuals("Source text",[],{chapter:"Cell",visuals_checked:true})).context?.visuals_checked).toBe(true);
  });
  it("assigns all matching chapter maps once, with unrelated chapters excluded", async () => {
    const original = lesson("Introduction to Haloalkanes");
    original.slides.push({...original.slides[0], title:"Nucleophilic substitution"});
    const maps = Array.from({length:10},(_,i)=>({...figure,title:`Reaction pathways ${i+1}`, chapter:"Haloalkanes and Haloarenes"}));
    const wrong = {...figure,title:"Aldehyde reaction map",chapter:"Aldehydes, Ketones and Carboxylic Acids"};
    const db = mockDb([book("med","Chemistry")],{med:[encodeReferenceVisuals("These are the original uploaded structures.",[...maps,wrong],{chapter:"Haloalkanes and Haloarenes"})]});
    const result = await appendUploadedReferenceNotes(original,db,"12","Chemistry","Haloalkanes and Haloarenes");
    const figures = result.slides.flatMap((slide:any)=>slide.reference_visuals || []);
    expect(figures).toHaveLength(10);
    expect(new Set(figures.map((v:any)=>v.title)).size).toBe(10);
    expect(figures.every((v:any)=>v.chapter === "Haloalkanes and Haloarenes")).toBe(true);
    expect(result.slides[0].sections[0]).toBe(original.slides[0].sections[0]);
  });
  it("preserves exact source wording outside chapter indexing metadata",()=>{
    const source="Keep this source sentence and its $V=IR$ notation unchanged.";
    const parsed=splitReferenceContent(encodeReferenceVisuals(source,[figure],{chapter:"Current Electricity"}));
    expect(parsed.text).toBe(source);
    expect(parsed.context?.chapter).toBe("Current Electricity");
    expect(parsed.text).not.toContain("REFERENCE_CONTEXT");
  });
  it("uses the full slide width for the complete source map with its original image",()=>{
    const html=renderToStaticMarkup(<BookMapSlide title="Haloalkanes" subject="Chemistry" figures={[{...figure,url:"https://example.test/original.jpg",chapter:"Haloalkanes and Haloarenes"}]} />);
    expect(html).toContain("book-map-slide");
    expect(html).toContain("book-figure-presentation");
    expect(html).toContain("https://example.test/original.jpg");
    expect(html).toContain("Haloalkanes and Haloarenes");
    expect(html).not.toContain("book-figure-compact");
  });
  it("refreshes cached reference paragraphs as topic-specific points, preserving original formulas", async () => {
    const original = lesson("Ohm’s Law");
    const formula = original.slides[0].sections[0];
    const points = [
      "Ohm’s law relates the current through a conductor to the potential difference across it at constant temperature.",
      "Atmospheric electricity arises due to the separation of electric charges and has no place under this topic.",
      "Kirchhoff’s law describes a different relationship for closed loops in an electrical circuit with multiple branches.",
      "Ohm’s law is often stated in an equivalent form for the same conductor when its physical conditions remain unchanged.",
    ];
    original.slides[0].sections.push({heading:"Reference notes — NCERT Physics", kind:"bullets", lines:[points.join(" ")]});
    const db = mockDb([book("ncert","Physics","Class 12",true)], {ncert:[points.join(" ")]});
    const result = await appendUploadedReferenceNotes(original,db,"12","Physics","Current Electricity");
    expect(result.slides[0].sections[0]).toBe(formula);
    expect(result.slides[0].sections[1].lines).toEqual([points[0],points[3]]);
    expect(result.slides[0].sections).toHaveLength(2);
  });
  it.each(["11", "12"])("adds organic notes and figures for Class %s without changing existing formulas or derivations", async grade => {
    const original = lesson("Nucleophilic substitution"); const formula = original.slides[0].sections[0];
    const passages = Array.from({length:8}, (_,i) => `Nucleophilic substitution reference passage ${i+1}: a distinct source detail retained verbatim.`);
    const db = mockDb([book("med", "Chemistry"),book("ncert", "Chemistry", `Class ${grade}`,true), book("physics", "Physics")], { med: [encodeReferenceVisuals(passages.join("\n\n"),[figure])], ncert: ["Nucleophilic substitution NCERT passage: the matching topic is included."], physics: ["Nucleophilic substitution irrelevant cross-subject passage."] });
    const result = await appendUploadedReferenceNotes(original,db,`Class ${grade}`,"Chemistry","Haloalkanes and Haloarenes");
    expect(result.slides[0].sections[0]).toBe(formula);
    expect(JSON.stringify(formula)).toBe(JSON.stringify(original.slides[0].sections[0]));
    expect(result.slides[0].sections[1].lines).toEqual(passages);
    expect(result.slides[0].reference_visuals).toHaveLength(1);
    expect(result.slides[0].reference_visuals[0].page).toBe(169);
    expect(result.source_books.map((b:any)=>b.id)).toEqual(["med","ncert"]);
    const repeated = await appendUploadedReferenceNotes(result,db,`Class ${grade}`,"Chemistry","Haloalkanes and Haloarenes");
    expect(repeated.slides[0].sections).toHaveLength(result.slides[0].sections.length);
    expect(repeated.slides[0].reference_visuals).toHaveLength(1);
  });
  it("adds inorganic structural evidence without mixing neighbouring chapters", async () => {
    const original=lesson("Coordination compounds");
    const db=mockDb([book("med","Chemistry")],{med:["Coordination compounds have identifiable ligand and central-metal labels in the source.\n\nHydrocarbons are a separate chapter with unrelated passages."]});
    const result=await appendUploadedReferenceNotes(original,db,"12","Chemistry","Coordination Compounds");
    expect(result.slides[0].sections[1].lines).toHaveLength(1);
    expect(result.slides[0].sections[1].lines[0]).not.toContain("Hydrocarbons");
  });
  it.each(["11","12"])("adds Physics detail for Class %s while preserving original note objects", async grade => {
    const original=lesson("Drift velocity");
    const db=mockDb([book("med","Physics")],{med:["Drift velocity describes the mean motion of charge carriers in the reference passage."]});
    const result=await appendUploadedReferenceNotes(original,db,grade,"Physics","Current Electricity");
    expect(result.slides[0].sections[0]).toBe(original.slides[0].sections[0]);
    expect(result.slides[0].sections).toHaveLength(2);
  });
  it("does not add Chemistry/Physics supplements to junior classes or Mathematics", async()=>{
    const original=lesson("Drift velocity");const db=mockDb([book("med","Physics")],{med:["Drift velocity reference detail that belongs only to Physics."]});
    expect(await appendUploadedReferenceNotes(original,db,"10","Physics","Current Electricity")).toBe(original);
    expect(await appendUploadedReferenceNotes(original,db,"12","Mathematics","Determinants")).toBe(original);
  });
  it("keeps visual metadata out of genuine source wording and rejects out-of-page crops",()=>{
    const source="Keep this genuine source sentence unchanged.";
    const parsed=splitReferenceContent(encodeReferenceVisuals(source,[figure,{...figure,crop:{x:.9,y:.2,width:.8,height:.25}}]));
    expect(parsed.text).toBe(source);expect(parsed.visuals).toEqual([figure]);
    expect(splitReferenceContent(source+"[REFERENCE_VISUALS_V1]broken[/REFERENCE_VISUALS_V1]").text).toBe(source);
  });
  it("renders exact source images, readable captions, source pages and reaction icons",()=>{
    const html=renderToStaticMarkup(<BookReferenceFigures figures={[{...figure,url:"https://example.test/page.jpg",book:"Chemistry Med Easy"}]} subject="Chemistry" />);
    expect(html).toContain("Reaction scheme");expect(html).toContain("PDF page 169");expect(html).toContain("Chemistry Med Easy");expect(html).toContain("book-figure-crop");expect(html).toContain("crossorigin=\"anonymous\"");
  });
});

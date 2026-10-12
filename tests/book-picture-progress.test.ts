import { describe, expect, it, vi } from "vitest";
import { encodeReferenceVisuals } from "@/lib/reference-visuals";
const mock = vi.hoisted(() => ({ read:vi.fn(), extract:vi.fn(), finish:vi.fn(), sign:vi.fn(), paid:vi.fn(), recognize:vi.fn(), close:vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({supabase:{from:(table:string)=>{const query:any={select:()=>query,or:()=>query,eq:()=>query,order:()=>query,limit:async()=>({data:table==="ncert_books"?[{id:"book",file_name:"CHEMISTRY MED EASY.pdf",storage_path:"book.pdf",num_pages:2,num_chunks:1}]:[]})};return query;}}}));
vi.mock("@/lib/ingest.functions",()=>({classifyMedEasyLibrary:async()=>{},signDownload:mock.sign}));
vi.mock("@/lib/reference-ocr.functions",()=>({readScannedPage:mock.paid,finishReferenceReading:mock.finish,saveExtractedReferencePage:vi.fn()}));
vi.mock("@/lib/reference-capture.functions",()=>({saveCapturedReferencePage:mock.read}));
vi.mock("@/lib/local-book-reader",()=>({createLocalBookReader:()=>({recognize:mock.recognize,close:mock.close})}));
vi.mock("@/lib/pdf-extract",()=>({extractPdfText:mock.extract}));
import { prepareScannedReferenceBooks } from "@/lib/prepare-reference-books";
describe("attaching saved book pictures while reading",()=>{
  it("attaches each captured page before the book finishes, and skips cover pages",async()=>{
    const order:string[]=[];
    mock.recognize.mockResolvedValue("Locally recognized topic text.");
    mock.sign.mockResolvedValue({signedUrl:"https://example.test/book.pdf"});
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob()}));
    mock.read.mockResolvedValueOnce(encodeReferenceVisuals("",[],{chapter:"",visuals_checked:true})).mockResolvedValueOnce(encodeReferenceVisuals("",[{title:"Chlorine reaction map",kind:"reaction",description:"Original book",chapter:"The p-Block Elements",page:2,storage_path:"book.pdf.page-2.jpg",aspect:.7,crop:{x:0,y:0,width:1,height:1}}],{chapter:"The p-Block Elements",visuals_checked:true}));
    mock.extract.mockImplementation(async(_file,_progress,options)=>{await options.recognizePage("image",1,.7);expect(order).toEqual([]);await options.recognizePage("image",2,.7);expect(order).toEqual(["attached"]);return {numPages:2};});
    mock.finish.mockImplementation(async()=>{order.push("finished");return {pages:2,figures:1,chapters:1};});
    try {
      await prepareScannedReferenceBooks("12","Chemistry",()=>{},()=>false,async()=>{order.push("attached");});
      expect(order).toEqual(["attached","finished"]);
      expect(mock.paid).not.toHaveBeenCalled();
      expect(mock.recognize).toHaveBeenCalledTimes(2);
      expect(mock.close).toHaveBeenCalledTimes(1);
    } finally {vi.unstubAllGlobals();}
  });
});

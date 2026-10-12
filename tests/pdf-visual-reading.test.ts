import { describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(()=>({ render:vi.fn(()=>({promise:Promise.resolve()})) }));
vi.mock("pdfjs-dist",()=>({GlobalWorkerOptions:{},getDocument:()=>({destroy:async()=>{},promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:"Readable text covering more than one hundred characters must not cause the original reaction schemes, diagrams, labelled anatomy or graphs on this page to be skipped."}]}),getViewport:()=>({width:1000,height:1400}),render:fixture.render})})})}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url",()=>({default:"/mock-worker.js"}));
import { extractPdfText } from "@/lib/pdf-extract";
describe("Med Easy whole-page screenshot inspection",()=>{
  it("renders and inspects text-rich pages when requested, and resumes completed pages",async()=>{
    const image=vi.spyOn(HTMLCanvasElement.prototype,"toDataURL").mockReturnValue("data:image/jpeg;base64,fixture");
    const recognize=vi.fn(async()=>"Source text with saved diagram metadata.");
    const file={arrayBuffer:async()=>new ArrayBuffer(1)} as Blob;
    const result=await extractPdfText(file,undefined,{recognizePage:recognize,inspectEveryPage:true});
    expect(recognize).toHaveBeenCalledWith("data:image/jpeg;base64,fixture",1,1000/1400,expect.stringContaining("Readable text"));
    expect(result.pages[0].text).toBe("Source text with saved diagram metadata.");
    recognize.mockClear();
    await extractPdfText(file,undefined,{recognizePage:recognize,inspectEveryPage:true,savedPages:new Map([[1,"Saved completed page"]])});
    expect(recognize).not.toHaveBeenCalled();
    await extractPdfText(file,undefined,{recognizePage:recognize});
    expect(recognize).not.toHaveBeenCalled();
    image.mockRestore();
  });
});

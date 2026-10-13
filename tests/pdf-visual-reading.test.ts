import { describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(()=>({pages:1, render:vi.fn(()=>({promise:Promise.resolve()})) }));
vi.mock("pdfjs-dist",()=>({GlobalWorkerOptions:{},getDocument:()=>({destroy:async()=>{},promise:Promise.resolve({numPages:fixture.pages,getPage:async()=>({getTextContent:async()=>({items:[{str:"Readable text covering more than one hundred characters must not cause the original reaction schemes, diagrams, labelled anatomy or graphs on this page to be skipped."}]}),getViewport:()=>({width:1000,height:1400}),render:fixture.render})})})}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url",()=>({default:"/mock-worker.js"}));
import { extractPdfText } from "@/lib/pdf-extract";
describe("Med Easy whole-page screenshot inspection",()=>{
  it('reuses saved contents and chapter text without OCR',async()=>{
    fixture.pages=6;const recognizeIndex=vi.fn(),recognizePage=vi.fn();
    try{await extractPdfText({arrayBuffer:async()=>new ArrayBuffer(1)} as Blob,undefined,{chapterOnly:true,priorityChapter:{subject:'Chemistry',chapter:'Electrochemistry'},inspectEveryPage:true,recognizeIndex,recognizePage,savedPages:new Map([[2,'1. Electrochemistry 1-2\n2. Chemical Kinetics 3-4'],[3,'Electrochemistry\nDaniell cell.'],[4,'Conducting cell topic text.']])});
      expect(recognizeIndex).not.toHaveBeenCalled();expect(recognizePage).not.toHaveBeenCalled();
    }finally{fixture.pages=1;}
  });
  it('reads only verified chapter pages, never the rest of the PDF',async()=>{
    fixture.pages=6;const image=vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,fixture');
    const inspected:number[]=[];
    try{
      const result=await extractPdfText({arrayBuffer:async()=>new ArrayBuffer(1)} as Blob,undefined,{chapterOnly:true,priorityChapter:{subject:'Chemistry',chapter:'Electrochemistry'},inspectEveryPage:true,recognizeIndex:async(_image,_native,page)=>page===2?'1. Electrochemistry 1-2\n2. Chemical Kinetics 3-4':page===3?'Electrochemistry\nDaniell cell.':'Unrelated page',recognizePage:async(_image,page)=>{inspected.push(page);return 'Saved chapter picture';}});
      expect(inspected).toEqual([3,4]);expect(result.numPages).toBe(6);
    }finally{fixture.pages=1;image.mockRestore();}
  });
  it('does not fall back to a whole-book scan if the chapter cannot be verified',async()=>{
    const recognize=vi.fn();
    await expect(extractPdfText({arrayBuffer:async()=>new ArrayBuffer(1)} as Blob,undefined,{chapterOnly:true,priorityChapter:{subject:'Physics',chapter:'Capacitance'},recognizeIndex:async()=>'',recognizePage:recognize})).rejects.toThrow('no whole-book scan');
    expect(recognize).not.toHaveBeenCalled();
  });
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

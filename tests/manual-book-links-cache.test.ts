import { describe, it, expect, vi, afterEach } from "vitest";
import { cachedManualBookLinks } from "@/lib/manual-book-links-cache";
const f=vi.hoisted(()=>({load:vi.fn()}));
vi.mock("@/lib/manual-book-links.functions",()=>({loadManualBookLinks:f.load}));
afterEach(()=>{vi.useRealTimers();f.load.mockReset();});
const input={klass:"12",subject:"Physics",chapter:"Moving Charges and Magnetism",topic:"Biot-Savart"};
describe("Fast repeated chapter-page lookups",()=>{
  it("shares in-flight requests and fresh results between slide panels",async()=>{
    f.load.mockResolvedValue([{id:"book",pages:[{page:209,topic:true}]}]);
    const one=cachedManualBookLinks(input),two=cachedManualBookLinks(input);
    expect(one).toBe(two);await one;await cachedManualBookLinks(input);
    expect(f.load).toHaveBeenCalledOnce();
  });
  it("rechecks unindexed results quickly so completed preparation appears",async()=>{
    vi.useFakeTimers();const data={...input,topic:"new index"};
    f.load.mockResolvedValueOnce([{id:"book",pages:[]}]).mockResolvedValueOnce([{id:"book",pages:[{page:209,topic:false}]}]);
    await cachedManualBookLinks(data);vi.advanceTimersByTime(5001);
    expect((await cachedManualBookLinks(data))[0].pages).toHaveLength(1);
    expect(f.load).toHaveBeenCalledTimes(2);
  });
  it("does not retain failed lookups or mix chapters",async()=>{
    const data={...input,chapter:"Current Electricity"};f.load.mockRejectedValueOnce(new Error("temporary")).mockResolvedValueOnce([]);
    await expect(cachedManualBookLinks(data)).rejects.toThrow("temporary");
    await expect(cachedManualBookLinks(data)).resolves.toEqual([]);expect(f.load).toHaveBeenCalledTimes(2);
  });
});

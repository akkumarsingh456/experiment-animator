import { describe, expect, it, vi } from "vitest";
import { retryBookRead } from "@/lib/book-read-recovery";
describe("Interrupted book reading",()=>{
  it("recovers a cancelled response by reusing the saved page on retry",async()=>{
    vi.useFakeTimers();
    try {
      const read=vi.fn().mockRejectedValueOnce({message:"Client cancelled"}).mockResolvedValue("saved page and original screenshot");
      const result=retryBookRead(read,{label:"Page 10"});
      await vi.runAllTimersAsync();
      expect(await result).toBe("saved page and original screenshot");
      expect(read).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); }
  });
  it("honours a pause during an interrupted request without retrying",async()=>{
    let paused=false;
    const read=vi.fn(async()=>{paused=true;throw new Error("Client cancelled");});
    await expect(retryBookRead(read,{label:"Page 10",stopped:()=>paused})).rejects.toThrow("paused");
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("does not retry an access or source error",async()=>{
    const read=vi.fn().mockRejectedValue(new Error("Access denied"));
    await expect(retryBookRead(read,{label:"Page 10"})).rejects.toThrow("Access denied");
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("stops after two recovery attempts and explains how to resume",async()=>{
    vi.useFakeTimers();
    try {
      const read=vi.fn().mockRejectedValue(new Error("Client cancelled"));
      const outcome=retryBookRead(read,{label:"Page 10"}).catch(error=>error);
      await vi.runAllTimersAsync();
      expect((await outcome).message).toContain("Read / resume");
      expect(read).toHaveBeenCalledTimes(3);
    } finally { vi.useRealTimers(); }
  });
});

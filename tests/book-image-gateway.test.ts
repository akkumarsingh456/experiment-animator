import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBookImageResponse, readBookImageJSON } from "@/lib/book-image-gateway";
const page = { text: "", chapter: "", visuals: [] };
const output = JSON.stringify(page);
const stream = (...events: unknown[]) => new Response(events.map(event => `data: ${JSON.stringify(event)}`).join("\r\n\r\n"), { headers: { "content-type": "text/event-stream" } });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("original book image reader", () => {
  it("accepts a cover page with no text or figures in a CRLF stream without a trailing newline", async () => {
    expect(await parseBookImageResponse(stream({type:"response.output_text.done",text:output}))).toEqual(page);
  });
  it("accepts a response completed event without text delta events", async () => {
    expect(await parseBookImageResponse(stream({type:"response.completed",response:{status:"completed",output:[{type:"message",content:[{type:"output_text",text:output}]}]}}))).toEqual(page);
  });
  it("handles chunk boundaries inside JSON and CRLF", async () => {
    const bytes = new TextEncoder().encode(`data: ${JSON.stringify({type:"response.output_text.delta",delta:output})}\r\n\r\ndata: [DONE]`);
    const body = new ReadableStream({start(controller){for(const byte of bytes) controller.enqueue(Uint8Array.of(byte));controller.close();}});
    expect(await parseBookImageResponse(new Response(body))).toEqual(page);
  });
  it("rejects failed or incomplete streams even when a partial JSON value is present", async () => {
    await expect(parseBookImageResponse(stream({type:"response.output_text.done",text:output},{type:"response.failed"}))).rejects.toThrow("incomplete response");
  });
  it("rejects refusals instead of generating replacement artwork", async () => {
    await expect(parseBookImageResponse(stream({type:"response.refusal.done"}))).rejects.toThrow("No substitute image");
  });
  it.each([[401,"access was denied"],[402,"credits"],[429,"busy"],[503,"connection failed"]])("reports actionable HTTP %s failures without exposing upstream content", async (status,message) => {
    vi.stubEnv("LOVABLE_API_KEY","test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private upstream body",{status:Number(status)})));
    await expect(readBookImageJSON({prompt:"Inspect page",schemaName:"page",schema:{},images:[]})).rejects.toThrow(String(message));
  });
});

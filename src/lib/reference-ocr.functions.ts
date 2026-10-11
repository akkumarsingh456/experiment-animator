import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const saveExtractedReferencePage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ book_id: z.string().uuid(), page: z.number().int().positive(), text: z.string().max(100_000) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: chunkError } = await supabaseAdmin.from("ncert_chunks").upsert({ book_id: data.book_id, chunk_index: data.page - 1, content: data.text }, { onConflict: "book_id,chunk_index" });
    if (chunkError) throw new Error(chunkError.message);
    const { error } = await supabaseAdmin.from("ncert_pages").upsert({ book_id: data.book_id, page_number: data.page, text: "[SOURCE_OCR_PAGE]\n" + data.text }, { onConflict: "book_id,page_number" });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const readScannedPage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ image: z.string().max(8_000_000).regex(/^data:image\/jpeg;base64,/), page: z.number().int().positive(), book_id: z.string().uuid().optional() }).parse(raw))
  .handler(async ({ data }) => {
    const { gatewayJSON, hasGatewayKey } = await import("@/lib/ai-gateway-json");
    if (!hasGatewayKey()) throw new Error("Scanned-book reading is unavailable. Configure the website’s AI connection to read these handwritten pages.");
    const out = await gatewayJSON<{ text: string }>({
      images: [data.image], schemaName: "source_page_transcription",
      schema: { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string" } } },
      prompt: "Transcribe this uploaded textbook page faithfully. Preserve the original wording and paragraph order. Typeset clearly readable mathematical symbols with inline $...$ or display $$...$$ LaTeX, retaining matrix rows and columns. Never solve, summarise, add facts or invent missing notation. Omit advertisements, watermarks and unreadable fragments. Return empty text for an illustration-only or cover page. Return JSON with text only.",
    });
    if (!out || typeof out.text !== "string") throw new Error(`Could not read scanned page ${data.page}. Try again; already read pages are retained.`);
    if (data.book_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: chunkError } = await supabaseAdmin.from("ncert_chunks").upsert({ book_id: data.book_id, chunk_index: data.page - 1, content: out.text }, { onConflict: "book_id,chunk_index" });
      if (chunkError) throw new Error(chunkError.message);
      const { error } = await supabaseAdmin.from("ncert_pages").upsert({ book_id: data.book_id, page_number: data.page, text: "[SOURCE_OCR_PAGE]\n" + out.text }, { onConflict: "book_id,page_number" });
      if (error) throw new Error(error.message);
    }
    return out.text;
  });

export const finishReferenceReading = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ book_id: z.string().uuid(), num_pages: z.number().int().positive() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pages, error } = await supabaseAdmin.from("ncert_pages").select("page_number,text").eq("book_id", data.book_id).order("page_number").limit(1000);
    if (error) throw new Error(error.message);
    if (!pages || pages.length !== data.num_pages || pages.some((page, index) => page.page_number !== index + 1 || !page.text.startsWith("[SOURCE_OCR_PAGE]\n"))) throw new Error("The book has unread pages; extraction will resume next time.");
    const full = pages.map(page => page.text.replace(/^\[SOURCE_OCR_PAGE\]\n/, "")).join("\n\n");
    if (full.trim().length < data.num_pages * 100) throw new Error("Not enough readable notes were recovered. The original PDF is retained for review.");
    const { error: updateError } = await supabaseAdmin.from("ncert_books").update({ full_text: full.slice(0, 1_000_000), num_chunks: pages.length, status: "ready" }).eq("id", data.book_id);
    if (updateError) throw new Error(updateError.message);
    return { pages: pages.length };
  });

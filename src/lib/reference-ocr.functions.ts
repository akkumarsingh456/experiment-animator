import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { encodeReferenceVisuals, splitReferenceContent, type ReferenceVisual } from "@/lib/reference-visuals";

export const saveExtractedReferencePage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ book_id: z.string().uuid(), page: z.number().int().positive(), text: z.string().max(100_000) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pageContent = encodeReferenceVisuals(data.text, [], { chapter: "" });
    const { error: chunkError } = await supabaseAdmin.from("ncert_chunks").upsert({ book_id: data.book_id, chunk_index: data.page - 1, content: pageContent }, { onConflict: "book_id,chunk_index" });
    if (chunkError) throw new Error(chunkError.message);
    const { error } = await supabaseAdmin.from("ncert_pages").upsert({ book_id: data.book_id, page_number: data.page, text: "[SOURCE_OCR_PAGE]\n" + pageContent }, { onConflict: "book_id,page_number" });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const readScannedPage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ image: z.string().max(8_000_000).regex(/^data:image\/jpeg;base64,/), page: z.number().int().positive(), book_id: z.string().uuid().optional(), source_path: z.string().max(500).regex(/^[a-zA-Z0-9_./-]+\.pdf$/i).refine(path => !path.includes(".."), "Invalid source path").optional(), aspect: z.number().positive().max(5).optional(), chapter_hint: z.string().max(200).optional() }).parse(raw))
  .handler(async ({ data }) => {
    const { gatewayJSON, hasGatewayKey } = await import("@/lib/ai-gateway-json");
    if (!hasGatewayKey()) throw new Error("Scanned-book reading is unavailable. Configure the website’s AI connection to read these handwritten pages.");
    const out = await gatewayJSON<{ text: string; chapter: string; visuals: Array<{ title: string; kind: "reaction" | "structure" | "diagram"; description: string; x: number; y: number; width: number; height: number }> }>({
      images: [data.image], schemaName: "source_page_transcription",
      schema: { type: "object", additionalProperties: false, required: ["text", "chapter", "visuals"], properties: { text: { type: "string" }, chapter: { type: "string" }, visuals: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "kind", "description", "x", "y", "width", "height"], properties: { title: { type: "string" }, kind: { type: "string", enum: ["reaction", "structure", "diagram"] }, description: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } } } } } },
      prompt: "Transcribe this uploaded textbook page faithfully. Preserve the original wording and paragraph order. Typeset clearly readable mathematical symbols with inline $...$ or display $$...$$ LaTeX, retaining matrix rows and columns. Never solve, summarise, add facts or invent missing notation. Omit advertisements, watermarks and unreadable fragments. Return empty text for an illustration-only or cover page. Also locate up to six useful reaction schemes, organic molecular structures, inorganic geometries, apparatus diagrams, physics graphs, Botany and Zoology labelled anatomy, life cycles, classification charts, comparison panels, processes and complete mind maps. For each supply a short topic title, kind, a faithful description of its visible labels and bounding box x/y/width/height in fractions of the full image (0–1). Include all bonds, charges, arrows, reagents and conditions inside the box with a little padding. Never reconstruct an unreadable structure. Keep paragraphs separated by blank lines. Do not describe a normal prose paragraph as a diagram. Biology crops must include every visible label, legend, stage and connecting arrow. A complete Botany or Zoology process map belongs in one crop. All four Med Easy books cover Classes 11 and 12; identify the actual page chapter rather than relying on the book upload class tag. Keep a complete reaction map together: include its central compound, every branch, product structure, named reaction, reagent, condition and comparison panel in one crop; do not split its branches into separate figures. Use descriptive topic titles such as Chlorine reaction map or Haloalkane reaction pathways rather than generic Chemical properties. Return a separate chapter indexing field using the corresponding standard NCERT chapter name when confidently identifiable; otherwise an empty string. This metadata must never replace or rewrite the transcribed source text. For a continuation page with no new chapter heading, the previous chapter hint may help; a visible new chapter takes precedence. Return JSON text, chapter and visuals. Previous chapter hint: " + (data.chapter_hint || "none"),
    });
    if (!out || typeof out.text !== "string") throw new Error(`Could not read scanned page ${data.page}. Try again; already read pages are retained.`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let sourcePath = data.source_path;
    if (data.book_id) {
      const { data: book, error } = await supabaseAdmin.from("ncert_books").select("storage_path").eq("id", data.book_id).single();
      if (error) throw new Error(error.message);
      sourcePath = book.storage_path;
    }
    const visuals: ReferenceVisual[] = (out.visuals || []).slice(0, 6).filter(v => v.x >= 0 && v.y >= 0 && v.width > .05 && v.height > .05 && v.x + v.width <= 1.001 && v.y + v.height <= 1.001).map(v => ({
      title: v.title, kind: v.kind, description: v.description, page: data.page, book_id: data.book_id, chapter: (out.chapter || "").slice(0, 200),
      aspect: data.aspect || .707, storage_path: sourcePath ? `${sourcePath}.page-${data.page}.jpg` : "",
      crop: { x: v.x, y: v.y, width: v.width, height: v.height },
    })).filter(v => !!v.storage_path);
    if (visuals.length) {
      // Keep the bucket's access rules and existing file types; allow page JPEGs too.
      const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket("ncert-pdfs");
      if (bucketError) throw new Error(`Could not prepare book figures: ${bucketError.message}`);
      if (bucket.allowed_mime_types?.length && !bucket.allowed_mime_types.some(type => type === "image/jpeg" || type === "image/*" || type === "*/*")) {
        const { error } = await supabaseAdmin.storage.updateBucket("ncert-pdfs", { public: bucket.public, allowedMimeTypes: [...bucket.allowed_mime_types, "image/jpeg"], fileSizeLimit: bucket.file_size_limit ?? undefined });
        if (error) throw new Error(`Could not save book figures: ${error.message}`);
      }
      const bytes = Uint8Array.from(atob(data.image.split(",")[1]), c => c.charCodeAt(0));
      const { error } = await supabaseAdmin.storage.from("ncert-pdfs").upload(visuals[0].storage_path, bytes, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(error.message);
    }
    const pageContent = encodeReferenceVisuals(out.text, visuals, { chapter: (out.chapter || "").slice(0, 200), visuals_checked: true });
    if (data.book_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: chunkError } = await supabaseAdmin.from("ncert_chunks").upsert({ book_id: data.book_id, chunk_index: data.page - 1, content: pageContent }, { onConflict: "book_id,chunk_index" });
      if (chunkError) throw new Error(chunkError.message);
      const { error } = await supabaseAdmin.from("ncert_pages").upsert({ book_id: data.book_id, page_number: data.page, text: "[SOURCE_OCR_PAGE]\n" + pageContent }, { onConflict: "book_id,page_number" });
      if (error) throw new Error(error.message);
    }
    return pageContent;
  });

export const finishReferenceReading = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ book_id: z.string().uuid(), num_pages: z.number().int().positive() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pages, error } = await supabaseAdmin.from("ncert_pages").select("page_number,text").eq("book_id", data.book_id).order("page_number").limit(1000);
    if (error) throw new Error(error.message);
    if (!pages || pages.length !== data.num_pages || pages.some((page, index) => page.page_number !== index + 1 || !page.text.startsWith("[SOURCE_OCR_PAGE]\n"))) throw new Error("The book has unread pages; extraction will resume next time.");
    const recovered = pages.map(page => splitReferenceContent(page.text.replace(/^\[SOURCE_OCR_PAGE\]\n/, "")));
    if (recovered.some(page => page.context?.visuals_checked !== true)) throw new Error("Some pages have not been inspected for diagrams; resume book reading to include their screenshots.");
    const figures = recovered.reduce((sum, page) => sum + page.visuals.length, 0);
    const chapters = new Set(recovered.map(page => page.context?.chapter).filter(Boolean)).size;
    const full = recovered.map(page => page.text).join("\n\n");
    if (full.trim().length < data.num_pages * 100 && !figures) throw new Error("Not enough readable notes were recovered. The original PDF is retained for review.");
    const { error: updateError } = await supabaseAdmin.from("ncert_books").update({ full_text: full.slice(0, 1_000_000), num_chunks: pages.length, status: "ready" }).eq("id", data.book_id);
    if (updateError) throw new Error(updateError.message);
    return { pages: pages.length, figures, chapters };
  });

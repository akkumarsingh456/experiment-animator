import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { combinedReferenceSubject } from "@/lib/reference-books";
import { indexLocalBookPage } from "@/lib/local-book-index";
import { encodeReferenceVisuals, splitReferenceContent, type ReferenceVisual } from "@/lib/reference-visuals";

/** Save an exact PDF raster and locally read indexing metadata. No AI gateway. */
export const saveCapturedReferencePage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({
    image: z.string().max(8_000_000).regex(/^data:image\/jpeg;base64,/),
    page: z.number().int().positive(), aspect: z.number().positive().max(5),
    text: z.string().max(100_000), book_id: z.string().uuid().optional(),
    source_path: z.string().max(500).regex(/^[a-zA-Z0-9_./-]+\.pdf$/i).refine(path => !path.includes("..")).optional(),
    source_file_name: z.string().max(500).optional(), chapter_hint: z.string().max(200).optional(),
  }).refine(data => !!data.book_id || (!!data.source_path && !!data.source_file_name), "A source book is required").parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let sourcePath = data.source_path;
    let fileName = data.source_file_name || "";
    if (data.book_id) {
      const { data: book, error } = await supabaseAdmin.from("ncert_books").select("storage_path,file_name").eq("id", data.book_id).single();
      if (error || !book) throw new Error(error?.message || "The uploaded book was not found.");
      sourcePath = book.storage_path;
      fileName = book.file_name;
      const { data: saved, error: savedError } = await supabaseAdmin.from("ncert_pages").select("text").eq("book_id", data.book_id).eq("page_number", data.page).maybeSingle();
      if (savedError) throw new Error(savedError.message);
      if (saved?.text.startsWith("[SOURCE_OCR_PAGE]\n") && splitReferenceContent(saved.text).context?.visuals_checked) return saved.text.replace(/^\[SOURCE_OCR_PAGE\]\n/, "");
    }
    const subject = combinedReferenceSubject({ file_name: fileName });
    if (!subject || !sourcePath) throw new Error("Free book pictures are available for your uploaded Med Easy PDFs.");
    const index = indexLocalBookPage(subject, data.text, data.chapter_hint);
    const imagePath = `${sourcePath}.page-${data.page}.jpg`;
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket("ncert-pdfs");
    if (bucketError) throw new Error(`Could not prepare book pictures: ${bucketError.message}`);
    if (bucket.allowed_mime_types?.length && !bucket.allowed_mime_types.some(type => ["image/jpeg", "image/*", "*/*"].includes(type))) {
      const { error } = await supabaseAdmin.storage.updateBucket("ncert-pdfs", {
        public: bucket.public, allowedMimeTypes: [...bucket.allowed_mime_types, "image/jpeg"], fileSizeLimit: bucket.file_size_limit ?? undefined,
      });
      if (error) throw new Error(error.message);
    }
    const bytes = Uint8Array.from(atob(data.image.split(",")[1]), character => character.charCodeAt(0));
    const { error: imageError } = await supabaseAdmin.storage.from("ncert-pdfs").upload(imagePath, bytes, { contentType: "image/jpeg", upsert: true });
    if (imageError) throw new Error(imageError.message);
    const visuals: ReferenceVisual[] = !index.needsReview && index.chapter ? [{
      title: `${index.chapter} — original book page`, kind: "diagram", description: "Original Med Easy page. All equations, structures, arrows and labels are preserved.",
      page: data.page, book_id: data.book_id, chapter: index.chapter, storage_path: imagePath,
      aspect: data.aspect, crop: { x: 0, y: 0, width: 1, height: 1 }, capture: "page", match_text: index.matchText,
    }] : [];
    // Index text stays in picture metadata, never in the lesson's note paragraphs.
    const content = encodeReferenceVisuals("", visuals, { chapter: index.chapter, visuals_checked: true, reader: "local", capture_saved: true, needs_review: index.needsReview });
    if (data.book_id) {
      const { error: chunkError } = await supabaseAdmin.from("ncert_chunks").upsert({ book_id: data.book_id, chunk_index: data.page - 1, content }, { onConflict: "book_id,chunk_index" });
      if (chunkError) throw new Error(chunkError.message);
      const { error } = await supabaseAdmin.from("ncert_pages").upsert({ book_id: data.book_id, page_number: data.page, text: "[SOURCE_OCR_PAGE]\n" + content }, { onConflict: "book_id,page_number" });
      if (error) throw new Error(error.message);
    }
    return content;
  });

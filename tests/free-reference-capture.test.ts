import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveCapturedReferencePage } from "@/lib/reference-capture.functions";
import { finishReferenceReading } from "@/lib/reference-ocr.functions";
import { encodeReferenceVisuals, splitReferenceContent } from "@/lib/reference-visuals";

const fixture = vi.hoisted(() => ({
  fileName: "PHYSICS MED EASY.pdf", saved: null as { text: string } | null,
  upload: vi.fn(), updateBucket: vi.fn(), upsert: vi.fn(), update: vi.fn(), paidReader: vi.fn(), pages: [] as Array<{ page_number: number; text: string }>,
}));
vi.mock("@/lib/library-auth",()=>({requireLibraryAdmin:{}}));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ middleware(){return this}, inputValidator: (parse: (data: unknown) => unknown) => ({
  handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) => handler({ data: parse(options.data) }),
}) }) }));
vi.mock("@/lib/book-image-gateway", () => ({ readBookImageJSON: fixture.paidReader }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  storage: {
    getBucket: async () => ({ data: { public: false, allowed_mime_types: ["application/pdf"], file_size_limit: 10000000 }, error: null }),
    updateBucket: fixture.updateBucket,
    from: () => ({ upload: fixture.upload }),
  },
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, order: () => query,
      single: async () => ({ data: { file_name: fixture.fileName, storage_path: "Books/med-easy.pdf", subject: "Physics", class: "Class 12", chapter: "Current Electricity" }, error: null }),
      maybeSingle: async () => ({ data: fixture.saved, error: null }),
      limit: async () => ({ data: fixture.pages, error: null }),
      upsert: fixture.upsert, update: fixture.update,
    };
    return query;
  },
} }));

const source = { book_id: "11111111-1111-4111-8111-111111111111", page: 1, aspect: .7, image: "data:image/jpeg;base64,anBlZw==" };
describe("Saving original book pictures without paid AI", () => {
  beforeEach(() => {
    vi.clearAllMocks(); fixture.fileName = "PHYSICS MED EASY.pdf"; fixture.saved = null; fixture.pages = [];
    fixture.upload.mockResolvedValue({ error: null }); fixture.updateBucket.mockResolvedValue({ error: null });
    fixture.upsert.mockResolvedValue({ error: null }); fixture.update.mockReturnValue({ eq: async () => ({ error: null }) });
  });
  it("saves exact page bytes and matching metadata with no AI connection or credits", async () => {
    const content = await saveCapturedReferencePage({ data: { ...source, text: "Current Electricity\nOhm's Law\nVoltage and current have a proportional relationship at constant temperature." } });
    const parsed = splitReferenceContent(content);
    expect(parsed.text).toBe("");
    expect(parsed.context).toMatchObject({ reader: "local", capture_saved: true, chapter: "Current Electricity" });
    expect(parsed.visuals[0]).toMatchObject({ capture: "page", crop: { x: 0, y: 0, width: 1, height: 1 }, storage_path: "Books/med-easy.pdf.page-1.jpg" });
    expect(fixture.upload.mock.calls[0][1]).toEqual(Uint8Array.from([106,112,101,103]));
    expect(fixture.updateBucket.mock.calls[0][1].public).toBe(false);
    expect(fixture.paidReader).not.toHaveBeenCalled();
    expect(fixture.upsert).toHaveBeenCalledTimes(2);
  });
  it("reuses an existing checkpoint without replacing saved pictures", async () => {
    const saved = encodeReferenceVisuals("Approved source text", [], { chapter: "Current Electricity", visuals_checked: true, index_version: 2, reader: "local", capture_saved: true });
    fixture.saved = { text: "[SOURCE_OCR_PAGE]\n" + saved };
    expect(await saveCapturedReferencePage({ data: { ...source, text: "new text" } })).toBe(saved);
    expect(fixture.upload).not.toHaveBeenCalled(); expect(fixture.paidReader).not.toHaveBeenCalled();
  });
  it("retains unreadable original pages for review and can complete the book", async () => {
    const content = await saveCapturedReferencePage({ data: { ...source, text: "" } });
    expect(splitReferenceContent(content).visuals).toEqual([]);
    expect(splitReferenceContent(content).context).toMatchObject({ needs_review: true, capture_saved: true });
    expect(fixture.upload).toHaveBeenCalledTimes(1);
    fixture.pages = [{ page_number: 1, text: "[SOURCE_OCR_PAGE]\n" + content }];
    expect(await finishReferenceReading({ data: { book_id: source.book_id, num_pages: 1 } })).toMatchObject({ pages: 1, figures: 0, unmatchedPages: 1 });
    fixture.pages.push({ page_number: 2, text: "[SOURCE_OCR_PAGE]\n" + encodeReferenceVisuals("", [], { chapter: "", visuals_checked: true }) });
    expect(await finishReferenceReading({ data: { book_id: source.book_id, num_pages: 2 } })).toMatchObject({ pages: 2, unmatchedPages: 1 });
    expect(fixture.paidReader).not.toHaveBeenCalled();
  });
  it("adds NCERT screenshots without overwriting existing source text or retrieval chunks", async () => {
    fixture.fileName = "NCERT_CLASS_12_PHYSICS.pdf";
    fixture.saved = { text: "Original approved textbook paragraph." };
    const content = await saveCapturedReferencePage({ data: { ...source, text: "Current Electricity\nOhm's Law relates voltage and current in conductors." } });
    expect(splitReferenceContent(content).text).toBe("Original approved textbook paragraph.");
    expect(splitReferenceContent(content).visuals).toHaveLength(1);
    expect(fixture.upload).toHaveBeenCalledTimes(1);
    expect(fixture.upsert).toHaveBeenCalledTimes(1);
  });
});

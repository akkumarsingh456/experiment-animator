import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "ncert-pdfs";

export const createUploadTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ path: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ticket, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(data.path);
    if (error || !ticket) throw new Error(error?.message || "Failed to create upload ticket");
    return { path: data.path, token: ticket.token, signedUrl: ticket.signedUrl };
  });

export const signDownload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ path: z.string().min(1), expiresIn: z.number().int().positive().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(data.path, data.expiresIn ?? 60 * 60 * 24 * 365);
    if (error || !signed) throw new Error(error?.message || "Failed to sign download URL");
    return { signedUrl: signed.signedUrl };
  });

export const insertBook = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        klass: z.string().min(1),
        subject: z.string().min(1),
        chapter: z.string().min(1),
        file_name: z.string().min(1),
        file_size: z.number().int().nonnegative(),
        storage_path: z.string().min(1),
        download_url: z.string().nullable().optional(),
        num_pages: z.number().int().nonnegative(),
        num_chunks: z.number().int().nonnegative(),
        full_text: z.string().default(""),
        learner_name: z.string().nullable().optional(),
        learner_goal: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ncert_books")
      .insert({
        class: data.klass,
        subject: data.subject,
        chapter: data.chapter,
        file_name: data.file_name,
        file_size: data.file_size,
        storage_path: data.storage_path,
        download_url: data.download_url ?? null,
        num_pages: data.num_pages,
        num_chunks: data.num_chunks,
        full_text: (data.full_text || "").slice(0, 1_000_000),
        learner_name: data.learner_name ?? null,
        learner_goal: data.learner_goal ?? null,
        status: "ready",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message || "Failed to insert book");
    return { id: row.id as string };
  });

export const insertPages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        book_id: z.string().uuid(),
        pages: z
          .array(
            z.object({
              page_number: z.number().int().positive(),
              text: z.string(),
            }),
          )
          .max(500),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.pages.map((p) => ({
      book_id: data.book_id,
      page_number: p.page_number,
      text: p.text,
    }));
    const { error } = await supabaseAdmin.from("ncert_pages").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

export const insertChunks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        book_id: z.string().uuid(),
        start_index: z.number().int().nonnegative(),
        chunks: z.array(z.string()).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.chunks.map((content, j) => ({
      book_id: data.book_id,
      chunk_index: data.start_index + j,
      content,
    }));
    const { error } = await supabaseAdmin.from("ncert_chunks").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

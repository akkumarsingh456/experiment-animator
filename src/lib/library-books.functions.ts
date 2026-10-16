import { createServerFn } from "@tanstack/react-start";

/** Public, read-only catalogue. Uploads and source changes use separate admin handlers. */
export const listLibraryBooks = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data, error } = await db.from("ncert_books")
    .select("id,class,subject,chapter,file_name,file_size,storage_path,num_pages,num_chunks,status,created_at")
    .order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error("The uploaded books could not be loaded. Please retry.");
  return { books: data || [] };
});

import { socialLibraryMetadata } from "@/lib/social-science-chapters";
import { createServerFn } from "@tanstack/react-start";

export type LibraryBook = {id:string; class:string; subject:string; chapter:string; file_name:string; file_size:number; storage_path:string; num_pages:number; num_chunks:number; status:string; created_at:string};

/** Public, read-only catalogue. Uploads and source changes use separate admin handlers. */
export const listLibraryBooks = createServerFn({ method: "POST" }).handler(async (): Promise<{books:LibraryBook[]}> => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data, error } = await db.from("ncert_books")
    .select("id,class,subject,chapter,file_name,file_size,storage_path,num_pages,num_chunks,status,created_at")
    .order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error("The uploaded books could not be loaded. Please retry.");
  return { books: ((data || []) as LibraryBook[]).map(book=>socialLibraryMetadata(book)) };
});

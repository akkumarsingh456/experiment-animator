import { resolveNcertLessonBook } from "@/lib/ncert-lesson-reader.server";
const cache = new Map<string,{url:string;expires:number}>();
export async function streamNcertLessonPdf(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "", klass = params.get("klass") || "", subject = params.get("subject") || "", chapter = params.get("chapter") || "";
  if (!id || id.length > 100 || !klass || klass.length > 30 || !subject || subject.length > 100 || !chapter || chapter.length > 300)
    return new Response("Invalid textbook request", { status: 400 });
  const range = request.headers.get("range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return new Response("Invalid PDF byte range", { status: 400 });
  try {
    const book = await resolveNcertLessonBook({ klass, subject, chapter });
    if (!book || book.id !== id) return new Response("No exact chapter-matched textbook is available", { status: 404 });
    const key = JSON.stringify({ id, klass, subject, chapter });
    let signed = cache.get(key);
    if (!signed || signed.expires < Date.now()) {
      const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
      const result = await db.storage.from("ncert-pdfs").createSignedUrl(book.storagePath, 300);
      if (!result.data?.signedUrl) return new Response("Textbook PDF is unavailable", { status: 404 });
      signed = { url: result.data.signedUrl, expires: Date.now() + 120000 };
      cache.set(key, signed);
      if (cache.size > 24) cache.delete(cache.keys().next().value!);
    }
    const headers = new Headers({ "Accept-Encoding": "identity" });
    if (range) headers.set("Range", range);
    const upstream = await fetch(signed.url, { method: request.method === "HEAD" ? "HEAD" : "GET", headers, signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]) });
    if (!upstream.ok && upstream.status !== 416) { cache.delete(key); return new Response("Textbook PDF could not be streamed", { status: 502 }); }
    const outgoing = new Headers({ "Content-Type": "application/pdf", "Cache-Control": "private, max-age=120", "Accept-Ranges": "bytes" });
    for (const name of ["content-length","content-range","accept-ranges"]) { const value = upstream.headers.get(name); if (value) outgoing.set(name,value); }
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: outgoing });
  } catch { return new Response("Textbook PDF connection failed", { status: 502 }); }
}

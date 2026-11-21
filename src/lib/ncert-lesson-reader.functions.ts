import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export const findNcertLessonBook = createServerFn({ method: "POST" })
 .inputValidator((raw: unknown) => z.object({ klass:z.string().min(1).max(30), subject:z.string().min(1).max(100), chapter:z.string().min(1).max(300) }).parse(raw))
 .handler(async ({data}) => {
  const {resolveNcertLessonBook}=await import("@/lib/ncert-lesson-reader.server");
  const book=await resolveNcertLessonBook(data);
  return book ? {id:book.id,name:book.name,signedUrl:book.signedUrl,chapterPage:book.chapterPage,contentsPage:book.contentsPage,printedPage:book.printedPage} : null;
 });

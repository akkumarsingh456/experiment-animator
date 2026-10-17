import { socialLibraryMetadata, socialRevisionChapter, SOCIAL_REFERENCE_PATTERN } from "@/lib/social-science-chapters";
import { REF_BOOK_PATTERN } from "@/lib/reference-books";
import { isSourceLibrarySetupError, sourceLibraryError } from "@/lib/source-library-errors";

export type LessonTextbook = {
  id: string; class: string; subject: string; chapter: string; file_name: string;
  source_kind?: string | null;
};

/** Classification selects note sources; it is not a login or retrospective approval gate. */
export function isLessonTextbook(book: Pick<LessonTextbook, "file_name" | "chapter" | "source_kind">): boolean {
  if (book.source_kind === "reference" || SOCIAL_REFERENCE_PATTERN.test(`${book.file_name} ${book.chapter}`.replace(/_/g," "))) return false;
  // Historical NCERT uploads remain usable. Known reference volumes stay in the
  // separate figure/reader channel, including older underscore-separated names.
  return !REF_BOOK_PATTERN.test(`${book.file_name} ${book.chapter}`.replace(/_/g, " "));
}

/** Read old and new libraries without requiring the optional upload classification fields. */
export async function readLessonTextbooks(db: { from: (table: string) => any }): Promise<LessonTextbook[]> {
  const books: LessonTextbook[] = [];
  let includeClassification = true;
  for (let from = 0; ; from += 1000) {
    const read = (classified: boolean) => db.from("ncert_books")
      .select(`id,class,subject,chapter,file_name${classified ? ",source_kind" : ""}`)
      .order("id", { ascending: true }).range(from, from + 999);
    let result = await read(includeClassification);
    if (result.error && includeClassification && isSourceLibrarySetupError(result.error)) {
      includeClassification = false;
      result = await read(false);
    }
    if (result.error) throw sourceLibraryError(result.error);
    const rows = (result.data || []) as LessonTextbook[];
    books.push(...rows.filter(book=>isLessonTextbook(book)&&!socialRevisionChapter(book)).map(socialLibraryMetadata));
    if (rows.length < 1000) return books;
  }
}

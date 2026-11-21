const NON_ENGLISH_BOOK_MARKERS = /(?:\b(?:hindi|bhautiki|bhautik(?:i)?|vigyan|rasayan|bhag)\b|[\u0900-\u097f])/iu;

/**
 * The NCERT reader is an English-medium companion view. Reject book records
 * whose identifying metadata explicitly names a Hindi edition; filenames
 * such as NCERT_CLASS_11_PHYSICS_BHAUTIKI_1.pdf must never win a Physics match.
 * Neutral official NCERT filenames remain eligible.
 */
export function isEnglishNcertBookCandidate(book: { file_name?: string | null; chapter?: string | null }) {
  const identity = `${book.file_name || ""} ${book.chapter || ""}`;
  return !NON_ENGLISH_BOOK_MARKERS.test(identity);
}

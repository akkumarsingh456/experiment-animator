const NON_ENGLISH_BOOK_MARKERS = /\\b(?:hindi|bhautiki|bhautik(?:i)?|vigyan|rasayan|bhag)\\b|[\\u0900-\\u097f]/iu;

/**
 * The NCERT reader is an English-medium companion view. Reject book records
 * whose identifying metadata explicitly names a Hindi edition.
 *
 * IMPORTANT: filenames use underscores as separators (e.g.
 * NCERT_CLASS_11_PHYSICS_BHAUTIKI_1.pdf). Normalize those separators before
 * applying word boundaries; otherwise JavaScript treats "_" as a word
 * character and the Hindi marker is missed.
 */
export function isEnglishNcertBookCandidate(book: { file_name?: string | null; chapter?: string | null }) {
  const identity = `${book.file_name || ""} ${book.chapter || ""}`
    .replace(/[_-]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
  return !NON_ENGLISH_BOOK_MARKERS.test(identity);
}

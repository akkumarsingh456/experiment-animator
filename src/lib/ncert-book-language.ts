const NON_ENGLISH_BOOK_MARKERS = /\b(?:hindi|bhautiki|bhautik(?:i)?|vigyan|rasayan|bhag)\b|[\u0900-\u097f]/iu;

/** Neutral English-script NCERT filenames are valid; explicit Hindi editions are not. */
export function isEnglishNcertBookCandidate(book: { file_name?: string | null; chapter?: string | null }) {
  const identity = String(book.file_name || "") + " " + String(book.chapter || "");
  return !NON_ENGLISH_BOOK_MARKERS.test(identity.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim());
}

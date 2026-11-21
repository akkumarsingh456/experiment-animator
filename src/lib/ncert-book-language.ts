const NON_ENGLISH_BOOK_MARKERS = /\b(?:hindi|bhautiki|bhautik(?:i)?|vigyan|rasayan|bhag)\b|[\u0900-\u097f]/iu;

/**
 * Primary lesson sources must be explicitly NCERT-named PDFs. Matching class
 * and subject metadata alone must not admit Oswaal, PW or coaching PDFs.
 * English-script NCERT filenames may omit the word English; Hindi markers
 * are always rejected.
 */
export function isEnglishNcertBookCandidate(book: { file_name?: string | null; chapter?: string | null }) {
  const fileName = String(book.file_name || "").replace(/[_-]+/g, " ").trim();
  if (!/\bncert\b/i.test(fileName)) return false;
  const identity = fileName + " " + String(book.chapter || "");
  return !NON_ENGLISH_BOOK_MARKERS.test(identity.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim());
}

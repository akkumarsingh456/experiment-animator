const NON_ENGLISH_BOOK_MARKERS = /\b(?:hindi|bhautiki|bhautik(?:i)?|vigyan|rasayan|bhag)\b|[\u0900-\u097f]/iu;

/**
 * English NCERT files are not always labelled "English". Treat a neutral
 * English-script filename as eligible, and reject only explicit Hindi markers.
 * Normalize separators first so identifiers such as PHYSICS_BHAUTIKI_1 match.
 */
export function isEnglishNcertBookCandidate(book: { file_name?: string | null; chapter?: string | null }) {
  const identity = \`\${book.file_name || ""} \${book.chapter || ""}\`
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return !NON_ENGLISH_BOOK_MARKERS.test(identity);
}

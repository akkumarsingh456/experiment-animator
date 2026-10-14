import { isContentsListing } from './note-source-noise';

// Match textbook spelling and grammatical variants without changing source text.
const tokens = (text: string) => text.toLowerCase().replace(/isation\b/g, 'ization')
  .replace(/\bbehaviour/g, 'behavior').replace(/\bcolour/g, 'color')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/)
  .map(word => word.length > 5 ? word.replace(/ies$/, 'y').replace(/s$/, '') : word);
const ignored = new Set(['the', 'and', 'for', 'with', 'from', 'chapter', 'introduction', 'basic', 'concept', 'property', 'law', 'rule']);

export function topicEvidence(title: string, lines: string[]): string[] {
  const terms = [...new Set(tokens(title).filter(word => word.length > 2 && !ignored.has(word)))];
  if (!terms.length) return [];
  const candidates = lines.filter(line => line.trim().length > 28 && !isContentsListing(line));
  const scored = candidates.map(line => {
    const words = new Set(tokens(line));
    return { line, hits: terms.filter(term => words.has(term)) };
  });
  const exact = scored.filter(item => item.hits.length >= Math.min(2, terms.length));
  if (exact.length) return exact.map(item => item.line);
  // A distinctive long topic word can survive a missing heading/OCR word.
  // Do not use broad terms such as "electric" to fill a different concept.
  const distinctive = terms.filter(term => term.length >= 8 && !['electric', 'potential', 'magnetic', 'chemical', 'physical', 'reaction', 'equation', 'function'].includes(term));
  return scored.filter(item => item.hits.some(term => distinctive.includes(term))).map(item => item.line);
}

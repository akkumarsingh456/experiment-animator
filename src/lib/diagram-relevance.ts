const ignoredTerms = new Set([
  'a', 'an', 'and', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with',
  'class', 'grade', 'chapter', 'topic', 'diagram', 'image', 'labelled', 'labeled',
  'nature', 'science', 'physics', 'chemistry', 'biology', 'botany', 'zoology',
]);

const equivalentTerms: Record<string, string[]> = {
  speed: ['velocity'],
  velocity: ['speed'],
  wave: ['waves'],
  waves: ['wave'],
  c: ['carbon'],
  carbon: ['c'],
  x: ['halogen', 'halo'],
  halogen: ['x', 'halo'],
  halo: ['x', 'halogen'],
  bond: ['bonding'],
  bonding: ['bond'],
  electricity: ['electric'],
  electric: ['electricity'],
};

function tokens(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/ies$/, 'y').replace(/s$/, ''))
    .filter((word) => (word.length > 1 || word === 'c' || word === 'x') && !ignoredTerms.has(word));
}

/** A conservative title-only relevance check: false positives are hidden from import. */
export function checkDiagramTopicMatch(query: string, title: string) {
  const terms = [...new Set(tokens(query))];
  const titleTerms = new Set(tokens(title));
  if (!terms.length) return { relevant: false, matched: 0, total: 0, score: 0 };

  const matched = terms.filter((term) => {
    const options = [term, ...(equivalentTerms[term] || [])];
    return options.some((option) => {
      const normalized = option.replace(/ies$/, 'y').replace(/s$/, '');
      return titleTerms.has(normalized);
    });
  }).length;
  const score = matched / terms.length;
  const needed = terms.length === 1 ? 1 : Math.ceil(terms.length * 0.6);
  return { relevant: matched >= needed, matched, total: terms.length, score };
}

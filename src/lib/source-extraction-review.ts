/** Conservative extraction checks shared by new notes and saved-source review.
 * Original text remains available; missing words/columns are never invented. */
export function sourceExtractionIssue(raw:string):string|null {
 const text=raw.replace(/^\s*\*\*[^*]+:\*\*\s*/,'').trim();
 // A delimited table, code block or authored mathematical expression keeps
 // its structure; these checks target flattened prose, not valid notation.
 const structured=/```|\$|\\(?:frac|begin|mathrm)\b/.test(text)||/\|[^|\n]+\|/.test(text);
 const labels=(text.match(/\b(?:atomic (?:weight|mass|number)|density|melting point|boiling point|formula of (?:oxide|chloride)|electronic configuration|ionic radius|ionisation energy|ionization energy|population|literacy rate|life expectancy|per capita income|resistivity|conductivity|temperature|pressure)\b/gi)||[]).length;
 const values=(text.match(/\b\d+(?:\.\d+)?\b/g)||[]).length;
 const prose=/\b(?:is|are|was|were|increases?|decreases?|because|therefore|whereas|compared|respectively)\b/i.test(text);
 if(!structured&&values>=6&&(/\bFormula(?:s)?\b/i.test(text)&&/\bof (?:hydride|oxide)\b/i.test(text)||/\bmetallic radius\b/i.test(text)&&/\bionic radius\b/i.test(text)))
  return 'Several chemical formulas or radius-table entries were merged by PDF extraction. Subscripts alone cannot restore the missing rows and column headings; compare the original textbook table.';
 if(/(?:^|\s)-\s*\d{2}\s+\d{1,3}\s+[A-Z][A-Z ]{25,}/.test(text))
  return 'A running textbook page heading interrupts this sentence. The original extraction is retained for comparison.';
 if(!structured&&text.length>100&&labels>=3&&values>=6&&!prose)
  return 'The PDF merged table headings and values into one paragraph. The original table is needed to recover its rows and columns accurately.';
 if(/\b(?:predicted|found)\b/i.test(text)&&
   (text.match(/\b(?:atomic weight|density|melting point|formula of oxide|formula of chloride)\b/gi)||[]).length>=3)
  return 'The PDF merged several table columns. Read the original textbook table for the comparison; these entries cannot safely be treated as a sentence.';
 if(/\b(?:19|20)\d{2}\s*[-–]\s*(?:\d{2}|\d{4})\s+\d{1,3}\b/.test(text)&&
   /\b[A-Z][A-Z -]{25,}\b/.test(text))
  return 'A textbook page heading and page number were mixed into this extraction. The original text is retained below for comparison.';
 if(text.length>55&&!/[a-z]/.test(text)&&/[A-Z]/.test(text))
  return 'This is an extracted textbook heading, not an explanatory note.';
 if(/^(?:of atoms\b|elements that closely resembles\b)/i.test(text))
  return 'This extraction starts partway through a sentence. Its missing beginning must be recovered from the textbook before it is used as a note.';
 return null;
}

/** Retain damaged originals separately before completeness/recovery checks.
 * The same helper handles fresh sections and existing cached lessons. */
export function quarantineExtractionSections<T extends {heading:string;kind:string;lines:string[]}>(sections:T[]|undefined):T[]|undefined {
 if(!sections)return sections;
 const originals:string[]=[];
 const output=sections.map(section=>{
  if(/^Source (?:review|table)/i.test(section.heading)||section.kind==='diagram')return section;
  const lines=section.lines.filter(line=>{if(!sourceExtractionIssue(line))return true;originals.push(line);return false;});
  return lines.length===section.lines.length?section:{...section,lines};
 }).filter(section=>section.lines.length);
 if(!originals.length)return sections;
 const heading='Source review — original extraction';
 const existing=output.find(section=>section.heading===heading);
 if(existing)return output.map(section=>section===existing?{...section,lines:[...new Set([...section.lines,...originals])]}:section);
 return [...output,{heading,kind:'text',lines:[...new Set(originals)]} as T];
}

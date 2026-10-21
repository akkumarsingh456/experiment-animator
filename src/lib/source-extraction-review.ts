/** Conservative extraction checks shared by new notes and saved-source review.
 * Original text remains available; missing words/columns are never invented. */
export function sourceExtractionIssue(raw:string):string|null {
 const text=raw.replace(/^\s*\*\*[^*]+:\*\*\s*/,'').trim();
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

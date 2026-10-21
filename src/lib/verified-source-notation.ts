/** Exact legacy NCERT Magnetism and Matter extraction, checked against the
 * axial-field relation in https://www.ncert.nic.in/textbook/pdf/leph105.pdf.
 * Do not infer arbitrary formulas from their equation number or symbol set. */
export function verifiedSourceNotation(text:string):string {
 if (/^Thus,?\s+0\s+3\s+2\s+4\s+m\s+B\s+r\s+[μµ]\s+π\s*=\s*\(5\.2\)\s*[.]?$/u.test(text.trim())) {
  return 'Thus, $B=\\frac{\\mu_0}{4\\pi}\\frac{2m}{r^3}$. This is the far axial field of a magnetic dipole, applicable at distances much larger than its dimensions.';
 }
 return text;
}

/** Display-only recovery for the explicitly identified NCERT optics relations.
 * Never infer fractions from arbitrary joined words or rewrite source data.
 */
export function opticsNotation(value: string, math: boolean): string {
  const wrap = (body: string) => (math ? body : `$${body}$`);
  const display = (body: string) => (math ? body : `$$${body}$$`);
  // Older saved render strings may already contain the accidental line breaks.
  // Recover only the complete Snell relation, never arbitrary LaTeX newlines.
  value = value.replace(/n_(?:\{1\}|1)\s*\\\\sin\s+i\s*=\s*n_(?:\{2\}|2)\s*\\\\sin\s+r\b/g, () =>
    wrap(String.raw`n_{1}\sin i=n_{2}\sin r`),
  );
  const triple =
    /(?:\\tan|tan)\s*(?:\\angle|∠)\s*NOM\s*=\s*MN\s*\/?\s*OM\s*(?:\\tan|tan)\s*(?:\\angle|∠)\s*NCM\s*=\s*MN\s*\/?\s*MC\s*(?:\\tan|tan)\s*(?:\\angle|∠)\s*NIM\s*=\s*MN\s*\/?\s*MI\b/g;
  value = value.replace(triple, () =>
    display(
      String.raw`\begin{aligned}\tan\angle\mathrm{NOM}&=\frac{\mathrm{MN}}{\mathrm{OM}}\\\tan\angle\mathrm{NCM}&=\frac{\mathrm{MN}}{\mathrm{MC}}\\\tan\angle\mathrm{NIM}&=\frac{\mathrm{MN}}{\mathrm{MI}}\end{aligned}`,
    ),
  );
  value = value.replace(/(?:\\sin|\bsin)\s+i\s*\/\s*(?:\\sin|sin)\s+r\s*=\s*n\b(?![_\d])/g, () =>
    wrap(String.raw`\frac{\sin i}{\sin r}=n`),
  );
  if (/mirror equation/i.test(value)) {
    value = value.replace(/\bf\s*=\s*R\s*\/\s*2\b/g, () => wrap(String.raw`f=\frac{R}{2}`));
    value = value.replace(/(\(9\.3\))\s*(9\.2\.3)\s*(The\b)/g, "$1 $2 $3");
  }
  return value;
}

/** Join only the known partially auto-wrapped tangent triplet before rendering. */
export function joinOpticsFragments(value: string): string {
  if (/mirror equation/i.test(value))
    value = value.replace(
      /\$(f\s*=\s*(?:R\s*\/\s*2|\\frac\{R\}\{2\}))\s*(\(9\.3\))\s*(9\.2\.3)\s*(The)\$/g,
      "$$$1$$ $2 $3 $4",
    );
  return value.replace(
    /((?:tan|\\tan)\s*(?:∠|\\angle)\s*)\$(NOM\s*=\s*MNOM\s*(?:tan|\\tan)\s*(?:∠|\\angle)\s*NCM\s*=\s*MNMC\s*(?:tan|\\tan)\s*(?:∠|\\angle)\s*NIM\s*=\s*MNMI)\$/g,
    "$1$2",
  );
}

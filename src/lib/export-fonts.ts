/** Embed font faces directly without html-to-image's cross-origin stylesheet mutation. */
export async function exportFontCss(root: HTMLElement): Promise<string> {
  const fetchText = async (url: string) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('A presentation font could not be loaded. Please retry the download.');
    return response;
  };
  const sheets = await Promise.all(Array.from(root.ownerDocument.styleSheets).map(async sheet => {
    try { return { css: Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'), base: sheet.href || document.baseURI }; }
    catch { if (!sheet.href) return { css: '', base: document.baseURI }; return { css: await (await fetchText(sheet.href)).text(), base: sheet.href }; }
  }));
  const imports = sheets.flatMap(({css, base}) => Array.from(css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/gi), match => new URL(match[1], base).href));
  sheets.push(...await Promise.all([...new Set(imports)].map(async url => ({ css: await (await fetchText(url)).text(), base: url }))));
  const used = new Set<string>();
  [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))].forEach(node => getComputedStyle(node).fontFamily.split(',').forEach(font => used.add(font.trim().replace(/["']/g, ''))));
  const faces = sheets.flatMap(({css, base}) => Array.from(css.matchAll(/@font-face\s*\{[^}]*\}/gi), match => ({css: match[0], base})));
  const selected = faces.filter(face => {
    const family = /font-family\s*:\s*([^;}]+)/i.exec(face.css)?.[1].trim().replace(/["']/g, '');
    return family && used.has(family);
  }).map(face => {
    const source = /src\s*:\s*([^;]+)/i.exec(face.css);
    const woff2 = source?.[1].split(',').find(value => value.includes('woff2'));
    return { ...face, css: woff2 && source ? face.css.replace(source[0], `src: ${woff2}`) : face.css };
  });
  const embedded = await Promise.all(selected.map(async ({css, base}) => {
    const urls = Array.from(css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g));
    for (const match of urls) {
      if (match[1].startsWith('data:')) continue;
      const blob = await (await fetchText(new URL(match[1], base).href)).blob();
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to prepare presentation fonts.')); reader.readAsDataURL(blob); });
      css = css.replace(match[0], `url("${data}")`);
    }
    return css;
  }));
  return embedded.join('\n');
}

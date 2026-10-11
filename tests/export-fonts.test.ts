import { describe, it, expect, vi, afterEach } from 'vitest';
import { exportFontCss } from '@/lib/export-fonts';
afterEach(() => vi.restoreAllMocks());
describe('PDF font embedding', () => {
 it('fetches protected font stylesheets and embeds fonts without reading restricted rules', async () => {
  const root = document.createElement('div'); root.style.fontFamily = 'Inter'; document.body.append(root);
  const sheet = { href: 'https://fonts.example/style.css', get cssRules() { throw new DOMException('Restricted', 'SecurityError'); } };
  vi.spyOn(document, 'styleSheets', 'get').mockReturnValue([sheet] as unknown as StyleSheetList);
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input).endsWith('.css') ? new Response('@font-face { font-family: Inter; src: url("font.woff2") format("woff2"); }') : new Response(new Blob(['font-bytes'], {type:'font/woff2'})));
  const css = await exportFontCss(root);
  expect(css).toContain('data:font/woff2;base64,');
  expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual(['https://fonts.example/style.css', 'https://fonts.example/font.woff2']);
  root.remove();
 });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { prepareExportImages } from '@/lib/export-images';
afterEach(() => vi.useRealTimers());
describe('download image preparation', () => {
 it('loads offscreen images eagerly without changing their source', async () => {
  const root = document.createElement('div'); const img = document.createElement('img');
  root.append(img); img.loading = 'lazy'; img.src = 'https://example.com/book.jpg';
  img.decode = vi.fn().mockResolvedValue(undefined);
  await prepareExportImages(root);
  expect(img.loading).toBe('eager'); expect(img.src).toBe('https://example.com/book.jpg');
 });
 it('reports a failed book image instead of silently dropping it', async () => {
  const root = document.createElement('div'); const img = document.createElement('img'); root.append(img);
  img.decode = vi.fn().mockRejectedValue(new Error('expired URL'));
  await expect(prepareExportImages(root)).rejects.toThrow('refresh its book images');
 });
 it('stops an indefinitely pending image with a useful error', async () => {
  vi.useFakeTimers(); const root = document.createElement('div'); const img = document.createElement('img'); root.append(img);
  img.decode = vi.fn(() => new Promise<void>(() => {}));
  const result = expect(prepareExportImages(root, 50)).rejects.toThrow('too long');
  await vi.advanceTimersByTimeAsync(50); await result;
 });
});

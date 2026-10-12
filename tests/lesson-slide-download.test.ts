import { describe, expect, it, vi } from 'vitest';
import { downloadRenderedPptx } from '@/lib/lesson-slide-export';
vi.mock('@/lib/export-fonts', () => ({ exportFontCss: async () => '' }));
vi.mock('@/lib/export-images', () => ({ prepareExportImages: async () => {} }));
vi.mock('html-to-image', () => ({ toJpeg: async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=' }));
describe('PowerPoint download delivery', () => {
  it('creates a real presentation blob for the persistent Save button and reports every slide', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => setTimeout(callback, 0));
    const root = document.createElement('div');
    root.dataset.presentationStyle = 'lovable';
    root.innerHTML = '<div class="lesson-export-slide">First formula</div><div class="lesson-export-slide">Second formula</div>';
    const ready = vi.fn(); const progress = vi.fn();
    await downloadRenderedPptx(root, 'Chapter: Solutions', { onReady: ready, onProgress: progress });
    expect(ready).toHaveBeenCalledOnce();
    const [blob, filename] = ready.mock.calls[0];
    expect(blob.size).toBeGreaterThan(1000);
    expect(filename).toBe('Chapter- Solutions.pptx');
    expect(progress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]]);
    vi.unstubAllGlobals();
  });
});

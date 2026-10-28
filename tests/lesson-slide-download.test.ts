import { describe, expect, it, vi } from 'vitest';
import { downloadRenderedPptx,prepareSlideExport } from '@/lib/lesson-slide-export';
vi.mock('@/lib/export-fonts', () => ({ exportFontCss: async () => '' }));
vi.mock('@/lib/export-images', () => ({ prepareExportImages: async () => {} }));
vi.mock('html-to-image', () => ({ toJpeg: async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=' }));
describe('PowerPoint download delivery', () => {
  it('preserves uploaded image data and layout while removing editor controls from exports',async()=>{
    Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}});
    vi.stubGlobal('requestAnimationFrame',(callback:()=>void)=>setTimeout(callback,0));
    const root=document.createElement('div');root.dataset.presentationStyle='lovable';
    root.innerHTML='<div class="lesson-export-slide"><div style="position:absolute;left:17%;top:12%;width:65%;border-radius:50%"><img src="data:image/png;base64,SAVED"/></div><div class="manual-image-controls">Import and Save</div></div>';
    const pages=await prepareSlideExport(root);
    expect(pages[0].querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,SAVED');
    expect(pages[0].querySelector('img')?.parentElement?.style.left).toBe('17%');
    expect(pages[0].querySelector('img')?.parentElement?.style.borderRadius).toBe('50%');
    expect(root.querySelector('.manual-image-controls')).toBeNull();vi.unstubAllGlobals();
  });
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
  }, 20000);
});

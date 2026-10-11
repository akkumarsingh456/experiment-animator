/** Bound image loading so an unavailable book page cannot stall a download. */
export async function prepareExportImages(root: HTMLElement, timeoutMs = 20000) {
  await Promise.all(Array.from(root.querySelectorAll('img')).map(async (image) => {
    image.loading = 'eager';
    if (image.complete && image.naturalWidth > 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        image.decode(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('A slide image took too long to load. Reload the lesson and try downloading again.')), timeoutMs); }),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('too long')) throw error;
      throw new Error('A slide image could not load. Reload the lesson to refresh its book images, then try downloading again.');
    } finally { clearTimeout(timer); }
  }));
}

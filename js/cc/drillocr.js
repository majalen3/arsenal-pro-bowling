// On-device OCR for drill / grip spec cards (owner queue item 6). Lazy: imported only from the scan screen, after the bowler taps
// "Read the card". Vendored Tesseract.js 7.0.0 + tesseract.js-core 7.0.0 (Apache-2.0) and tessdata_fast eng (Apache-2.0),
// all served from this site (CSP script-src 'self'); the worker is a same-origin file, not a blob, so the page CSP holds.
// The photo never leaves the phone. ~5 MB downloaded the first time, then cached by the service worker for offline use.
const BASE = new URL('../vendor/tesseract/', import.meta.url).href;
export const OCR_FILES = ['tesseract.esm.min.js', 'worker.min.js', 'tesseract-core-simd-lstm.js', 'tesseract-core-simd-lstm.wasm', 'lang/eng.traineddata.gz'];
export const supported = () => typeof WebAssembly === 'object' && typeof Worker === 'function' &&
  WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));   // SIMD probe
// Returns { words: [{ text, conf, x0, y0, x1, y1 }], width, height, ms }.
export async function readCard(image, { onProgress } = {}) {
  const t0 = Date.now();
  const T = (await import('../vendor/tesseract/tesseract.esm.min.js')).default;
  const w = await T.createWorker('eng', 1, { workerPath: BASE + 'worker.min.js', corePath: BASE + 'tesseract-core-simd-lstm.js', langPath: BASE + 'lang',
    workerBlobURL: false, gzip: true, cacheMethod: 'none', logger: m => onProgress && onProgress(m) });
  try {
    await w.setParameters({ preserve_interword_spaces: '1' });
    const r = await w.recognize(image, {}, { blocks: true, text: true });
    const words = [];
    for (const b of r.data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) for (const x of l.words || [])
      words.push({ text: x.text, conf: x.confidence, x0: x.bbox.x0, y0: x.bbox.y0, x1: x.bbox.x1, y1: x.bbox.y1 });
    const width = Math.max(1, ...words.map(x => x.x1)), height = Math.max(1, ...words.map(x => x.y1));
    return { words, width, height, text: r.data.text || '', ms: Date.now() - t0 };
  } finally { await w.terminate(); }
}

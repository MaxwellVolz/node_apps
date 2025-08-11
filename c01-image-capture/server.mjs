import express from 'express';
import screenshot from 'screenshot-desktop';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import cvFactory from 'opencv.js';
import { windowManager } from 'node-window-manager';
import { PNG } from 'pngjs';

const isSEA = !!process.versions?.sea;
const appRoot = isSEA ? path.dirname(process.execPath) : process.cwd();
const capturesDir = path.join(appRoot, 'captures');


const app = express();
app.use(express.json());
app.use(express.static('public')); // serves index.html

// ensure dir and static route
await fs.mkdir(capturesDir, { recursive: true }).catch(() => {});
app.use('/captures', express.static(capturesDir));

// --- OpenCV.js lazy loader (works with different export shapes) ---
let cvPromise = null;
async function getCV() {
  if (cvPromise) return cvPromise;

  const mod = await import('opencv.js');     // ESM import
  const candidate = mod?.default ?? mod;     // some builds export default, some namespace
  if (typeof candidate === 'function') {
    cvPromise = candidate();                 // classic factory → Promise<cv>
  } else if (candidate?.then) {
    cvPromise = candidate;                   // already a Promise<cv>
  } else if (candidate?.cv) {
    cvPromise = Promise.resolve(candidate.cv); // attached as .cv
  } else {
    cvPromise = Promise.resolve(candidate);    // last resort
  }
  return cvPromise;
}


app.get('/api/windows', (req, res) => {
    try {
      const windows = windowManager.getWindows()
        .filter(w => w.isVisible())
        .map(w => {
          const { x, y, width, height } = w.getBounds();   // nwm gives x/y
          const owner = w.getOwner?.() || {};              // { processId, path, name }
          return {
            hwnd: w.handle,                                // numeric handle
            title: w.getTitle(),
            left: x,
            top: y,
            width,
            height,
            processId: owner.processId ?? null,
            processPath: owner.path ?? null,
            processName: owner.name ?? null,
          };
        });
  
      res.json(windows);
    } catch (err) {
      console.error('windows route failed:', err);
      res.status(500).json({ error: err.message });
    }
  });
  

// Capture specific window by bounds (crop without OpenCV)
app.post('/api/capture', async (req, res) => {
    res.setTimeout(30000); // safety
    try {
      const { left, top, width, height, fileName } = req.body || {};
      if ([left, top, width, height].some(v => typeof v !== 'number')) {
        return res.status(400).json({ error: 'invalid bounds' });
      }
      const name = (fileName || `capture_${Date.now()}.png`).replace(/[^\w\-\.]/g, '_');
  
      // 1) Fullscreen PNG
      const pngBuf = await screenshot({ format: 'png' });
  
      // 2) Decode
      const src = PNG.sync.read(pngBuf); // {width, height, data: Uint8Array RGBA}
  
      // 3) Clamp rect to image
      const x = Math.max(0, Math.min(left,  src.width  - 1));
      const y = Math.max(0, Math.min(top,   src.height - 1));
      const w = Math.max(1, Math.min(width,  src.width  - x));
      const h = Math.max(1, Math.min(height, src.height - y));
  
      // 4) Allocate target PNG
      const dst = new PNG({ width: w, height: h });
  
      // 5) Copy rows (RGBA, 4 bytes per pixel)
      const BYTES = 4;
      for (let row = 0; row < h; row++) {
        const srcStart = ((y + row) * src.width + x) * BYTES;
        const srcEnd   = srcStart + w * BYTES;
        const dstStart = row * w * BYTES;
        dst.data.set(src.data.subarray(srcStart, srcEnd), dstStart);
      }
  
      // 6) Encode + save
      const outBuf = PNG.sync.write(dst, { colorType: 6 });
      const outPath = path.join(capturesDir, name);
      await fs.writeFile(outPath, outBuf);
  
      // 7) Return both path & URL
      res.json({ ok: true, path: outPath, url: `/captures/${encodeURIComponent(name)}` });
    } catch (e) {
      res.status(500).json({ error: e.message || String(e) });
    }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[web] http://localhost:${PORT}`);
});

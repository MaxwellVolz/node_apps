// app.js (ESM, Node 20/22)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { Window } from 'node-screenshots';
import cvReady from '@techstark/opencv-js';
import { PNG } from 'pngjs';

const cv = await cvReady; // 4.11+ init
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THRESH = 0.90;

// RGBA PNG buffer -> cv.Mat (CV_8UC4)
function matFromPngBuffer(buf) {
  const png = PNG.sync.read(buf); // {data,width,height} RGBA
  const mat = new cv.Mat(png.height, png.width, cv.CV_8UC4);
  mat.data.set(png.data);
  return mat;
}

// 1) Pick the window
const win = Window.all().find(w => /diablo/i.test(w.appName || w.title || ''));
if (!win) throw new Error('Diablo window not found');

// 2) Capture window to PNG buffer -> Mat (gray)
const pngBuf = await (await win.captureImage()).toPng();
const frame = matFromPngBuffer(pngBuf);
const frameGray = new cv.Mat();
cv.cvtColor(frame, frameGray, cv.COLOR_RGBA2GRAY);

// 3) Load template (/assets/login_image.png) -> Mat (gray)
const tplBuf = await readFile(path.join(__dirname, 'assets', 'login_image.png'));
const tpl = matFromPngBuffer(tplBuf);
const tplGray = new cv.Mat();
cv.cvtColor(tpl, tplGray, cv.COLOR_RGBA2GRAY);

// 4) Bail if template is bigger than frame
if (frameGray.cols < tplGray.cols || frameGray.rows < tplGray.rows) {
  console.log('Template larger than frame → not a match'); process.exit(0);
}

// 5) Template match
const result = new cv.Mat();
cv.matchTemplate(frameGray, tplGray, result, cv.TM_CCOEFF_NORMED);
const { maxVal, maxLoc } = cv.minMaxLoc(result);

console.log({
  found: maxVal >= THRESH,
  score: Number(maxVal.toFixed(5)),
  rect: maxVal >= THRESH ? { x: maxLoc.x, y: maxLoc.y, w: tplGray.cols, h: tplGray.rows } : null
});

// Cleanup
frame.delete(); frameGray.delete();
tpl.delete(); tplGray.delete();
result.delete();

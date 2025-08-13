// scripts/detect.mjs
// deps: robotjs pngjs
import robot from "robotjs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import pkg from "pngjs";
const { PNG } = pkg;

// ---------- internal utils ----------
const now = () => new Date().toISOString().replace(/[:.]/g, "-");
const RESOLVE = (...p) => path.resolve(process.cwd(), ...p);

function bgraToPNGRect(b, shot) {
  const png = new PNG({ width: b.width, height: b.height });
  const src = shot.image, bpp = shot.bytesPerPixel, pitch = shot.byteWidth;
  for (let y = 0; y < b.height; y++) {
    for (let x = 0; x < b.width; x++) {
      const si = y * pitch + x * bpp;
      const di = (y * b.width + x) * 4;
      png.data[di + 0] = src[si + 2]; // R
      png.data[di + 1] = src[si + 1]; // G
      png.data[di + 2] = src[si + 0]; // B
      png.data[di + 3] = 255;         // A
    }
  }
  return png;
}

async function savePNG(png, tag) {
  const dir = RESOLVE("debug");
  await fsp.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${now()}_${tag}.png`);
  await fsp.writeFile(file, PNG.sync.write(png));
  return file;
}

export async function loadPNG(relOrAbs) {
  const buf = await fsp.readFile(path.isAbsolute(relOrAbs) ? relOrAbs : RESOLVE(relOrAbs));
  return PNG.sync.read(buf); // {width,height,data}
}

function toGray(rgba) {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    out[j] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return out;
}

function drawRect(png, x, y, w, h, [R,G,B,A] = [255, 0, 0, 255]) {
  const set = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) return;
    const i = (yy * png.width + xx) * 4;
    png.data[i + 0] = R; png.data[i + 1] = G; png.data[i + 2] = B; png.data[i + 3] = A;
  };
  for (let xx = x; xx <= x + w; xx++) { set(xx, y); set(xx, y + h); }
  for (let yy = y; yy <= y + h; yy++) { set(x, yy); set(x + w, yy); }
}

// Core matcher: coarse (stride/subsample) then refine (stride=1)
function matchGray(capGray, capW, capH, refGray, refW, refH) {
  // 1) coarse
  const stride = 4;
  let best = { score: 0, x: 0, y: 0 };
  for (let y = 0; y <= capH - refH; y += stride) {
    for (let x = 0; x <= capW - refW; x += stride) {
      let sum = 0, n = 0;
      for (let yy = 0; yy < refH; yy += 2) {
        const capBase = (y + yy) * capW + x;
        const refBase = yy * refW;
        for (let xx = 0; xx < refW; xx += 2) {
          const A = capGray[capBase + xx];
          const B = refGray[refBase + xx];
          sum += Math.abs(A - B); n++;
        }
      }
      const score = 1 - ((sum / n) / 255);
      if (score > best.score) best = { score, x, y };
    }
  }

  // 2) refine (±8px window, exact pixels)
  const rx0 = Math.max(0, best.x - 8);
  const ry0 = Math.max(0, best.y - 8);
  const rx1 = Math.min(capW - refW,  best.x + 8);
  const ry1 = Math.min(capH - refH,  best.y + 8);

  for (let y = ry0; y <= ry1; y++) {
    for (let x = rx0; x <= rx1; x++) {
      let sum = 0, n = 0;
      for (let yy = 0; yy < refH; yy++) {
        const capBase = (y + yy) * capW + x;
        const refBase = yy * refW;
        for (let xx = 0; xx < refW; xx++) {
          const A = capGray[capBase + xx];
          const B = refGray[refBase + xx];
          sum += Math.abs(A - B); n++;
        }
      }
      const score = 1 - ((sum / n) / 255);
      if (score > best.score) best = { score, x, y };
    }
  }
  return best;
}

// ---------- public API ----------

/**
 * in_screen(win, "refs/foo.png", 0.8)
 * Search inside the given window. Returns ABSOLUTE coords.
 * => { ok, score, x, y, w, h }
 */
export async function in_screen(win, refPath, threshold = 0.8, tag = null) {
  const wb = win.getBounds(); // NOTE: used only to set capture rect & absolutize result
  const shot = robot.screen.capture(wb.x, wb.y, wb.width, wb.height);
  const capPNG  = bgraToPNGRect(wb, shot);
  const capGray = toGray(capPNG.data);

  const REF     = await loadPNG(refPath);
  const refGray = toGray(REF.data);

  const best = matchGray(capGray, wb.width, wb.height, refGray, REF.width, REF.height);

  // debug
  drawRect(capPNG, best.x, best.y, REF.width, REF.height);
  await savePNG(capPNG, `win_${tag ?? path.basename(refPath)}_${best.score.toFixed(3)}`);

  const ok = best.score >= threshold;
  // Convert window-local to ABSOLUTE desktop coords
  return ok
    ? { ok, score: best.score, x: wb.x + best.x, y: wb.y + best.y, w: REF.width, h: REF.height }
    : { ok, score: best.score, x: 0,             y: 0,             w: REF.width, h: REF.height };
}

/**
 * on_desktop("refs/foo.png", 0.8)
 * Search across full desktop. Returns ABSOLUTE coords.
 * => { ok, score, x, y, w, h }
 */
export async function on_desktop(refPath, threshold = 0.8, tag = null) {
  const s = robot.getScreenSize();
  const shot = robot.screen.capture(0, 0, s.width, s.height);
  const rect = { x: 0, y: 0, width: s.width, height: s.height };

  const capPNG  = bgraToPNGRect(rect, shot);
  const capGray = toGray(capPNG.data);

  const REF     = await loadPNG(refPath);
  const refGray = toGray(REF.data);

  const best = matchGray(capGray, rect.width, rect.height, refGray, REF.width, REF.height);

  drawRect(capPNG, best.x, best.y, REF.width, REF.height);
  await savePNG(capPNG, `desk_${tag ?? path.basename(refPath)}_${best.score.toFixed(3)}`);

  const ok = best.score >= threshold;
  return ok
    ? { ok, score: best.score, x: best.x, y: best.y, w: REF.width, h: REF.height }
    : { ok, score: best.score, x: 0,      y: 0,      w: REF.width, h: REF.height };
}

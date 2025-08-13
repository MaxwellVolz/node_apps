// detect/basic_color.js
// ALWAYS saves a PNG under ./debug/ on every call (hit or no-hit).
import robot from "robotjs";
import pkg from "pngjs";
const { PNG } = pkg;
import { promises as fsp } from "node:fs";
import path from "node:path";

export function createDetector(log) {
  // Tunables
  const ROI_SCALE = 0.6;   // scan center 60% of screen
  const STRIDE    = 6;     // sampling stride (lower = slower, more precise)
  const MIN_COUNT = 120;   // min blue-ish pixels to consider a hit
  const MAX_MS    = 220;   // time budget per call (ms)
  const EXCLUDE_UI = true; // skip bottom-right quadrant (mana orb area)

  // HSV thresholds for the waypoint blue glow
  const H_MIN = 0.53, H_MAX = 0.70;
  const S_MIN = 0.30, V_MIN = 0.45;

  return {
    async findTemplate(tag, _opts = {}) {
      if (tag !== "wp_icon") return null;

      const t0 = Date.now();

      const scr = robot.getScreenSize();
      const rw = Math.floor(scr.width  * ROI_SCALE);
      const rh = Math.floor(scr.height * ROI_SCALE);
      const rx = Math.floor((scr.width  - rw) / 2);
      const ry = Math.floor((scr.height - rh) / 2);

      const shot  = robot.screen.capture(rx, ry, rw, rh);
      const buf   = shot.image;         // BGRA
      const bpp   = shot.bytesPerPixel; // 4
      const pitch = shot.byteWidth;

      let cnt = 0, sx = 0, sy = 0;
      let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;

      const deadline = Date.now() + MAX_MS;

      for (let y = 0; y < rh; y += STRIDE) {
        const row = y * pitch;
        for (let x = 0; x < rw; x += STRIDE) {
          if (Date.now() > deadline) { y = rh; break; }

          const scx = rx + x, scy = ry + y;
          if (EXCLUDE_UI && scx > scr.width * 0.7 && scy > scr.height * 0.7) continue;

          // BGRA -> r,g,b in [0..1]
          const i = row + x * bpp;
          const b = buf[i + 0] / 255, g = buf[i + 1] / 255, r = buf[i + 2] / 255;

          // rgb -> hsv
          const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
          if (max <= 0) continue;

          let h = 0;
          if (d > 0) {
            if (max === r)      h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else                h = (r - g) / d + 4;
            h /= 6; if (h < 0) h += 1;
          }
          const s = max === 0 ? 0 : d / max;
          const v = max;

          if (h >= H_MIN && h <= H_MAX && s >= S_MIN && v >= V_MIN) {
            cnt++; sx += scx; sy += scy;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      const dt = Date.now() - t0;

      // No hit: dump ROI and return null
      if (cnt < MIN_COUNT) {
        await saveDebug(shot, rx, ry, rw, rh, null, `nohit_cnt${cnt}_dt${dt}`);
        log.info?.(`[wp_icon] no-hit (cnt=${cnt}, ${dt}ms)`);
        return null;
      }

      // Hit: centroid in screen coords + bbox in ROI coords
      const cx = Math.round(sx / cnt);
      const cy = Math.round(sy / cnt);
      const bbox = {
        x: Math.max(0, minX - 8),
        y: Math.max(0, minY - 8),
        w: Math.min(rw - 1, maxX + 8) - Math.max(0, minX - 8),
        h: Math.min(rh - 1, maxY + 8) - Math.max(0, minY - 8),
        mark: { x: cx - rx, y: cy - ry }
      };

      await saveDebug(shot, rx, ry, rw, rh, bbox, `hit_cnt${cnt}_dt${dt}`);
      log.info?.(`[wp_icon] HIT at ${cx},${cy} (cnt=${cnt}, ${dt}ms)`);

      return { screen: { x: cx, y: cy }, score: 1.0 };
    },

    async findBoss()  { return null; },
    async hpBarRead() { return 100; },
    async nearby()    { return []  ; },
  };
}

async function saveDebug(shot, rx, ry, rw, rh, box, suffix) {
  // BGRA -> RGBA, draw overlays, write PNG
  const png = new PNG({ width: rw, height: rh });
  const src = shot.image, bpp = shot.bytesPerPixel, pitch = shot.byteWidth;

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const si = y * pitch + x * bpp;
      const di = (y * rw + x) * 4;
      png.data[di + 0] = src[si + 2]; // R
      png.data[di + 1] = src[si + 1]; // G
      png.data[di + 2] = src[si + 0]; // B
      png.data[di + 3] = 255;         // A
    }
  }

  if (box) {
    drawRect(png, box.x, box.y, box.w, box.h, [255, 0, 0, 255]); // red
    if (box.mark) drawCross(png, box.mark.x, box.mark.y, 8, [0, 255, 0, 255]); // green
  }

  const outDir = path.resolve(process.cwd(), "debug");
  await fsp.mkdir(outDir, { recursive: true });
  const out = path.join(outDir, `wp_${Date.now()}_${rx}x${ry}_${rw}x${rh}_${suffix || "dump"}.png`);
  const buf = PNG.sync.write(png);
  await fsp.writeFile(out, buf);
}

function drawRect(png, x, y, w, h, [R,G,B,A]) {
  const set = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) return;
    const i = (yy * png.width + xx) * 4;
    png.data[i + 0] = R;
    png.data[i + 1] = G;
    png.data[i + 2] = B;
    png.data[i + 3] = A;
  };
  for (let xx = x; xx <= x + w; xx++) { set(xx, y); set(xx, y + h); }
  for (let yy = y; yy <= y + h; yy++) { set(x, yy); set(x + w, yy); }
}

function drawCross(png, x, y, r, [R,G,B,A]) {
  const set = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) return;
    const i = (yy * png.width + xx) * 4;
    png.data[i + 0] = R;
    png.data[i + 1] = G;
    png.data[i + 2] = B;
    png.data[i + 3] = A;
  };
  for (let dx = -r; dx <= r; dx++) set(x + dx, y);
  for (let dy = -r; dy <= r; dy++) set(x, y + dy);
}

// capture/minimap.js
import screenshot from "screenshot-desktop";
import { importOpenCV } from "../core/native-imports.js";

/**
 * region: { left, top, width, height } in screen pixels (1080p assumed unless you calibrate)
 * returns: PNG Buffer of cropped (optionally grayscale) minimap
 */
export async function captureMinimap(region, { grayscale = true, resizeTo = null } = {}) {
  const cv = await importOpenCV();
  const pngBuf = await screenshot({ format: "png" });

  // Decode PNG -> Mat (BGR)
  const mat = cv.imdecode(pngBuf);

  // ROI crop
  const rect = new cv.Rect(region.left, region.top, region.width, region.height);
  let roi = mat.getRegion(rect);

  // Optional grayscale
  if (grayscale) {
    roi = roi.cvtColor(cv.COLOR_BGR2GRAY);
  }

  // Optional resize (normalize dims for template matching)
  if (resizeTo && resizeTo.width && resizeTo.height) {
    roi = roi.resize(resizeTo.height, resizeTo.width); // rows, cols
  }

  // Re-encode to PNG buffer
  const out = cv.imencode('.png', roi);
  return Buffer.from(out);
}

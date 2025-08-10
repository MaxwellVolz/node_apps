// matcher/findTemplate.js
import cv from "opencv4nodejs-prebuilt-install";
import fs from "node:fs/promises";

/**
 * Returns { ok, x, y, confidence, w, h }
 * (x,y) is the click center in absolute screen coords.
 */
export async function findTemplateOnScreen(screenBuf, templatePath, {
  method = cv.TM_CCOEFF_NORMED,
  threshold = 0.86,
  grayscale = true
} = {}) {
  const screen = cv.imdecode(screenBuf);
  const tplBuf = await fs.readFile(templatePath);
  const tpl = cv.imdecode(tplBuf);

  const src = grayscale ? screen.cvtColor(cv.COLOR_BGR2GRAY) : screen;
  const tmp = grayscale ? tpl.cvtColor(cv.COLOR_BGR2GRAY) : tpl;

  const res = src.matchTemplate(tmp, method);
  const { maxLoc, maxVal } = res.minMaxLoc(); // best match

  if (maxVal >= threshold) {
    const centerX = maxLoc.x + Math.floor(tmp.cols / 2);
    const centerY = maxLoc.y + Math.floor(tmp.rows / 2);
    return { ok: true, x: centerX, y: centerY, confidence: maxVal, w: tmp.cols, h: tmp.rows };
  }
  return { ok: false, confidence: maxVal };
}

/**
 * Tries multiple templates; returns the best passing threshold.
 */
export async function findAnyTemplate(screenBuf, templatePaths, options) {
  let best = { ok: false, confidence: -1 };
  for (const p of templatePaths) {
    const hit = await findTemplateOnScreen(screenBuf, p, options);
    if (hit.ok && hit.confidence > (best.confidence ?? -1)) best = { ...hit, templatePath: p };
  }
  return best;
}

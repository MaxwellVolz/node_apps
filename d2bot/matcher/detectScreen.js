// matcher/detectScreen.js
import { captureScreen } from "../capture/screen.js";
import { findAnyTemplate } from "./findTemplate.js";
import { SCREEN_STATES } from "./screenStates.js";

export async function detectScreen({ threshold = 0.85 } = {}) {
  const screenBuf = await captureScreen();

  let best = { state: null, confidence: -1 };
  for (const [stateName, templates] of Object.entries(SCREEN_STATES)) {
    const hit = await findAnyTemplate(screenBuf, templates, { threshold });
    if (hit.ok && hit.confidence > best.confidence) {
      best = { state: stateName, confidence: hit.confidence };
    }
  }

  return best.state
    ? { ok: true, ...best }
    : { ok: false, state: null, confidence: best.confidence };
}

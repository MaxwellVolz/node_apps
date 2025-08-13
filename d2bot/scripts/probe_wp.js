import { createDetector } from "../detect/basic_color.js";
import { windowManager } from "node-window-manager";
import robot from "robotjs";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function focusDiablo() {
  const win = windowManager.getWindows().find(w => /diablo/.test((w.getTitle() || "").toLowerCase()));
  if (win) { win.bringToTop(); try { win.focus(); } catch {} }
  else     { console.warn("[probe] Diablo window not found — will click screen center"); }
}

async function findAndClickWaypoint() {
  const detect = createDetector(console);

  // retry loop with short delay so you can rotate camera/step if needed
  for (let attempt = 1; attempt <= 10; attempt++) {
    const res = await Promise.race([
      detect.findTemplate("wp_icon", { minScore: 0.8 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 300ms")), 300))
    ]).catch(() => null);

    if (res?.screen) {
      await sleep(120);

      console.log(`[probe] HIT at ${res.screen.x},${res.screen.y} — moving and clicking`);
      robot.moveMouse(res.screen.x, res.screen.y);
      robot.mouseClick("left");

      console.log("should have moved by now...")
      return true;
    }

    console.log(`[probe] no hit (attempt ${attempt}/10)`);
    await sleep(120);
  }
  return false;
}

(async () => {
  // 1) focus window + ensure input focus
  focusDiablo();
  await sleep(120);
  const { width, height } = robot.getScreenSize();

  robot.moveMouse(Math.floor(width/2), Math.floor(height/2));
  robot.mouseClick("left");

  // 2) try to find & click the waypoint
  console.log("[probe] scanning for waypoint (show the pedestal)");
  const ok = await findAndClickWaypoint();
  console.log(ok ? "[probe] clicked waypoint" : "[probe] failed to find waypoint");
})();

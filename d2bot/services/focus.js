import { windowManager } from "node-window-manager";
import robot from "robotjs";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function createFocus(log, app = {}) {
  const scaleX = app.pointerScale?.x ?? 1.0;
  const scaleY = app.pointerScale?.y ?? 1.0;
  const offX   = app.pointerOffset?.x ?? 0;
  const offY   = app.pointerOffset?.y ?? 0;

  function findDiablo() {
    const wins = windowManager.getWindows();
    return wins.find(w => /diablo/.test((w.getTitle() || "").toLowerCase()));
  }

  function phys(x, y) {
    // convert logical → physical + user offsets
    return { x: Math.round(x * scaleX) + offX, y: Math.round(y * scaleY) + offY };
  }

  return {
    async focusGameWindow() {
      const win = findDiablo();
      if (!win) {
        log.warn("[focus] Diablo window not found; fallback to screen center");
        const s = robot.getScreenSize();
        robot.moveMouse(Math.floor(s.width/2), Math.floor(s.height/2));
        robot.mouseClick("left");
        await sleep(120);
        return;
      }
      win.bringToTop();
      try { win.focus(); } catch {}
      await sleep(80);

      const b = win.getBounds(); // logical coords
      const p = phys(b.x + b.width/2, b.y + b.height/2);
      robot.moveMouse(p.x, p.y);
      robot.mouseClick("left");
      await sleep(120);

      log.info(`[focus] focused "${win.getTitle()}" at ${b.x},${b.y} ${b.width}x${b.height} (phys ${p.x},${p.y})`);
    },

    centerMouse() {
      const win = findDiablo();
      if (win) {
        const b = win.getBounds();
        const p = phys(b.x + b.width/2, b.y + b.height/2);
        robot.moveMouse(p.x, p.y);
      } else {
        const s = robot.getScreenSize();
        robot.moveMouse(Math.floor(s.width/2), Math.floor(s.height/2));
      }
    }
  };
}

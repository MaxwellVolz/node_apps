import robot from "robotjs";

const SCREEN = { width: 1920, height: 1080 };
const MAP    = { origin: { x: SCREEN.width / 2, y: SCREEN.height / 2 }, scale: 4 };

export function createAim(log) {
  function worldToScreen({ x, y }) {
    const sx = MAP.origin.x + x * MAP.scale;
    const sy = MAP.origin.y + y * MAP.scale;
    return { x: Math.round(sx), y: Math.round(sy) };
  }

  return {
    async moveTo(worldPos) {
      const p = worldToScreen(worldPos);
      robot.moveMouse(p.x, p.y);
      log.trace(`[aim] moveTo -> ${p.x},${p.y}`);
    },
  };
}

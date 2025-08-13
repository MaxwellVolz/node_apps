import robot from "robotjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createDetector(log) {
  return {
    async findTemplate(tag, opts = {}) {
      log.info(`[diag] findTemplate(${tag})`);
      await sleep(10); // prove it's async but bounded
      const { width, height } = robot.getScreenSize();
      const cx = Math.floor(width / 2);
      const cy = Math.floor(height / 2);
      // Return a fully-resolved object (NO Promises inside)
      return { screen: { x: cx, y: cy }, score: 1, tag };
    },
    async findBoss()  { return null; },
    async hpBarRead() { return 100; },
    async nearby()    { return [];  },
  };
}

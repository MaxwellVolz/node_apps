export function create({ world, timers, log }, state) {
  return {
    async sync() { await timers.sleep(100); },

    async getPos() {
      return world.getPos();
    },

    async teleChain(targetPos, pauseMs = 60) {
      const hops = world.path(state, targetPos);
      for (const hop of hops) {
        await world.teleport(hop);
        await timers.sleep(pauseMs);
      }
    },

    async explore({ mode = "left-hand", stepRadius = 18 }) {
      // TODO: replace with real explore strategy; placeholder increments x
      const cur = await world.getPos();
      const next = { x: cur.x + stepRadius, y: cur.y };
      await world.teleport(next);
      await timers.sleep(60);
    },

    async activateExit(name) { await world.useExit(name); },
    async openTownPortal() { await world.openTP(); },
    async takeTownPortal() { await world.takeTP(); },
    async teleNudge({ dx = 0, dy = 0 }) { await world.teleportRelative({ dx, dy }); },

    async resolveMoatPerch(mephApprox, hint) {
      if (hint && world.isWalkable(hint)) return hint;
      return world.computeMoatPerch(mephApprox);
    },

    sleep: (ms) => timers.sleep(ms),
  };
}

// services/vision.js
export function create({ detect, log }, state) {
  return {
    // Pass options through (e.g., { minScore: 0.82 })
    async find(tag, opts = {}) { return detect.findTemplate(tag, opts); },
    async approxBossPos(name, hint) {
      const boss = await detect.findBoss(name, hint);
      return boss?.pos || hint;
    },
    async pos(name) {
      const boss = await detect.findBoss(name);
      return boss?.pos ?? null;
    },
    async isAlive(name) {
      const boss = await detect.findBoss(name);
      return Boolean(boss && !boss.dead);
    },
    async hpPercent(name) { return detect.hpBarRead(name); },
    async threats({ radius, kinds }) { return detect.nearby({ radius, kinds }); }
  };
}

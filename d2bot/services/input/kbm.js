import robot from "robotjs";

const SKILL_BINDINGS = {
  Teleport: "f4",
  Blizzard: "f3",
  StaticField: "f2",
  IceBlast: "f1",
  FrozenArmor: "f5",
  BattleOrders: "f6",
};

export function createInput(log) {
  return {
    async castSkill(skillName) {
      const key = SKILL_BINDINGS[skillName];
      if (key) {
        robot.keyTap(key);
        log.debug(`[kbm] castSkill: ${skillName}`);
      }
    },
    async rightClick() {
      robot.mouseClick("right");
    },
    async leftClick() {
      robot.mouseClick("left");
    },
    async buff(name) {
      const key = SKILL_BINDINGS[name];
      if (key) robot.keyTap(key);
    },
  };
}

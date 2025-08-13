// ViGEm backend (optional). Map skills to buttons. Requires ViGEmBus driver.
// Wire to your binding (node-vigem or ffi-napi to ViGEmClient).

export function createInput(log) {
    // TODO: setup client + virtual gamepad
    return {
      async castSkill(skillName) {
        log.trace(`[vigem] castSkill: ${skillName}`);
        // TODO: press A/B/X/Y or combos mapped to skillName
      },
      async buff(name) {
        log.trace(`[vigem] buff: ${name}`);
        // TODO
      }
    };
  }
  
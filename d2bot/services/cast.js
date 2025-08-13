export function create({ input, aim, log }, state) {
    return {
      async at(skill, worldPos) {
        await aim.moveTo(worldPos);
        await input.castSkill(skill);
      },
      async buff(name) { await input.buff(name); }
    };
  }
  
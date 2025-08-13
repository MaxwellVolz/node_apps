export function create({ world, log }, state) {
    return {
      async pick({ whitelist, gold = true, potions = true }) {
        await world.loot({ whitelist, gold, potions });
      }
    };
  }
  
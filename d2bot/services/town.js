export function create({ world, log }, state) {
    return {
      async ensureReady({ belt = true, idScrolls = true, repair = false }) {
        if (belt) await world.fillBelt();
        if (idScrolls) await world.identify({ keepList: true }); // ensures tomes/scrolls exist
        if (repair) await world.repairIfNeeded();
      },
      async stashAll() { await world.stashAll(); },
      async repairIfNeeded() { await world.repairIfNeeded(); },
      async identify({ keepList }) { await world.identify({ keepList }); }
    };
  }
  
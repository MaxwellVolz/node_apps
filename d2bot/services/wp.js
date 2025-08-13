export function create({ world, log }, state) {
    return {
      async use({ act, name }, ctx) { return world.useWaypoint(act, name, ctx); },
      async townFallback() { await world.townFallback(); }
    };
  }
  
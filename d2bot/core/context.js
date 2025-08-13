import * as nav from "../services/nav.js";
import * as cast from "../services/cast.js";
import * as vision from "../services/vision.js";
import * as wp from "../services/wp.js";
import * as town from "../services/town.js";
import * as loot from "../services/loot.js";
import { createFocus } from "../services/focus.js";

export function createContext(deps) {
  const state = { memo: Object.create(null) };
  const { log, input, detect, aim, world, timers, app } = deps;

  const ctx = {
    log, state, app,
    nav:   nav.create({ world, timers, log }, state),
    cast:  cast.create({ input, aim, log }, state),
    vision: vision.create({ detect, log }, state),
    wp:    wp.create({ world, log }, state),
    town:  town.create({ world, log }, state),
    loot:  loot.create({ world, log }, state),
    focus: createFocus(log, app),
    combat: {
      async freezePack(threats) {
        for (const t of threats) {
          await ctx.cast.at("GlacialSpike", t.pos);
        }
      }
    }
  };
  return ctx;
}

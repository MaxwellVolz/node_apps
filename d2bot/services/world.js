import robot from "robotjs";

export function createWorld(log) {
  let cur = { x: 0, y: 0 };

  const UI_TAGS = {
    waypointIcon: "wp_icon",                         // pedestal template (screen-space)
    tabs: { 1: "wp_tab_act1", 2: "wp_tab_act2", 3: "wp_tab_act3", 4: "wp_tab_act4", 5: "wp_tab_act5" },
    entries: { "Durance of Hate Level 2": "wp_entry_durance2" }
  };

  const MOVE_BUTTON = "left";          // D2R default is left-click to move
  const SCREEN = robot.getScreenSize(); // { width, height }
  const CENTER = { x: Math.floor(SCREEN.width/2), y: Math.floor(SCREEN.height/2) };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const moveMouse = (x,y) => robot.moveMouse(x,y);
  const click = (btn=MOVE_BUTTON) => robot.mouseClick(btn);
  const scrollDown = (px=120) => robot.scrollMouse(0, px);

  return {
    async getPos() { return { ...cur }; },

    // CLICK-TO-MOVE waypoint flow (no Teleport in town)
    async useWaypoint(act, name, ctx) {
      log.info(`[world] useWaypoint (walk): Act ${act} → ${name}`);

      // 1) Ensure waypoint pedestal is visible; if not, screen-walk to reveal it
      let wp = await findOnScreen(ctx, UI_TAGS.waypointIcon, 8000, 0.82);
      if (!wp) {
        await walkToRevealWaypoint(ctx);
        wp = await findOnScreen(ctx, UI_TAGS.waypointIcon, 8000, 0.8);
        if (!wp) throw new Error("waypoint not found on screen (walk)");
      }

      // 2) Approach: click a point ~80px toward center from the pedestal to avoid misclicks
      const approach = toward(wp.screen, CENTER, 80);
      await clickTo(approach);
      await sleep(700); // give char time to step in

      // 3) Open WP UI: click directly on pedestal (jitter retries)
      await clickOn(wp.screen, 3, 6);

      // 4) Select Act tab (template-driven)
      const actTag = UI_TAGS.tabs[act] ?? UI_TAGS.tabs[3];
      const tab = await waitFind(ctx, actTag, 3000, 0.8);
      await clickOn(tab.screen);

      // 5) Select entry (scroll until found)
      const entryTag = UI_TAGS.entries[name] ?? UI_TAGS.entries["Durance of Hate Level 2"];
      let entry = await ctx.vision.find(entryTag, { minScore: 0.8 });
      let tries = 8;
      while (!entry && tries-- > 0) {
        scrollDown(160);
        await sleep(120);
        entry = await ctx.vision.find(entryTag, { minScore: 0.8 });
      }
      if (!entry) throw new Error(`waypoint entry not found: ${name}`);

      await clickOn(entry.screen);
      await sleep(300);

      // We don't update `cur` (tile coords) here; keep as-is until you wire area anchors.
    },

    // unchanged stubs below; keep your previous implementations
    path(state, target) { return [target]; },

    async teleport(pos, ctx) { // not used in town, but used in dungeons
      log.info(`[world] teleport -> ${pos.x},${pos.y}`);
      await ctx.cast.at("Teleport", pos);
      robot.mouseClick("right");
      cur = { x: pos.x, y: pos.y };
    },

    async teleportRelative({ dx, dy }, ctx) {
      const next = { x: cur.x + dx, y: cur.y + dy };
      await this.teleport(next, ctx);
    },

    async useExit(name)      { log.info(`[world] useExit: ${name}`); },
    async openTP()           { log.info("[world] open TP (TODO)"); },
    async takeTP()           { log.info("[world] take TP (TODO)"); },
    async townFallback()     { log.warn("[world] townFallback (TODO)"); },
    async stashAll()         { log.info("[world] stashAll (TODO)"); },
    async repairIfNeeded()   { log.info("[world] repairIfNeeded (TODO)"); },
    async fillBelt()         { log.info("[world] fillBelt (TODO)"); },
    async identify()         { log.info("[world] identify (TODO)"); },
    async loot()             { log.info("[world] loot (TODO)"); },
    isWalkable(_) { return true; },
    computeMoatPerch(mephApprox) { return { x: mephApprox.x - 8, y: mephApprox.y }; }
  };

  /* ---------- helpers (screen-walk) ---------- */

  async function findOnScreen(ctx, tag, timeoutMs, minScore) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const hit = await ctx.vision.find(tag, { minScore });
      if (hit?.screen) return hit;
      await sleep(60);
    }
    return null;
  }

  function toward(from, to, insetPx) {
    const vx = to.x - from.x, vy = to.y - from.y;
    const len = Math.max(1, Math.hypot(vx, vy));
    return { x: Math.round(from.x + (vx/len) * insetPx), y: Math.round(from.y + (vy/len) * insetPx) };
    // “from” is pedestal; this returns a point slightly toward the player/camera.
  }

  async function clickTo(screenPt) {
    moveMouse(screenPt.x, screenPt.y);
    click(MOVE_BUTTON);
  }

  async function clickOn(screenPt, retries = 1, jitterPx = 0) {
    for (let i = 0; i < retries; i++) {
      const jx = (Math.random()*2-1) * jitterPx;
      const jy = (Math.random()*2-1) * jitterPx;
      moveMouse(Math.round(screenPt.x + jx), Math.round(screenPt.y + jy));
      click("left");
      await sleep(120);
    }
  }

  async function walkToRevealWaypoint(ctx) {
    // Spiral clicks around the center to walk and reveal the pedestal
    const RINGS = [120, 220, 320, 420];  // pixels
    const DIRS = 8;
    for (const R of RINGS) {
      for (let i = 0; i < DIRS; i++) {
        const a = (i / DIRS) * Math.PI * 2;
        const p = { x: Math.round(CENTER.x + Math.cos(a) * R), y: Math.round(CENTER.y + Math.sin(a) * R) };
        await clickTo(p);
        await sleep(300);
        const seen = await ctx.vision.find(UI_TAGS.waypointIcon, { minScore: 0.8 });
        if (seen?.screen) return;
      }
    }
  }
}

// Blizzard Sorc — Mephisto moat run (state machine)

const CFG = {
    maxSearchTimeMs: 45000,
    blizzardCycleMs: 6500,
    maxCycles: 14,
    staticMinHPPercent: 50,
    moatPerch: { x: 17562, y: 8069 },
    bossHint:  { x: 17591, y: 8071 },
    lootWhitelist: [
      "The Oculus","Skin of the Vipermagi","Arachnid Mesh","War Traveler",
      "Magefist","Frostburn","Lidless Wall","Tal Rasha's Adjudication",
      "Tal Rasha's Fine-Spun Cloth","Gull Dagger"
    ]
  };
  
  export default async function RunMephisto(ctx, { signal }) {
    const { wp, nav, vision, cast, town, loot, log, app } = ctx;
  
    const abortIf = () => { if (signal?.aborted) throw new Error("aborted"); };
    const wait = (ms) => nav.sleep(ms);
  
    try {

      console.log("preRunning...")
      await preRun(ctx); abortIf();
      console.log("Ran.")
  
      console.log("Waypoint Time...")
      await wp.use({ act: 3, name: "Durance of Hate Level 2" }, ctx); abortIf();
      console.log("Waypointed.")

      console.log("nav.sync()...")
      await nav.sync();
      console.log("nav.sanc().")
      
      await findStairs(ctx); abortIf();
      await nav.activateExit("Durance of Hate Level 3"); abortIf();
      await nav.sync();
  
      await clearEntranceIfNeeded(ctx); abortIf();
  
      const mephApprox = await vision.approxBossPos("Mephisto", CFG.bossHint);
      const perch = await nav.resolveMoatPerch(mephApprox, CFG.moatPerch);
      await nav.teleChain(perch, ctx.app.fcrPauseMs); abortIf();
      await wait(150);
  
      await pullMeph(ctx); abortIf();
  
      await staticToHalf(ctx); abortIf();
      await blizzardCycles(ctx); abortIf();
  
      await wait(250);
      await loot.pick({ whitelist: CFG.lootWhitelist, gold: true, potions: true });
  
      await nav.openTownPortal();
      await nav.takeTownPortal();
  
      await town.stashAll();
      await town.repairIfNeeded();
      await town.identify({ keepList: true });
  
      return true;
    } catch (e) {
      log.warn(`[Meph] fail: ${e?.message || e}`);
      await safeTown(ctx);
      return false;
    }
  }
  
  /* steps */
  
  async function preRun(ctx) {
    await ctx.focus.focusGameWindow();
    ctx.focus.centerMouse();

    await ctx.town.ensureReady({ belt: true, idScrolls: true, repair: false });
    await ctx.cast.buff("FrozenArmor").catch(() => {});
    // await ctx.cast.buff("BattleOrders").catch(() => {});
  }


  async function findStairs(ctx) {
    const { vision, nav, log, app } = ctx;
    const t0 = Date.now();
  
    // Quick local check first (maybe stairs are on-screen)
    let stairs = await vision.find("exit_durance3", { minScore: 0.82 });
    if (stairs) {
      await nav.teleChain(stairs.pos, app.fcrPauseMs);
      return;
    }
  
    // Center of scan: current pos
    const origin = await ctx.nav.getPos();
  
    // 24-direction starburst; step out up to ~160 tiles, checking template each hop
    const DIRS = 24;
    const MAX_R = 160;
    const STEP = 12;
  
    const angles = Array.from({ length: DIRS }, (_, i) => (i / DIRS) * Math.PI * 2);
    const spokes = angles.map(a => ({ dx: Math.cos(a), dy: Math.sin(a) }));
  
    for (let r = STEP; r <= MAX_R; r += STEP) {
      for (const s of spokes) {
        if (Date.now() - t0 > CFG.maxSearchTimeMs) throw new Error("stairs not found");
        const hop = { x: Math.round(origin.x + s.dx * r), y: Math.round(origin.y + s.dy * r) };
        await nav.teleChain(hop, app.fcrPauseMs);
  
        // After each hop, try to detect stairs
        stairs = await vision.find("exit_durance3", { minScore: 0.82 });
        if (stairs) {
          log.debug(`[stairs] found at ${stairs.pos.x},${stairs.pos.y}, r=${r}`);
          await nav.teleChain(stairs.pos, app.fcrPauseMs);
          return;
        }
      }
    }
  
    // Last resort: small spiral walk to snag the template if we were close but off-screen
    const SPIRAL = [
      { dx:  8, dy:  0 }, { dx:  0, dy:  8 }, { dx: -8, dy:  0 }, { dx:  0, dy: -8 },
      { dx: 12, dy:  0 }, { dx:  0, dy: 12 }, { dx: -12, dy: 0 }, { dx: 0, dy: -12 }
    ];
    for (const step of SPIRAL) {
      await nav.teleNudge(step);
      stairs = await vision.find("exit_durance3", { minScore: 0.82 });
      if (stairs) {
        await nav.teleChain(stairs.pos, app.fcrPauseMs);
        return;
      }
    }
  
    throw new Error("stairs not found");
  }
  
  
  async function clearEntranceIfNeeded(ctx) {
    const threats = await ctx.vision.threats({ radius: 12, kinds: ["doll", "council", "bloodlord"] });
    if (threats.length) await ctx.combat.freezePack(threats);
  }
  
  async function pullMeph(ctx) {
    await ctx.nav.teleNudge({ dx: 6, dy: 0 });
    await ctx.nav.sleep(60);
    await ctx.nav.teleNudge({ dx: -6, dy: 0 });
    await ctx.nav.sleep(150);
  }
  
  async function staticToHalf(ctx) {
    while (await ctx.vision.isAlive("Mephisto") &&
           (await ctx.vision.hpPercent("Mephisto")) > CFG.staticMinHPPercent) {
      const p = await ctx.vision.pos("Mephisto");
      if (!p) break;
      await ctx.cast.at("StaticField", p);
      await ctx.nav.sleep(80);
    }
  }
  
  async function blizzardCycles(ctx) {
    let cycles = 0;
    while (await ctx.vision.isAlive("Mephisto")) {
      if (cycles++ > CFG.maxCycles) throw new Error("kill timeout");
      const p = await ctx.vision.pos("Mephisto");
      if (!p) break;
  
      await ctx.cast.at("Blizzard", p);
      const t0 = Date.now();
      while (Date.now() - t0 < CFG.blizzardCycleMs && await ctx.vision.isAlive("Mephisto")) {
        const q = await ctx.vision.pos("Mephisto");
        if (!q) break;
        await ctx.cast.at("IceBlast", q);
        await ctx.nav.sleep(90);
      }
    }
  }
  
  async function safeTown(ctx) {
    try {
      await ctx.nav.openTownPortal();
      await ctx.nav.takeTownPortal();
    } catch {
      await ctx.wp.townFallback();
    }
  }
  
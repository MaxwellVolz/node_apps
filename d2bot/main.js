// Entry: wires deps, loads config/runlist, runs bots with timeouts/abort.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { createContext } from "./core/context.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadJSON(relPath) {
  const p = path.join(__dirname, relPath);
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function dynamicImport(modulePath) {
  // Works for both bare names and absolute paths
  return import(modulePath);
}

function createLogger(level = "info") {
  const levels = ["error", "warn", "info", "debug", "trace"];
  const idx = levels.indexOf(level);
  const ok = (l) => levels.indexOf(l) <= idx;
  const ts = () => new Date().toISOString().slice(11, 23); // HH:mm:ss.mmm
  return {
    error: (...a) => ok("error") && console.error(`[${ts()}]`, ...a),
    warn:  (...a) => ok("warn")  && console.warn(`[${ts()}]`, ...a),
    info:  (...a) => ok("info")  && console.log(`[${ts()}]`, ...a),
    debug: (...a) => ok("debug") && console.log(`[${ts()}]`, ...a),
    trace: (...a) => ok("trace") && console.log(`[${ts()}]`, ...a)
  };
}

async function buildDeps(app) {
  const log = createLogger(app.logLevel);

  // Input backend (kbm or vigem)
  const input = (await dynamicImport(`./services/input/${app.inputBackend}.js`)).createInput(log);

  // Vision adapter (OpenCV.js etc.)
  const detect = (await dynamicImport(`./services/detect/${app.vision}.js`)).createDetector(log);

  // Aim/world services are placeholders—implement internals behind these facades
  const aim   = (await dynamicImport("./services/aim.js")).createAim(log);
  const world = (await dynamicImport("./services/world.js")).createWorld(log);

  // Timers
  const timers = { sleep };

  return { log, input, detect, aim, world, timers, app };
}

async function runBotOnce(ctx, botName, timeoutMs) {
  const ctrl = new AbortController();
  const { signal } = ctrl;

  const botModulePath = pathToFileURL(path.join(__dirname, "bots", `${botName}.js`)).href;
  const bot = (await dynamicImport(botModulePath)).default;

  // Hard timeout per run
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    ctx.log.info(`[core] starting bot: ${botName}`);
    const ok = await bot(ctx, { signal });
    ctx.log.info(`[core] bot finished: ${botName} -> ${ok ? "OK" : "FAIL"}`);
    return ok;
  } catch (err) {
    ctx.log.warn(`[core] bot error: ${err?.message || err}`);
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const app = await loadJSON("config/app.json");
  const runlist = await loadJSON("config/runlist.json");
  const deps = await buildDeps(app);
  const ctx = createContext(deps);

  let runCounter = 0;
  let i = 0;

  // graceful shutdown
  let stopping = false;
  const stop = () => { if (!stopping) { stopping = true; deps.log.warn("[core] stopping…"); } };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    for (i = 0; i < runlist.sequence.length && !stopping; i++) {
      const step = runlist.sequence[i];
      if (!step.enabled) continue;
      const ok = await runBotOnce(ctx, step.bot, app.runTimeoutMs);
      runCounter++;

      // stash/repair cadence
      if (runCounter % (runlist.townEveryNRuns ?? 2) === 0) {
        await ctx.town.repairIfNeeded();
        await ctx.town.stashAll();
      }

      // small breather to avoid hammering timers/anticheat heuristics
      await deps.timers.sleep(250);
    }
    if (!runlist.repeat) break;
  }

  deps.log.info("[core] exit");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

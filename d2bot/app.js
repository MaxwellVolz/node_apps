// deps: npm i node-window-manager robotjs pngjs
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { windowManager } from "node-window-manager";
import robot from "robotjs";
import { in_screen, on_desktop } from "./scripts/detect.mjs"; // unchanged

// ---------- constants ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const RESOLVE = (...p) => path.resolve(__dirname, ...p); // all paths relative to THIS script

// ---------- utils ----------
async function loadJSON(rel) {
  const p = RESOLVE(rel);
  const txt = await fsp.readFile(p, "utf8");
  return JSON.parse(txt);
}

function getWindowByTitle(pattern) {
  const re = new RegExp(pattern, "i");
  const wins = windowManager.getWindows().filter(w => re.test(w.getTitle() || ""));
  wins.sort((a, b) => {
    const A = a.getBounds(), B = b.getBounds();
    return (B.width * B.height) - (A.width * A.height);
  });
  return wins[0] || null;
}

async function focusWindow(win) {
  win.bringToTop();
  try { win.focus(); } catch {}
  await sleep(120);
  console.log(`[focus] "${win.getTitle()}"`);
}

// ---------- click helpers ----------
function clickAbs(x, y) {
  robot.moveMouse(x, y);
  robot.mouseClick("left");
}

async function clickAndMarkAbs(x, y, label = "click_mark") {
  robot.moveMouse(x, y);
  robot.mouseClick("left");

  // capture full screen to verify click
  const s = robot.getScreenSize();
  const shot = robot.screen.capture(0, 0, s.width, s.height);
  const { PNG } = await import("pngjs").then(m => m.default);

  const png = new PNG({ width: s.width, height: s.height });
  const src = shot.image, bpp = shot.bytesPerPixel, pitch = shot.byteWidth;
  for (let yy = 0; yy < s.height; yy++) {
    for (let xx = 0; xx < s.width; xx++) {
      const si = yy * pitch + xx * bpp, di = (yy * s.width + xx) * 4;
      png.data[di + 0] = src[si + 2];
      png.data[di + 1] = src[si + 1];
      png.data[di + 2] = src[si + 0];
      png.data[di + 3] = 255;
    }
  }

  // mark click point
  const set = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) return;
    const i = (yy * png.width + xx) * 4;
    png.data[i] = 0; png.data[i + 1] = 255; png.data[i + 2] = 0; png.data[i + 3] = 255;
  };
  for (let d = -10; d <= 10; d++) { set(x + d, y); set(x, y + d); }

  const outDir = RESOLVE("debug");
  await fsp.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${Date.now()}_${label}.png`);
  await fsp.writeFile(file, PNG.sync.write(png));
  console.log("[clicked]", x, y, "->", file);
}

// ---------- main ----------
async function main() {
  const app = await loadJSON("config/app.json");

  app.windowTitlePattern ??= "diablo";
  app.clicks ??= {
    town1: { x: 1000, y: 700 },
    town2: { x: 1050, y: 720 },
    town3: { x: 1100, y: 740 },
    town4: { x: 1200, y: 760 },
  };

  // 1) focus window
  const win = getWindowByTitle(app.windowTitlePattern);
  if (!win) throw new Error(`window not found: /${app.windowTitlePattern}/i`);
  await focusWindow(win);

  // 2) wait for play/login button
  let anchor = null;
  while (true) {
    const hit = await in_screen(win, RESOLVE("refs/play.png"), 0.95, "play");
    console.log(`[play] ok=${hit.ok} score=${hit.score.toFixed(3)} at ${hit.x},${hit.y}`);
    if (hit.ok) {
      anchor = hit;
      await clickAndMarkAbs(hit.x, hit.y, "play_click");
      await sleep(400);
      break;
    }
    await sleep(1000);
  }

  // go nightmare
  while (true) {
    const hit = await in_screen(win, RESOLVE("refs/nightmare.png"), 0.95, "play");
    console.log(`[play] ok=${hit.ok} score=${hit.score.toFixed(3)} at ${hit.x},${hit.y}`);
    if (hit.ok) {
      await clickAndMarkAbs(hit.x+100, hit.y+100, "nightmare");
      await sleep(400);
      break;
    }
    await sleep(1000);
  }

  await sleep(10000);


  // 4) town screens
  const towns = [
    { ref: "refs/town_1.png", click: app.clicks.town1, tag: "town_1" },
    { ref: "refs/town_2.png", click: app.clicks.town2, tag: "town_2" },
    { ref: "refs/town_3.png", click: app.clicks.town3, tag: "town_3" },
  ];
  for (const t of towns) {
    const hit = await in_screen(win, RESOLVE(t.ref), 0.80, t.tag);
    console.log(`[${t.tag}] ok=${hit.ok} score=${hit.score.toFixed(3)} at ${hit.x},${hit.y}`);
    if (hit.ok) {
      await clickAndMarkAbs(hit.x + t.click.x, hit.y + t.click.y, `${t.tag}_click`);
      await sleep(400);
    }
  }

  // 5) waypoint
  const wp = await in_screen(win, RESOLVE("refs/waypoint_fire.png"), 0.80, "waypoint_fire");
  console.log(`[waypoint_fire] ok=${wp.ok} score=${wp.score.toFixed(3)} at ${wp.x},${wp.y}`);
  if (wp.ok) {
    await clickAndMarkAbs(wp.x + Math.floor(wp.w / 2), wp.y + Math.floor(wp.h / 2), "waypoint_click");
  }
}

main().catch(e => { console.error("[fatal]", e); process.exit(1); });

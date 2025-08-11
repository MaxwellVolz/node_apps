// scripts/bundle-native.js
import { mkdir, cp, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const out = (p) => path.join(root, 'build', 'native', p);

async function exists(p){ try{ await stat(p); return true; } catch{ return false; } }

async function findAddonRoot() {
  const candidates = [
    path.join(root, 'node_modules', 'opencv4nodejs-prebuilt-install'),
    path.join(root, 'node_modules', '@u4', 'opencv4nodejs'),
    path.join(root, 'node_modules', 'opencv4nodejs'),
  ];
  for (const c of candidates) if (await exists(c)) return c;
  throw new Error('OpenCV addon package not found in node_modules');
}

async function findAddonBinary(modRoot) {
  // Common locations
  const usual = [
    path.join(modRoot, 'build', 'Release', 'opencv4nodejs.node'),
    path.join(modRoot, 'prebuilds', 'win32-x64', 'node.napi.node'),
    path.join(modRoot, 'prebuilds', 'win32-x64', 'opencv4nodejs.node'),
  ];
  for (const p of usual) if (await exists(p)) return p;

  // Fallback: recursive scan for a single .node file under the module
  async function* walk(dir) {
    for (const name of await readdir(dir)) {
      const p = path.join(dir, name);
      const st = await stat(p);
      if (st.isDirectory()) yield* walk(p);
      else if (st.isFile() && p.endsWith('.node')) yield p;
    }
  }
  for await (const p of walk(modRoot)) return p;

  throw new Error('Could not locate opencv .node file under ' + modRoot);
}

async function copyOpenCV() {
  const modRoot = await findAddonRoot();
  const addonBin = await findAddonBinary(modRoot);

  // Try to find DLLs (if present)
  const dllRoots = [
    path.join(root, 'node_modules', '@u4', 'opencv-build', 'opencv', 'build', 'bin'),
    path.join(modRoot, 'opencv-build', 'opencv', 'build', 'bin')
  ];

  const addonName = path.basename(addonBin);
  await mkdir(out('opencv/build/Release'), { recursive: true });
  await cp(addonBin, out(`opencv/build/Release/${addonName}`));

  await mkdir(out('opencv/bin'), { recursive: true });
  for (const d of dllRoots) {
    if (await exists(d)) {
      await cp(d, out('opencv/bin'), { recursive: true });
      break;
    }
  }

  const idx = `
    const path = require('path');
    const addonPath = path.join(__dirname, 'build', 'Release', '${addonName}');
    module.exports = require(addonPath);
  `;
  await writeFile(out('opencv/index.cjs'), idx);
  console.log('[bundle-native] copied addon:', addonBin);
}

await copyOpenCV();

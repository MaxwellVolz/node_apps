import pkg from "pngjs";
const { PNG } = pkg;
import { promises as fsp } from "node:fs";
import path from "node:path";

const png = new PNG({ width: 4, height: 4 });
for (let i = 0; i < png.data.length; i += 4) {
  png.data[i+0] = 255; // R
  png.data[i+1] = 0;   // G
  png.data[i+2] = 0;   // B
  png.data[i+3] = 255; // A
}

const outDir = path.resolve(process.cwd(), "debug");
await fsp.mkdir(outDir, { recursive: true });
const out = path.join(outDir, "smoke.png");
await fsp.writeFile(out, pkg.PNG.sync.write(png));
console.log("WROTE:", out);

import { createDetector } from "../detect/diag.js";

const detect = createDetector(console);
console.log("probe: starting");
const hit = await Promise.race([
  detect.findTemplate("wp_icon", { minScore: 0.8 }),
  new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2000)),
]);
console.log("probe: wp_icon =", hit);

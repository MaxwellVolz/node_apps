import screenshot from "screenshot-desktop";
import sharp from "sharp";

export async function ss(region = { left: 1700, top: 90, width: 200, height: 200 }) {
  const screen = await screenshot({ format: "png" });
  const cropped = await sharp(screen)
    .extract(region)
    .resize(100, 100) // normalize for template matching
    .grayscale()
    .toBuffer();

  return cropped;
}


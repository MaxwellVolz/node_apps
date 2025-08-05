import cv from "opencv4nodejs-prebuilt-install";
import fs from "fs";
import path from "path";

export async function matchMinimapToTemplates(minimapBuf, templatesDir) {
  const src = cv.imdecode(minimapBuf);
  let bestMatch = null;
  let bestScore = -1;

  for (const file of fs.readdirSync(templatesDir)) {
    const templatePath = path.join(templatesDir, file);
    const templateImg = cv.imread(templatePath);
    const result = src.matchTemplate(templateImg, cv.TM_CCOEFF_NORMED);
    const { maxVal } = result.minMaxLoc();

    if (maxVal > bestScore) {
      bestScore = maxVal;
      bestMatch = file;
    }
  }

  return { bestMatch, score: bestScore };
}

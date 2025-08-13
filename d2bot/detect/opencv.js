// OpenCV.js/WASM adapter. Replace TODOs with real detection.

export function createDetector(log) {
    return {
      async findTemplate(tag) {
        log.trace(`[detect] findTemplate: ${tag}`);
        // TODO: matchTemplate + minMaxLoc
        return null;
      },
      async findBoss(name, hint) {
        log.trace(`[detect] findBoss: ${name}`);
        // TODO: template/feature detection
        return null; // { pos: {x,y}, dead: false }
      },
      async hpBarRead(name) {
        log.trace(`[detect] hpBarRead: ${name}`);
        // TODO: OCR/percent estimate
        return 100;
      },
      async nearby({ radius, kinds }) {
        log.trace(`[detect] nearby: r=${radius} kinds=${kinds?.join(",")}`);
        return [];
      }
    };
  }
  
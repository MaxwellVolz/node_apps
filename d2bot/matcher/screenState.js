// matcher/screenStates.js
import path from "node:path";

const base = path.resolve("data/ui");

export const SCREEN_STATES = {
  MAIN_MENU: [
    path.join(base, "main_online.png"),
    path.join(base, "main_offline.png"),
  ],
  REALM_SELECT: [
    path.join(base, "realm_west.png"),
    path.join(base, "realm_east.png"),
  ],
  CHARACTER_SELECT: [
    path.join(base, "char_select.png"),
  ],
  DIFFICULTY_SELECT: [
    path.join(base, "diff_normal.png"),
    path.join(base, "diff_nightmare.png"),
    path.join(base, "diff_hell.png"),
  ],
  IN_GAME_HUD: [
    path.join(base, "hud_globe_health.png"),
    path.join(base, "hud_globe_mana.png"),
  ],
  DEATH_SCREEN: [
    path.join(base, "you_have_died.png"),
  ]
};

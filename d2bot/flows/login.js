// flows/login.js
import path from "node:path";
import { captureScreen } from "../capture/screenshot.js";
import { findAnyTemplate, findTemplateOnScreen } from "../matcher/findTemplate.js";
import { humanMoveAndClick } from "../input/humanInput.js";

const UI = {
    MAIN_ONLINE: ["data/ui/main_online.png", "data/ui/main_play_online.png"],
    MAIN_OFFLINE: ["data/ui/main_offline.png", "data/ui/main_play_offline.png"],
    REALM_WEST: ["data/ui/realm_west.png"],
    CHARACTER_SELECT: ["data/ui/char_select.png"],
    PLAY: ["data/ui/play.png", "data/ui/start_game.png"],
    DIFF_NIGHTMARE: ["data/ui/diff_nightmare.png"],
    DIFF_HELL: ["data/ui/diff_hell.png"],
};

// Approx anchors for slot list region relative to the detected CHARACTER_SELECT label.
// Calibrate these per your resolution/UI scale.
const SLOT_ANCHOR_OFFSET = { x: 0, y: 80 }; // pixels below the 'Character Select' label
const SLOT_VERTICAL_SPACING = 72;           // distance between slots in pixels
const SLOT_CLICK_OFFSET_X = 180;            // click a bit into the slot row


async function waitAndClickAny(templates, { timeoutMs = 8000, threshold = 0.86 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const screen = await captureScreen();
        const hit = await findAnyTemplate(screen, templates, { threshold });
        if (hit.ok) {
            await humanMoveAndClick(hit.x, hit.y, 3);
            return hit;
        }
        await new Promise(r => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for templates: ${templates.map(p => path.basename(p)).join(", ")}`);
}

async function ensureVisible(templates, { timeoutMs = 8000, threshold = 0.86 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const screen = await captureScreen();
        const hit = await findAnyTemplate(screen, templates, { threshold });
        if (hit.ok) return hit;
        await new Promise(r => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for visibility: ${templates.map(p => path.basename(p)).join(", ")}`);
}

async function clickCharacterSlot(slotIndex /* 1..8 */) {
    // We use the position of the CHARACTER_SELECT template as an anchor,
    // then click at a computed offset for the requested slot.
    const screen = await captureScreen();
    const anchor = await findAnyTemplate(screen, UI.CHARACTER_SELECT, { threshold: 0.80 });
    if (!anchor.ok) throw new Error('Character Select anchor not visible');

    const baseX = anchor.x + SLOT_ANCHOR_OFFSET.x;
    const baseY = anchor.y + SLOT_ANCHOR_OFFSET.y;
    const y = baseY + (slotIndex - 1) * SLOT_VERTICAL_SPACING;
    const x = baseX + SLOT_CLICK_OFFSET_X;

    await humanMoveAndClick(x, y, 3);
    // Small settle delay
    await new Promise(r => setTimeout(r, 300));
}


/**
 * Minimal login flow:
 * - Detect Main Menu
 * - Choose Online/Offline
 * - Select Realm (if online)
 * - Ensure Character Select visible
 * - Choose difficulty
 * - Click Play / Start
 */
export async function login(config) {
    const online = (config.mode ?? "Online").toLowerCase() === "online";
    const difficulty = (config.difficulty ?? "Nightmare");

    // 1) Main Menu → choose Online/Offline
    if (online) {
        await waitAndClickAny(UI.MAIN_ONLINE);
    } else {
        await waitAndClickAny(UI.MAIN_OFFLINE);
    }

    // 2) Realm (only if online)
    if (online && config.realm?.toLowerCase() === "west") {
        await waitAndClickAny(UI.REALM_WEST);
    }

    // 3) Character select visible
    await ensureVisible(UI.CHARACTER_SELECT);

    // 3a) Select character slot (stubbed, based on anchor + offsets)
    if (Number.isInteger(config.characterSlot)) {
        await clickCharacterSlot(config.characterSlot);
    }


    // 4) Difficulty (Nightmare/Hell)
    if (difficulty === "Nightmare") {
        await waitAndClickAny(UI.DIFF_NIGHTMARE);
    } else if (difficulty === "Hell") {
        await waitAndClickAny(UI.DIFF_HELL);
    }

    // 5) Play / Start
    await waitAndClickAny(UI.PLAY, { timeoutMs: 12000 });

    return true;
}

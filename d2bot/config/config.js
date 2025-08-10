// config/config.js
import { readFile, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const CONFIG_PATH = path.resolve('config.json');

const DEFAULTS = {
  motd: 'suh',
  difficulty: 'Nightmare',
  realm: 'West',
  character: 'Sorc_Boi',
};

function validate(cfg) {
  const errors = [];
  const diffs = ['Normal', 'Nightmare', 'Hell'];
  const modes = ['Online', 'Offline'];

  if (!cfg.motd || typeof cfg.motd !== 'string') errors.push('motd must be a non-empty string');
  if (!diffs.includes(cfg.difficulty)) errors.push(`difficulty must be one of: ${diffs.join(', ')}`);
  if (!cfg.realm) errors.push('realm is required');
  if (!cfg.character) errors.push('character is required');

  if (!modes.includes(cfg.mode)) errors.push(`mode must be one of: ${modes.join(', ')}`);
  if (!Number.isInteger(cfg.characterSlot) || cfg.characterSlot < 1 || cfg.characterSlot > 8) {
    errors.push('characterSlot must be an integer between 1 and 8');
  }

  if (errors.length) {
    const e = new Error('Invalid config:\n - ' + errors.join('\n - '));
    e.code = 'CONFIG_INVALID';
    throw e;
  }
}


function applyEnvOverrides(cfg) {
  const map = {
    D2BOT_MOTD: 'motd',
    D2BOT_DIFFICULTY: 'difficulty',
    D2BOT_REALM: 'realm',
    D2BOT_CHARACTER: 'character',
    D2BOT_MODE: 'mode',                 // NEW
    D2BOT_CHARACTER_SLOT: 'characterSlot' // NEW
  };
  for (const [envKey, key] of Object.entries(map)) {
    if (process.env[envKey] != null) {
      const v = process.env[envKey];
      cfg[key] = key === 'characterSlot' ? Number(v) : v;
    }
  }
}


export async function loadConfig({ withEnv = true } = {}) {
  let raw;
  try {
    raw = await readFile(CONFIG_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read ${CONFIG_PATH}: ${err.message}`);
  }

  let cfg;
  try {
    cfg = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (err) {
    throw new Error(`Failed to parse ${CONFIG_PATH}: ${err.message}`);
  }

  if (withEnv) applyEnvOverrides(cfg);
  validate(cfg);
  return cfg;
}

export async function saveConfig(nextCfg) {
  validate(nextCfg);
  await writeFile(CONFIG_PATH, JSON.stringify(nextCfg, null, 2) + '\n', 'utf8');
  return nextCfg;
}

export function mergePatch(cfg, patch) {
  const next = { ...cfg };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    next[k] = v;
  }
  return next;
}

export function watchConfig(onReload) {
  // Lightweight hot-reload (coalesced)
  let timer = null;
  const w = watch(CONFIG_PATH, { persistent: false }, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const fresh = await loadConfig();
        onReload?.(fresh);
      } catch (e) {
        console.error('[config] reload failed:', e.message);
      }
    }, 75);
  });
  return () => w.close();
}

// Open in $EDITOR or fallbacks (Windows: notepad)
export async function editConfigInEditor() {
  const editor =
    process.env.EDITOR ||
    (process.platform === 'win32' ? 'notepad' : 'vi');

  await new Promise((res, rej) => {
    const child = spawn(editor, [CONFIG_PATH], { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${editor} exited ${code}`))));
    child.on('error', rej);
  });
}

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
  if (!cfg.motd || typeof cfg.motd !== 'string') errors.push('motd must be a non-empty string');
  const diffs = ['Normal', 'Nightmare', 'Hell'];
  if (!diffs.includes(cfg.difficulty)) errors.push(`difficulty must be one of: ${diffs.join(', ')}`);
  if (!cfg.realm) errors.push('realm is required');
  if (!cfg.character) errors.push('character is required');

  if (errors.length) {
    const e = new Error('Invalid config:\n - ' + errors.join('\n - '));
    e.code = 'CONFIG_INVALID';
    throw e;
  }
}

function applyEnvOverrides(cfg) {
  // e.g. D2BOT_MOTD="yo"
  const map = {
    D2BOT_MOTD: 'motd',
    D2BOT_DIFFICULTY: 'difficulty',
    D2BOT_REALM: 'realm',
    D2BOT_CHARACTER: 'character',
  };
  for (const [envKey, pathKey] of Object.entries(map)) {
    if (process.env[envKey]) cfg[pathKey] = process.env[envKey];
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

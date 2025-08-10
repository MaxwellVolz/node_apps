// cli/configCli.js
import { loadConfig, saveConfig, mergePatch, editConfigInEditor } from '../config/config.js';
import { stdout } from 'node:process';

function print(obj) {
  stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

export async function handleConfigCli(argv) {
  // Usage:
  //   node app.js config print
  //   node app.js config get motd
  //   node app.js config set motd "hello"
  //   node app.js config edit
  //   node app.js config list
  const cmd = argv[0];

  switch (cmd) {
    case 'print': {
      const cfg = await loadConfig();
      print(cfg);
      return 0;
    }
    case 'list': {
      const cfg = await loadConfig();
      print(Object.keys(cfg));
      return 0;
    }
    case 'get': {
      const key = argv[1];
      if (!key) throw new Error('config get <key>');
      const cfg = await loadConfig();
      print({ [key]: cfg[key] });
      return 0;
    }
    case 'set': {
      const key = argv[1];
      const value = argv[2];
      if (!key) throw new Error('config set <key> <value>');
      const cfg = await loadConfig();
      const next = mergePatch(cfg, { [key]: coerce(value) });
      await saveConfig(next);
      print({ ok: true, key, value: next[key] });
      return 0;
    }
    case 'edit': {
      await editConfigInEditor();
      const cfg = await loadConfig();
      print({ ok: true, cfg });
      return 0;
    }
    default:
      throw new Error(
        `Unknown config subcommand: ${cmd}\n` +
          `Commands: print | list | get <k> | set <k> <v> | edit`
      );
  }
}

function coerce(v) {
  // Try to coerce booleans/numbers/json, else string
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (!Number.isNaN(Number(v)) && v.trim() !== '') return Number(v);
  try {
    const j = JSON.parse(v);
    if (j && typeof j === 'object') return j;
  } catch {}
  return v;
}

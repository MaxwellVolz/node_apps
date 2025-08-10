import { loadConfig, watchConfig } from './config/config.js';
import { handleConfigCli } from './cli/configCli.js';
import { login } from './flows/login.js';

const [,, cmd, ...rest] = process.argv;

if (cmd === 'config') {
  try {
    const code = await handleConfigCli(rest);
    process.exit(code ?? 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}


if (cmd === 'monitor') {
  const cfg = await loadConfig();
  const intervalSec = cfg.screenCheckInterval ?? 5; // default 5s

  console.log(`[monitor] Checking screen every ${intervalSec}s...`);
  setInterval(async () => {
    const result = await detectScreen();
    if (result.ok) {
      console.log(`[monitor] ${result.state} (${(result.confidence*100).toFixed(1)}%)`);
    } else {
      console.log(`[monitor] Unknown screen`);
    }
  }, intervalSec * 1000);

  // Keep process alive
  process.stdin.resume();
  process.exitCode = 0; // optional
}

if (cmd === 'login') {
  const cfg = await loadConfig();
  console.log('[bot] login flow…');
  try {
    await login(cfg);
    console.log('[bot] login complete');
  } catch (e) {
    console.error('[bot] login failed:', e.message);
    process.exit(1);
  }
  process.exit(0);
}

// --- default runtime ---
let config = await loadConfig();
console.log(`[bot] starting with character=${config.character}, realm=${config.realm}, difficulty=${config.difficulty}`);
console.log(`[bot] motd: ${config.motd}`);

const closeWatch = watchConfig((fresh) => {
  config = fresh;
  console.log('[bot] config reloaded:', { character: config.character, difficulty: config.difficulty });
});

process.on('SIGINT', () => {
  closeWatch();
  process.exit(0);
});

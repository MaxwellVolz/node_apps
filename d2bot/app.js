import { loadConfig, watchConfig } from './config/config.js';
import { handleConfigCli } from './cli/configCli.js';

const [,, cmd, ...rest] = process.argv;

if (cmd === 'config') {
  // CLI mode
  try {
    const code = await handleConfigCli(rest);
    process.exit(code ?? 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

// --- Bot runtime mode ---
let config = await loadConfig();

console.log(`[bot] starting with character=${config.character}, realm=${config.realm}, difficulty=${config.difficulty}`);
console.log(`[bot] motd: ${config.motd}`);

const closeWatch = watchConfig((fresh) => {
  config = fresh;
  console.log('[bot] config reloaded:', { character: config.character, difficulty: config.difficulty });
});

// Your bot loop entry would go here.
// e.g., startModules(config);

// Clean shutdown
process.on('SIGINT', () => {
  closeWatch();
  process.exit(0);
});

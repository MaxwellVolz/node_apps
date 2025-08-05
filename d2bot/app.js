import { writeFile, readFile } from 'node:fs/promises';

let config;

try {
  const configRaw = await readFile('config.json', 'utf8');
  config = JSON.parse(configRaw);
} catch (err) {
  console.error('Failed to read or parse config.json:', err.message);
  process.exit(1);
}

const motd = config.motd;

if (!motd) {
  console.error('Missing `motd` in config.json');
  process.exit(1);
}
else{
    console.log(motd);
}

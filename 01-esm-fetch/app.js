import { writeFile, readFile } from 'node:fs/promises';

let config;

try {
  const configRaw = await readFile('config.json', 'utf8');
  config = JSON.parse(configRaw);
} catch (err) {
  console.error('Failed to read or parse config.json:', err.message);
  process.exit(1);
}

const url = config.url;
if (!url) {
  console.error('Missing `url` in config.json');
  process.exit(1);
}

// Extract retry options safely with defaults
const {
  maxAttempts = 3,
  backoffMs = 500
} = config.retry ?? {};

// Fetch with retry + timeout
async function fetchWithRetry(url, options = {}, maxAttempts = 3, backoffMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const signal = AbortSignal.timeout(3000);

    try {
      const res = await fetch(url, { ...options, signal });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;

      console.error('Processing failed:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        attempt: attempt
      });

      if (isLastAttempt) throw err;

      const wait = backoffMs * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

try {
  const users = await fetchWithRetry(url, {}, maxAttempts, backoffMs);
  console.log(`Fetched ${users.length} users.`);

  await writeFile('users.json', JSON.stringify(users, null, 2));
  console.log('Saved to users.json');
} catch (err) {
  console.error('Final fetch attempt failed:', err.message);
  process.exit(1);
}

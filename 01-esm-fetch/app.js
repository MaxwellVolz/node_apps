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


// Fetch with timeout using AbortSignal
try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000)  // Timeout after 3 seconds
    });
  
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  
    const users = await response.json();
    console.log(`Fetched ${users.length} users.`);
  
    await writeFile('users.json', JSON.stringify(users, null, 2));
    console.log('Saved to users.json');
  } catch (err) {
    if (err.name === 'TimeoutError') {
      console.error('Request timed out');
    } else {
      console.error('Fetch failed:', err.message);
    }
  }
  
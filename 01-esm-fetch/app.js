// Use the Promises API for clean async FS operations
import { writeFile } from 'node:fs/promises';

// Use the built-in Fetch API in modern Node
const response = await fetch('https://jsonplaceholder.typicode.com/users');

if (!response.ok) {
  throw new Error(`Failed to fetch users: ${response.statusText}`);
}

const users = await response.json();
console.log(`Fetched ${users.length} users.`);

await writeFile('users.json', JSON.stringify(users, null, 2));
console.log('Saved to users.json');

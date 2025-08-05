import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

function runBlockingWorker(durationMs) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      fileURLToPath(new URL('./worker.js', import.meta.url)),
      { workerData: { durationMs } }
    );

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Exit ${code}`));
    });
  });
}

const start = performance.now();

// Run 3 blocking tasks in parallel, each ~2s
const durations = [2000, 2000, 2000];
const results = await Promise.all(durations.map(runBlockingWorker));

for (const msg of results) {
  console.log(msg);
}

const end = performance.now();
console.log(`Total time: ${Math.round(end - start)}ms`);

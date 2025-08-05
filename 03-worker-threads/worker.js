import { parentPort, workerData } from 'node:worker_threads';

function blockingTask(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // the while loop simulates a busy-wait (CPU-intensive)
  }
  return ms;
}

const duration = blockingTask(workerData.durationMs);
parentPort.postMessage(`Done in ${duration}ms`);

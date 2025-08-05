

## 01-esm-fetch

1. In `package.json` the `"type": "module` tells **node** to parse them as **ES Modules** (modern)
2. The new **top level await** lets us avoid the crazy looking pattern for immediately-invoked async function expressions (IIFE)
3. no *axios*, no *node-fetch*, just straight-up, native, **fetch**.
4. Clearer imports with `'node:fs/promises';` to avoid dependency conflicts
5. Loading `config.json` with check
6. Implemented **AbortSignal** to leverage native timeout with *fetch*
7. Added fetch retry with graceful backoff, config, and default settings

## 02-native-test

1. Native test runner with `node:test` + `node --test`
2. Example asserts `assert.strictEqual`, `assert.throws`
3. Async test support for **multiply()** with: `test('...', async () => { ... })`
4. Native file watch with `node --test --watch` from **02-native-test/**
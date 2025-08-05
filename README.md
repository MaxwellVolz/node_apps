

## 01-esm-fetch

1. In `package.json` the `"type": "module` tells **node** to parse them as **ES Modules** (modern)
2. The new **top level await** lets us avoid the crazy looking pattern for immediately-invoked async function expressions (IIFE)
3. no *axios*, no *node-fetch*, just straight-up, native, **fetch**.
4. Clearer imports with `'node:fs/promises';` to avoid dependency conflicts
5. Loading `config.json` with check
6. Implemented **AbortSignal** to leverage native timeout with *fetch*

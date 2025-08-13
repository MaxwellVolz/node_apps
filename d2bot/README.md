

# D2Bot

Node.js runner for Diablo II: Resurrected, built with modern JS (ESM, async/await). 

First target: **Blizzard Sorc Mephisto moat**. 

Optional ViGEmBus backend for unfocused input; default is focused KB/Mouse.

## Layout

- bots/ # run scripts (e.g., RunMephisto.js)
- config/ # app.json, runlist.json
- core/ # DI/context, queues (your impls)
- services/ # nav, vision adapter, cast, world, town, loot (your impls)
- pickit/ # item whitelists
- main.js # entrypoint

## Config
- `config/app.json` – input backend, vision adapter, timeouts.
- `config/runlist.json` – which bots to run and cadence.

## Run
```bash
node main.js
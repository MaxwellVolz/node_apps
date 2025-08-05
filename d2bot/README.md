# D2Bot – Diablo II Resurrected Minimap Bot (2025 Edition)

A modern Node.js-based bot for Diablo II Resurrected built with:
- Native mouse + keyboard input using `@nut-tree-fork/nut-js`
- Cross-platform screen capture via `screenshot-desktop`
- Fast minimap layout matching with `opencv4nodejs-prebuilt-install`
- Dev in WSL, run natively on Windows for full game input compatibility

---

## Development Setup

1. Clone this repo inside a shared Windows-accessible path:

```bash
git clone https://github.com/yourname/d2bot.git /mnt/c/_git/d2bot
cd /mnt/c/_git/d2bot
````

2. Install dependencies (run in WSL):

```bash
npm install
```

3. To run (from Windows PowerShell or CMD):

```bash
cd C:\_git\d2bot
node app.js
```

---

## Dependencies

| Package                          | Purpose                       |
| -------------------------------- | ----------------------------- |
| `@nut-tree-fork/nut-js`          | Native mouse + keyboard input |
| `screenshot-desktop`             | Screen capture                |
| `sharp`                          | Image cropping/resizing       |
| `opencv4nodejs-prebuilt-install` | Template matching with OpenCV |

---

## Architecture

```
app.js                 ← entry point
input/                 ← humanized input wrappers
capture/               ← minimap screenshot + crop
matcher/               ← OpenCV layout matcher
data/templates/        ← known minimap layout PNGs
```

---

## Run-Time Notes

* `@nut-tree-fork/nut-js` must be run from Windows to control Diablo II
* `opencv4nodejs-prebuilt-install` requires native dependencies to be available (Windows supported)
* Bot logic assumes fullscreen or borderless 1920x1080; update coordinates if not

---

## TODO

### Core Bot Engine

* [ ] Capture and normalize minimap image
* [ ] Match current layout to known templates
* [ ] Route mouse toward known exit or boss room
* [ ] Simulate keypresses (e.g., teleport, potion use)

### Human-Like Behavior

* [ ] Add jitter to mouse movement
* [ ] Randomized delays between actions
* [ ] Multi-step movement with curve interpolation

### Template Management

* [ ] Capture all known Durance 2 layouts
* [ ] Store them in `/data/templates` and label clearly
* [ ] Support dynamic template discovery (future)

### Debugging + UX

* [ ] Log confidence scores per layout match
* [ ] Draw bounding box on debug screenshot
* [ ] Optional overlay showing matched layout ID

### Deployment

* [ ] Add `sea-config.json` for Node.js single-exe build
* [ ] Document packaging with `--experimental-sea-config`
* [ ] Add `launch.bat` for double-clickable startup


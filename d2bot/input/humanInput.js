import { mouse, keyboard, Button, Key, Point } from "@nut-tree-fork/nut-js";

mouse.config.mouseSpeed = 1000; // increase for smoother motion

export async function humanMove(x, y, jitter = 3) {
  const jittered = {
    x: x + (Math.random() * jitter - jitter / 2),
    y: y + (Math.random() * jitter - jitter / 2),
  };
  await mouse.move([new Point(jittered.x, jittered.y)]);
}

export async function humanClick() {
  await mouse.click(Button.LEFT);
}

export async function humanType(text) {
  for (const char of text) {
    await keyboard.type(char);
    await new Promise((res) => setTimeout(res, 50 + Math.random() * 100));
  }
}

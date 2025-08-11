// capture/screen.js
import screenshot from "screenshot-desktop";

export async function captureScreen() {
  return screenshot({ format: "png" }); // PNG Buffer
}

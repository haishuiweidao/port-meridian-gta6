// Keyboard + mouse input. Keys are tracked by code; one-shot keys are also
// recorded edge-triggered in `justPressed` so a quick tap is never missed
// between animation frames.
export const keys = {};
export const justPressed = new Set();
export function consume(code) {
  if (justPressed.has(code)) { justPressed.delete(code); return true; }
  return false;
}
// Drop any queued one-shot presses (e.g. keys tapped on the title screen
// must not fire the moment play starts).
export function clearJustPressed() { justPressed.clear(); }
export const mouse = { x: 0, y: 0, down: false, clicked: false };
export function bindInput(canvas) {
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (!e.repeat) justPressed.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; justPressed.clear(); mouse.down = false; mouse.clicked = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => { mouse.down = true; mouse.clicked = true; });
  addEventListener('mouseup', () => { mouse.down = false; });
}
export function pressed(code) { return !!keys[code]; }
export function moveAxis() {
  let x = 0, y = 0;
  if (pressed('KeyA') || pressed('ArrowLeft')) x -= 1;
  if (pressed('KeyD') || pressed('ArrowRight')) x += 1;
  if (pressed('KeyW') || pressed('ArrowUp')) y -= 1;
  if (pressed('KeyS') || pressed('ArrowDown')) y += 1;
  return { x, y };
}

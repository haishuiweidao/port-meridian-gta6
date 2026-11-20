// Synthesised sound + music: WebAudio oscillators only, no audio files.
// Everything here is original; no sampled music or effects.
let ctx = null, master = null, sirenOsc = null, sirenGain = null, engineOsc = null, engineGain = null;
let muted = false;
let musicTimer = null, sirenTimer = null, sirenOn = false, sirenHigh = false;
const MELODY = [220, 277, 330, 392, 330, 277, 220, 196, 220, 262, 330, 392, 440, 392, 330, 277];
export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
  } catch { ctx = null; }
}
export function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; }
export function isMuted() { return muted; }
function tone(freq, dur, type = 'sine', vol = 0.25, when = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
export function sfxShot() { tone(180, 0.12, 'square', 0.3); tone(90, 0.15, 'sawtooth', 0.2); }
export function sfxPunch() { tone(120, 0.08, 'triangle', 0.3); }
export function sfxPickup() { tone(660, 0.1, 'sine', 0.25); tone(990, 0.14, 'sine', 0.25, 0.08); }
export function sfxCrash() { tone(70, 0.25, 'sawtooth', 0.35); }
export function sfxMission() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'sine', 0.25, i * 0.11)); }
export function sfxSiren(on) {
  if (!ctx) return;
  // Two-tone wail, driven by a timer instead of resetting the oscillator
  // frequency every frame while the siren is on.
  if (on && !sirenOn) {
    sirenOn = true; sirenHigh = false;
    sirenTimer = setInterval(() => {
      sirenHigh = !sirenHigh;
      sirenOsc.frequency.setValueAtTime(sirenHigh ? 880 : 660, ctx.currentTime);
    }, 450);
  } else if (!on && sirenOn) {
    sirenOn = false;
    clearInterval(sirenTimer); sirenTimer = null;
  }
  sirenGain.gain.value = on && !muted ? 0.05 : 0;
}
export function sfxEngine(speed01) {
  if (!ctx) return;
  engineGain.gain.value = speed01 > 0.02 ? 0.04 + speed01 * 0.05 : 0;
  engineOsc.frequency.value = 45 + speed01 * 130;
}
export function startMusic() {
  if (!ctx || musicTimer) return;
  let i = 0;
  musicTimer = setInterval(() => {
    if (muted) return;
    tone(MELODY[i % MELODY.length], 0.22, 'triangle', 0.07);
    if (i % 4 === 0) tone(110, 0.3, 'sine', 0.08);
    i += 1;
  }, 260);
}

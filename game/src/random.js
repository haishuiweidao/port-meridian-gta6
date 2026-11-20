// Deterministic seeded RNG (mulberry32) so screenshot scenes are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function pick(rng, arr) {
  if (!arr.length) throw new Error('pick: empty array');
  return arr[Math.floor(rng() * arr.length)];
}
export function range(rng, lo, hi) {
  if (hi < lo) [lo, hi] = [hi, lo]; // tolerate a reversed range instead of returning a negative span
  return lo + rng() * (hi - lo);
}
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
export function chance(rng, p) {
  return rng() < p;
}
// Fisher–Yates shuffle with the seeded rng; returns a new array.
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Fuel for Port Meridian: the tank drains while driving, and an empty tank
// leaves the car crawling. Two filling stations sell a full tank for cash —
// pull up to a pump and press E. All original.
import { CAR } from './config.js';
import { clamp, dist } from './random.js';
import { sfxRefuel } from './audio.js';

export const FUEL_REFILL_COST = 30; // dollars for a full tank
export const FUEL_LOW = 0.2; // HUD warning below this fraction of a tank
export const FUEL_EMPTY_CAP = 60; // top speed (px/s) on an empty tank
export const FUEL_DRAIN_SECONDS = 240; // full-throttle driving per tank
export const FUEL_STATIONS = [
  { x: 500, y: 500, name: 'Meridian Fuels' },
  { x: 1700, y: 800, name: 'Harbour Petrol' },
];
const PUMP_RADIUS = 90; // how close the car must be to reach the pump

export function createFuel() {
  return { level: 1, stations: FUEL_STATIONS.map((st) => ({ ...st })) };
}

// The tank only drains while the car is actually moving.
export function updateFuel(f, s, dt) {
  const p = s.player;
  if (!p.inCar) return;
  const load = Math.abs(p.inCar.speed) / CAR.maxSpeed;
  if (load > 0.02) f.level = Math.max(0, f.level - (load * dt) / FUEL_DRAIN_SECONDS);
}

// Top speed for the car right now: an empty tank barely crawls.
export function fuelSpeedCap(f) {
  return f.level <= 0 ? FUEL_EMPTY_CAP : CAR.maxSpeed;
}

export function nearestStation(f, x, y) {
  let best = null, bd = PUMP_RADIUS;
  for (const st of f.stations) {
    const d = dist(x, y, st.x, st.y);
    if (d < bd) { bd = d; best = st; }
  }
  return best;
}

// Fill up at a nearby pump. Returns true when the E press was spent on the
// pump (filled, or too broke to fill) so the driver stays in the car.
export function tryRefuel(f, s) {
  const p = s.player;
  if (!p.inCar) return false;
  const st = nearestStation(f, p.x, p.y);
  if (!st || f.level >= 0.999) return false;
  if (p.cash < FUEL_REFILL_COST) {
    s.message = `Need $${FUEL_REFILL_COST} to fill up at ${st.name}.`;
    s.messageT = 2.5;
    return true;
  }
  p.cash -= FUEL_REFILL_COST;
  f.level = 1;
  s.message = `Filled up at ${st.name} — $${FUEL_REFILL_COST}. Tank full.`;
  s.messageT = 3;
  sfxRefuel();
  return true;
}

export function fuelLabel(f) {
  const pct = Math.round(f.level * 100);
  if (f.level <= 0) return '⛽ EMPTY';
  if (f.level < FUEL_LOW) return `⛽ LOW ${pct}%`;
  return `⛽ ${pct}%`;
}

// Save/load: the tank level is all the fuel state there is.
export function fuelSave(f) {
  return { level: f.level };
}
export function fuelLoad(f, d) {
  if (!d || typeof d.level !== 'number') return;
  f.level = clamp(d.level, 0, 1);
}

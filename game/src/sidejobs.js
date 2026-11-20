// Taxi side job for Port Meridian: pick up waiting fares, drive them to a
// destination against the clock, get paid plus a tip for fast delivery.
// All original logic; the fares are Port Meridian locals, not real people.
import { ROADS_X, ROADS_Y, WORLD } from './config.js';
import { pick, range, clamp, dist } from './random.js';
import * as audio from './audio.js';

const FARE_NAMES = ['Ada', 'Bruno', 'Cleo', 'Dante', 'Elsa', 'Felix', 'Greta', 'Hugo', 'Ines', 'Jonas'];
const PICKUP_RADIUS = 64;
const DROP_RADIUS = 60;
const WAITING_PATIENCE = 75; // seconds a fare waits on the kerb before giving up
const RESPAWN_DELAY = 8; // seconds after a fare ends before the next one appears

export function createTaxi(rng) {
  return {
    rng, waiting: null, active: null, spawnT: 6,
    trips: 0, earned: 0, ratings: [], cancelled: 0,
  };
}

// A point on a road intersection, nudged onto the kerb so the cab can stop.
function roadPoint(rng) {
  const x = pick(rng, ROADS_X) + (rng() > 0.5 ? 30 : -30);
  const y = pick(rng, ROADS_Y) + (rng() > 0.5 ? 30 : -30);
  return { x: clamp(x, 60, WORLD.w - 60), y: clamp(y, 60, WORLD.h - 60) };
}

function spawnWaiting(taxi) {
  const spot = roadPoint(taxi.rng);
  taxi.waiting = {
    x: spot.x, y: spot.y,
    name: pick(taxi.rng, FARE_NAMES),
    patience: WAITING_PATIENCE,
  };
}

function startFare(s, taxi) {
  const p = s.player;
  const w = taxi.waiting;
  // Destination: another intersection, far enough to be a real ride.
  let dest = roadPoint(taxi.rng);
  let guard = 0;
  while (dist(w.x, w.y, dest.x, dest.y) < 500 && guard < 12) {
    dest = roadPoint(taxi.rng); guard += 1;
  }
  const ride = dist(w.x, w.y, dest.x, dest.y);
  const fare = Math.round((40 + ride * 0.06) / 5) * 5;
  taxi.active = {
    name: w.name, dest, fare,
    timeLeft: ride / 210 + 20, // seconds: generous at city speeds
    timeTotal: ride / 210 + 20,
  };
  taxi.waiting = null;
  s.message = `${w.name} got in — drive to the cyan marker, ${Math.round(taxi.active.timeLeft)}s on the clock. Fare $${fare}.`;
  s.messageT = 3.5;
  audio.sfxTaxi();
}

function finishFare(s, taxi) {
  const p = s.player;
  const a = taxi.active;
  const timeFrac = clamp(a.timeLeft / a.timeTotal, 0, 1);
  const tip = timeFrac > 0.4 ? Math.round(a.fare * 0.5) : timeFrac > 0.15 ? Math.round(a.fare * 0.2) : 0;
  const rating = timeFrac > 0.4 ? 5 : timeFrac > 0.15 ? 4 : 3;
  p.cash += a.fare + tip;
  s.score += a.fare + tip;
  taxi.trips += 1;
  taxi.earned += a.fare + tip;
  taxi.ratings.push(rating);
  s.message = `Fare complete! ${a.name} paid $${a.fare}${tip ? ` + $${tip} tip` : ''} — ${rating}★ rating.`;
  s.messageT = 4;
  audio.sfxMission();
  taxi.active = null;
  taxi.spawnT = RESPAWN_DELAY;
}

export function updateTaxi(s, dt) {
  const taxi = s.taxi;
  if (!taxi || s.player.dead) return;
  const p = s.player;
  if (taxi.active) {
    const a = taxi.active;
    a.timeLeft -= dt;
    if (dist(p.x, p.y, a.dest.x, a.dest.y) < DROP_RADIUS) {
      finishFare(s, taxi);
    } else if (a.timeLeft <= 0) {
      s.message = `${a.name} got out — too slow, no fare. The cab rank hears about it.`;
      s.messageT = 3;
      taxi.ratings.push(1);
      taxi.cancelled += 1;
      taxi.active = null;
      taxi.spawnT = RESPAWN_DELAY;
      audio.sfxCrash();
    }
    return;
  }
  if (taxi.waiting) {
    const w = taxi.waiting;
    w.patience -= dt;
    if (w.patience <= 0) {
      s.message = `${w.name} gave up waiting for a cab and walked off.`;
      s.messageT = 2.5;
      taxi.waiting = null;
      taxi.spawnT = RESPAWN_DELAY;
      return;
    }
    // Pick up only from a car: this is a taxi job, not a walking escort.
    if (p.inCar && dist(p.x, p.y, w.x, w.y) < PICKUP_RADIUS) startFare(s, taxi);
    return;
  }
  taxi.spawnT -= dt;
  if (taxi.spawnT <= 0) spawnWaiting(taxi);
}

// Marker the renderer should draw: waiting fare (yellow) or destination (cyan).
export function taxiTarget(s) {
  const taxi = s.taxi;
  if (!taxi) return null;
  if (taxi.active) return { x: taxi.active.dest.x, y: taxi.active.dest.y, kind: 'taxi-dest' };
  if (taxi.waiting) return { x: taxi.waiting.x, y: taxi.waiting.y, kind: 'taxi-pickup' };
  return null;
}

export function taxiRating(taxi) {
  if (!taxi || !taxi.ratings.length) return 0;
  return taxi.ratings.reduce((a, b) => a + b, 0) / taxi.ratings.length;
}

// One HUD line: current fare state, or the career total when idle.
export function taxiStatus(s) {
  const taxi = s.taxi;
  if (!taxi) return '';
  if (taxi.active) {
    const a = taxi.active;
    return `Taxi: ${a.name} → $${a.fare} · ${Math.max(0, Math.ceil(a.timeLeft))}s left`;
  }
  if (taxi.waiting) return `Taxi: ${taxi.waiting.name} waiting for a cab · ${Math.max(0, Math.ceil(taxi.waiting.patience))}s`;
  return `Taxi: ${taxi.trips} trips · $${taxi.earned} earned · ${taxiRating(taxi).toFixed(1)}★`;
}

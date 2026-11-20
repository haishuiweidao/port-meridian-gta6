// Screenshot scenes: deterministic staged frames from the real simulation,
// like the starter's shots.js. ?shot=start|play|chase|mission (&seed=).
import { STEP } from './config.js';
import { createWorld, stepWorld, addHeat } from './world.js';

function runSteps(s, seconds, input) {
  for (let i = 0; i < seconds / STEP; i++) stepWorld(s, input, STEP);
}
const idle = { keys: {}, move: { x: 0, y: 0 }, enter: false, attack: false, brake: false, weapon: false, aimX: 0, aimY: 0 };

export function stageShot(name, seed = 1) {
  const known = ['start', 'play', 'chase', 'mission', 'taxi'];
  if (!known.includes(name)) console.warn(`stageShot: unknown shot "${name}", staging the title screen instead.`);
  const s = createWorld(seed);
  if (name === 'taxi') {
    // Taxi side job: a fare is already riding, destination marker ahead.
    s.player.x = 800; s.player.y = 800;
    const car = s.cars.find((c) => c.parked) || s.cars[0];
    s.player.inCar = car; car.parked = false; car.stolen = true; car.angle = 0; car.x = 800; car.y = 800;
    s.taxi.waiting = null;
    s.taxi.active = { name: 'Ada', dest: { x: 2000, y: 500 }, fare: 120, timeLeft: 38, timeTotal: 52 };
    runSteps(s, 1.2, { ...idle, move: { x: 0, y: -1 } });
    return { state: s, screen: 'play' };
  }
  if (name === 'play') {
    // Drive downtown: get in a nearby car and drive east along a road.
    s.player.x = 545; s.player.y = 1145;
    const car = s.cars.find((c) => c.parked && Math.abs(c.x - 500) < 200 && Math.abs(c.y - 1100) < 200) || s.cars[0];
    s.player.inCar = car; car.parked = false; car.stolen = true; car.angle = 0; car.x = 560; car.y = 1100;
    runSteps(s, 3, { ...idle, move: { x: 0, y: -1 } });
    return { state: s, screen: 'play' };
  }
  if (name === 'chase') {
    // Night chase: the clock is at 22:00, so the headlights are on.
    s.clockHours = 22;
    s.player.x = 1100; s.player.y = 800;
    const car = s.cars.find((c) => c.parked) || s.cars[0];
    s.player.inCar = car; car.parked = false; car.stolen = true; car.angle = 0; car.x = 1100; car.y = 800;
    addHeat(s, 3, 'Wanted level 3 — the harbour police are chasing you!');
    runSteps(s, 3, { ...idle, move: { x: 0, y: -1 } });
    return { state: s, screen: 'play' };
  }
  if (name === 'mission') {
    // Already picked up the parcel: drive toward the green drop-off marker.
    s.missionActive = true; s.missionStep = 1;
    s.player.x = 1700; s.player.y = 1400;
    const car = s.cars.find((c) => c.parked) || s.cars[0];
    s.player.inCar = car; car.parked = false; car.stolen = true; car.angle = 0; car.x = 1700; car.y = 1400;
    runSteps(s, 0.4, { ...idle, move: { x: 0, y: -1 } });
    return { state: s, screen: 'play' };
  }
  // start (default): title screen over the city at dawn.
  runSteps(s, 4, idle);
  return { state: s, screen: 'title' };
}

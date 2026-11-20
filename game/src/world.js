// World state + simulation for Port Meridian.
// Top-down city: road grid, buildings, park, harbour water, traffic, peds,
// police, combat, wanted level, pickups, particles and missions.
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, COLORS, PLAYER, CAR, WANTED_DECAY, WANTED_MAX } from './config.js';
import { mulberry32, pick, range, clamp, dist, angleTo, normAngle } from './random.js';
import { MISSIONS, missionIntro } from './missions.js';
import * as audio from './audio.js';

const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#7f8c8d', '#8e44ad', '#16a085', '#e67e22', '#ecf0f1'];
const PED_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#fd79a8', '#00cec9'];
const NAMES = ['Rae', 'Dario', 'Ivy', 'Kofi', 'Lena', 'Marco', 'Nia', 'Omar', 'Pia', 'Theo'];

export function createWorld(seed = 1) {
  const rng = mulberry32(seed);
  const buildings = [];
  // One or two buildings per city block (blocks between roads).
  for (let bx = 0; bx < ROADS_X.length - 1; bx++) {
    for (let by = 0; by < ROADS_Y.length - 1; by++) {
      const x0 = ROADS_X[bx] + ROAD_W / 2 + 12, x1 = ROADS_X[bx + 1] - ROAD_W / 2 - 12;
      const y0 = ROADS_Y[by] + ROAD_W / 2 + 12, y1 = ROADS_Y[by + 1] - ROAD_W / 2 - 12;
      if (bx === 3 && by === 4) continue; // central park
      if (by === 4 && bx >= 5) continue; // harbour / marina strip
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 70, Math.max(80, (x1 - x0) / n - 16));
        const h = range(rng, 60, Math.max(70, y1 - y0 - 16));
        const x = x0 + (i * (x1 - x0)) / n + range(rng, 4, 14);
        const y = y0 + range(rng, 4, 14);
        buildings.push({ x, y, w: Math.min(w, x1 - x), h: Math.min(h, y1 - y), color: pick(rng, COLORS.building), windows: Math.floor(rng() * 5) + 3 });
      }
    }
  }
  const trees = [];
  for (let i = 0; i < 40; i++) trees.push({ x: range(rng, 1050, 1350), y: range(rng, 1450, 1650), r: range(rng, 10, 18) });
  for (let i = 0; i < 24; i++) trees.push({ x: range(rng, 60, 2500), y: range(rng, 60, 1800), r: range(rng, 8, 14) });

  const cars = [];
  const mkCar = (x, y, angle, color, opts = {}) => ({ x, y, angle, speed: 0, color, w: 46, h: 22, ...opts });
  // Parked, stealable cars along roads.
  const parked = [];
  for (let i = 0; i < 14; i++) {
    const rx = pick(rng, ROADS_X), ry = pick(rng, ROADS_Y);
    const horizontal = rng() > 0.5;
    const c = mkCar(horizontal ? rx + range(rng, -120, 120) : rx + (rng() > 0.5 ? 26 : -26),
      horizontal ? ry + (rng() > 0.5 ? 26 : -26) : ry + range(rng, -120, 120),
      horizontal ? 0 : Math.PI / 2, pick(rng, CAR_COLORS), { parked: true, name: pick(rng, ['Comet', 'Falcon', 'Dune', 'Vortex', 'Ridge', 'Wave']) });
    parked.push(c); cars.push(c);
  }
  // The white coupe for mission 3, by the marina.
  const coupe = mkCar(2300, 1400, 0, '#f5f5f0', { parked: true, name: 'Marina Coupe', special: true });
  parked.push(coupe); cars.push(coupe);
  // Moving traffic.
  for (let i = 0; i < 16; i++) {
    const horizontal = rng() > 0.5;
    const road = horizontal ? pick(rng, ROADS_Y) : pick(rng, ROADS_X);
    const dir = rng() > 0.5 ? 1 : -1;
    cars.push(mkCar(horizontal ? range(rng, 100, 2500) : road + dir * 18,
      horizontal ? road + dir * 18 : range(rng, 100, 1800),
      horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      pick(rng, CAR_COLORS), { traffic: true, speed: range(rng, 70, 130), dir, horizontal, road }));
  }
  const peds = [];
  for (let i = 0; i < 26; i++) {
    peds.push({ x: range(rng, 100, 2500), y: range(rng, 100, 1750), angle: rng() * Math.PI * 2, speed: range(rng, 28, 55), color: pick(rng, PED_COLORS), name: pick(rng, NAMES), flee: 0, tx: 0, ty: 0 });
  }
  const state = {
    seed, time: 0, rng,
    player: { x: 545, y: 1145, angle: -Math.PI / 2, speed: 0, health: PLAYER.health, cash: 50, ammo: 24, weapon: 'pistol', inCar: null, punchCd: 0, shootCd: 0, dead: false },
    cars, parked, peds, buildings, trees,
    police: [], bullets: [], particles: [], pickups: [],
    wanted: 0, heat: 0, stars: 0,
    missionIndex: 0, missionStep: 0, missionActive: false, missionDone: false, storyComplete: false,
    dialog: null, dialogT: 0, message: '', messageT: 0,
    score: 0, kills: 0, carsStolen: 0,
  };
  // Pickups: cash + health + ammo scattered in the city.
  for (let i = 0; i < 10; i++) state.pickups.push({ x: range(rng, 150, 2450), y: range(rng, 150, 1700), kind: i % 3 === 0 ? 'health' : i % 3 === 1 ? 'ammo' : 'cash', amount: i % 3 === 2 ? 25 : 12 });
  return state;
}

function hitBuilding(s, x, y, r) {
  for (const b of s.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
function resolveBuilding(s, e, r) {
  const b = hitBuilding(s, e.x, e.y, r);
  if (!b) return false;
  const dxl = e.x + r - b.x, dxr = b.x + b.w - (e.x - r);
  const dyt = e.y + r - b.y, dyb = b.y + b.h - (e.y - r);
  const m = Math.min(dxl, dxr, dyt, dyb);
  if (m === dxl) e.x = b.x - r; else if (m === dxr) e.x = b.x + b.w + r;
  else if (m === dyt) e.y = b.y - r; else e.y = b.y + b.h + r;
  return true;
}
export function addHeat(s, amount, why) {
  s.heat = clamp(s.heat + amount, 0, 5);
  s.stars = Math.ceil(s.heat);
  s.wanted = s.stars;
  if (amount > 0) s.message = why || 'The police noticed that!'; s.messageT = 2.5;
}
function spawnPolice(s) {
  const want = Math.min(1 + s.stars, WANTED_MAX);
  while (s.police.length < want) {
    const p = s.player;
    const a = s.rng() * Math.PI * 2;
    const x = clamp(p.x + Math.cos(a) * 520, 80, WORLD.w - 80);
    const y = clamp(p.y + Math.sin(a) * 520, 80, WORLD.h - 80);
    if (s.stars >= 2 && s.police.length % 2 === 0) {
      s.police.push({ x, y, angle: 0, speed: 0, color: '#1a1a2e', car: true, w: 46, h: 22, health: 60 });
    } else {
      s.police.push({ x, y, angle: 0, speed: 0, color: '#1a1a2e', car: false, health: 30 });
    }
  }
}
function burst(s, x, y, color, n = 10) {
  for (let i = 0; i < n; i++) s.particles.push({ x, y, vx: (s.rng() - 0.5) * 260, vy: (s.rng() - 0.5) * 260, life: 0.5 + s.rng() * 0.4, color });
}

export function stepWorld(s, input, dt) {
  s.time += dt;
  const p = s.player;
  if (p.dead) return;
  if (s.dialogT > 0) s.dialogT -= dt;
  if (s.messageT > 0) s.messageT -= dt;
  // Wanted decay when quiet.
  if (s.heat > 0) { s.heat = Math.max(0, s.heat - WANTED_DECAY * dt); s.stars = Math.ceil(s.heat); s.wanted = s.stars; }
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;

  // --- Player on foot ---
  if (!p.inCar) {
    const run = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
    const sp = run ? PLAYER.run : PLAYER.walk;
    let mx = input.move.x, my = input.move.y;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len; my /= len;
      p.x += mx * sp * dt; p.y += my * sp * dt;
      p.angle = Math.atan2(my, mx);
      resolveBuilding(s, p, PLAYER.radius);
      p.x = clamp(p.x, 20, WORLD.w - 20); p.y = clamp(p.y, 20, WORLD.h - 20);
    }
    // Enter / steal a car.
    if (input.enter) {
      let best = null, bd = 70;
      for (const c of s.cars) {
        if (c.traffic) continue;
        const d = dist(p.x, p.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (best) {
        p.inCar = best; best.parked = false; best.speed = 0;
        if (!best.stolen) { best.stolen = true; s.carsStolen += 1; addHeat(s, 0.6, 'You stole a car! Wanted level up.'); }
        s.message = `Driving the ${best.name || 'car'} — WASD to drive, Space to brake, E to get out.`; s.messageT = 3;
        audio.sfxPickup();
      }
    }
    // Melee / shoot.
    if (input.attack && p.punchCd <= 0) {
      if (p.weapon === 'pistol' && p.ammo > 0 && p.shootCd <= 0) {
        p.ammo -= 1; p.shootCd = 0.28;
        const a = Math.atan2(input.aimY - p.y, input.aimX - p.x);
        s.bullets.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.7, from: 'player' });
        audio.sfxShot(); burst(s, p.x + Math.cos(a) * 24, p.y + Math.sin(a) * 24, '#ffd166', 4);
      } else if (p.weapon === 'fists') {
        p.punchCd = 0.4; audio.sfxPunch();
        for (const cop of s.police) {
          if (!cop.car && dist(p.x, p.y, cop.x, cop.y) < 46) { cop.health -= 20; burst(s, cop.x, cop.y, '#ff6b6b', 6); if (cop.health <= 0) { s.kills += 1; addHeat(s, 0.5, 'You took down an officer!'); } }
        }
        for (const ped of s.peds) if (dist(p.x, p.y, ped.x, ped.y) < 40) { ped.flee = 3; addHeat(s, 0.4, 'You shoved a pedestrian!'); }
      }
    }
    if (input.weapon) p.weapon = p.weapon === 'pistol' ? 'fists' : 'pistol';
  } else {
    // --- Driving ---
    const car = p.inCar;
    const fwd = input.move.y < 0 ? 1 : input.move.y > 0 ? -0.45 : 0;
    const steer = input.move.x;
    if (fwd !== 0) car.speed = clamp(car.speed + fwd * CAR.accel * dt, -CAR.maxReverse, CAR.maxSpeed);
    else car.speed *= Math.max(0, 1 - 1.6 * dt);
    if (input.brake) {
      // Linear braking from CAR.brake, stopping at zero instead of overshooting into reverse.
      const dec = CAR.brake * dt;
      car.speed = Math.abs(car.speed) <= dec ? 0 : car.speed - Math.sign(car.speed) * dec;
    }
    car.angle += steer * CAR.turn * dt * (car.speed / CAR.maxSpeed) * (car.speed >= 0 ? 1 : -1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const ox = car.x, oy = car.y;
    car.x = nx; car.y = ny;
    if (hitBuilding(s, car.x, car.y, 22)) { car.x = ox; car.y = oy; car.speed *= -0.25; audio.sfxCrash(); burst(s, car.x, car.y, '#aaaaaa', 6); addHeat(s, 0.05); }
    car.x = clamp(car.x, 20, WORLD.w - 20); car.y = clamp(car.y, 20, WORLD.h - 20);
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    if (Math.abs(car.speed) > 200 && s.rng() < 0.3) s.particles.push({ x: car.x - Math.cos(car.angle) * 22, y: car.y - Math.sin(car.angle) * 22, vx: 0, vy: 0, life: 0.3, color: '#888888' });
    if (input.enter) { p.inCar = null; car.speed = 0; p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34; }
    audio.sfxEngine(Math.abs(car.speed) / CAR.maxSpeed);
  }

  // --- Traffic ---
  for (const c of s.cars) {
    if (!c.traffic) continue;
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    if (c.horizontal) {
      if (c.x < 60 || c.x > WORLD.w - 60) { c.angle += Math.PI; c.x = clamp(c.x, 60, WORLD.w - 60); }
      if (s.rng() < 0.0006) { c.horizontal = false; c.angle = s.rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2; }
    } else {
      if (c.y < 60 || c.y > WORLD.h - 60) { c.angle += Math.PI; c.y = clamp(c.y, 60, WORLD.h - 60); }
      if (s.rng() < 0.0006) { c.horizontal = true; c.angle = s.rng() > 0.5 ? 0 : Math.PI; }
    }
    // Bump the player (once per second per car, not every frame).
    if (c.hitCd > 0) c.hitCd -= dt;
    if (dist(c.x, c.y, p.x, p.y) < 34 && c.hitCd <= 0) {
      c.hitCd = 1;
      if (!p.inCar) { p.health -= 8; addHeat(s, 0.1); burst(s, p.x, p.y, '#ff6b6b', 3); }
      c.speed = 40;
    }
  }
  // --- Pedestrians ---
  for (const ped of s.peds) {
    if (ped.flee > 0) { ped.flee -= dt; ped.x += Math.cos(ped.angle) * 120 * dt; ped.y += Math.sin(ped.angle) * 120 * dt; }
    else {
      if (s.rng() < 0.004) ped.angle = s.rng() * Math.PI * 2;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (ped.x < 40 || ped.x > WORLD.w - 40) ped.angle = Math.PI - ped.angle;
      if (ped.y < 40 || ped.y > WORLD.h - 40) ped.angle = -ped.angle;
    }
    resolveBuilding(s, ped, 10);
    if (p.inCar && dist(ped.x, ped.y, p.x, p.y) < 30 && ped.flee <= 0) { ped.flee = 3; ped.angle = angleTo(p.x, p.y, ped.x, ped.y); addHeat(s, 0.7, 'You hit a pedestrian!'); burst(s, ped.x, ped.y, '#ff6b6b', 8); }
  }
  // --- Police ---
  if (s.stars > 0) spawnPolice(s);
  for (let i = s.police.length - 1; i >= 0; i--) {
    const cop = s.police[i];
    if (cop.health <= 0) { burst(s, cop.x, cop.y, '#ff6b6b', 14); s.police.splice(i, 1); continue; }
    const a = angleTo(cop.x, cop.y, p.x, p.y);
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (cop.car) {
      cop.angle += normAngle(a - cop.angle) * 2.2 * dt;
      cop.speed = clamp(cop.speed + 300 * dt, 0, 380);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      if (d < 40) {
        if (p.inCar) { p.inCar.speed *= 0.7; audio.sfxCrash(); }
        else { p.health -= 20 * dt; }
        burst(s, cop.x, cop.y, '#8888ff', 3);
      }
    } else {
      cop.angle = a;
      const sp = 150;
      cop.x += Math.cos(a) * sp * dt; cop.y += Math.sin(a) * sp * dt;
      resolveBuilding(s, cop, 12);
      // Foot cops can only hurt a player on foot — a driver is behind the
      // car body (police cars handle ramming the player's car instead).
      if (d < 26 && !p.inCar) p.health -= 26 * dt;
    }
    if (d > 900) { s.police.splice(i, 1); }
  }
  if (s.stars === 0 && s.police.length) s.police.length = 0;
  audio.sfxSiren(s.stars > 0);
  // --- Bullets ---
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || hitBuilding(s, b.x, b.y, 2)) { s.bullets.splice(i, 1); continue; }
    for (const cop of s.police) {
      if (dist(b.x, b.y, cop.x, cop.y) < 22) { cop.health -= 34; burst(s, b.x, b.y, '#ff6b6b', 6); s.bullets.splice(i, 1); addHeat(s, 0.3, 'You shot at the police!'); break; }
    }
  }
  // --- Pickups ---
  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const pk = s.pickups[i];
    if (dist(p.x, p.y, pk.x, pk.y) < 30) {
      if (pk.kind === 'cash') { p.cash += pk.amount; s.message = `+$${pk.amount} cash found.`; }
      if (pk.kind === 'health') { p.health = Math.min(100, p.health + 30); s.message = 'Health +30.'; }
      if (pk.kind === 'ammo') { p.ammo += 12; s.message = 'Ammo +12.'; }
      s.messageT = 2; audio.sfxPickup(); s.pickups.splice(i, 1);
    }
  }
  // --- Particles ---
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const pt = s.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
    if (pt.life <= 0) s.particles.splice(i, 1);
  }
  // --- Missions ---
  updateMission(s, dt);
  if (p.health <= 0 && !p.dead) {
    p.dead = true; p.health = 0;
    s.message = 'Busted — Mara is down. Press R to restart the day.';
    s.messageT = 10;
  }
}

function updateMission(s, dt) {
  if (s.storyComplete || s.missionIndex >= MISSIONS.length) return;
  const m = MISSIONS[s.missionIndex];
  if (!s.missionActive) {
    s.missionActive = true;
    s.dialog = missionIntro(m); s.dialogT = 6;
    audio.sfxMission();
  }
  const step = m.steps[s.missionStep];
  if (!step) return;
  const p = s.player;
  const d = dist(p.x, p.y, step.target.x, step.target.y);
  if (step.kind === 'steal') {
    const coupe = s.cars.find((c) => c.special);
    if (coupe && p.inCar === coupe) {
      s.missionStep += 1;
      if (step.wanted) addHeat(s, step.wanted, 'The marina alarm is going off!');
      s.message = 'Coupe stolen! Now drive it to the harbour gate.'; s.messageT = 3; audio.sfxMission();
    }
    return;
  }
  if (d < 56) {
    if (step.wanted) addHeat(s, step.wanted, 'The police are on you now!');
    s.missionStep += 1;
    audio.sfxPickup();
    if (s.missionStep >= m.steps.length) {
      p.cash += m.reward;
      s.score += m.reward;
      s.message = `Mission complete: ${m.name} — +$${m.reward}!`; s.messageT = 4;
      s.dialog = `Mission complete: ${m.name}. Sal paid you $${m.reward}.`; s.dialogT = 5;
      audio.sfxMission();
      s.missionIndex += 1; s.missionStep = 0; s.missionActive = false;
      if (s.missionIndex >= MISSIONS.length) {
        s.storyComplete = true;
        s.dialog = 'Story complete! Mara is free. Port Meridian is yours — free roam, keep earning.'; s.dialogT = 8;
      }
    } else {
      s.message = m.steps[s.missionStep].text; s.messageT = 3;
    }
  }
}
export function missionTarget(s) {
  if (s.storyComplete || s.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[s.missionIndex].steps[s.missionStep];
}
export function missionName(s) {
  if (s.storyComplete) return 'Free roam — story complete';
  const m = MISSIONS[s.missionIndex];
  return `${m.name}: ${m.steps[s.missionStep].text}`;
}

// Port Meridian — main loop, screens, save/load, screenshot mode.
import { createWorld, stepWorld } from './world.js';
import { bindInput, keys, mouse, moveAxis, consume, clearJustPressed } from './input.js';
import { drawWorld, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, SCREEN_PAUSE } from './render.js';
import { initAudio, toggleMute, startMusic } from './audio.js';
import { stageShot } from './shots.js';
import { updateWeather, weatherSave, weatherLoad } from './weather.js';
import { fuelSave, fuelLoad } from './fuel.js';
import { SAVE_KEY } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
bindInput(canvas);

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);

let state, screen;
if (shotName) {
  const staged = stageShot(shotName, seed);
  state = staged.state; screen = staged.screen;
} else {
  state = createWorld(7);
  screen = SCREEN_TITLE;
  loadSave();
}
let last = performance.now();

function resize() {
  canvas.width = innerWidth; canvas.height = innerHeight;
}
addEventListener('resize', resize); resize();

function saveGame() {
  const p = state.player;
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    x: p.x, y: p.y, cash: p.cash, health: p.health, ammo: p.ammo,
    missionIndex: state.missionIndex, missionStep: state.missionStep, score: state.score,
    clockHours: state.clockHours,
    weather: weatherSave(state.weather), fuel: fuelSave(state.fuel),
    packagesFound: state.packages.map((pkg) => pkg.found),
    taxi: state.taxi ? {
      trips: state.taxi.trips, earned: state.taxi.earned,
      ratings: state.taxi.ratings, cancelled: state.taxi.cancelled,
    } : null,
  }));
  state.message = 'Game saved.'; state.messageT = 2;
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    Object.assign(state.player, { x: d.x, y: d.y, cash: d.cash, health: d.health, ammo: d.ammo });
    state.missionIndex = d.missionIndex || 0; state.missionStep = d.missionStep || 0; state.score = d.score || 0;
    if (typeof d.clockHours === 'number') state.clockHours = d.clockHours;
    // Weather and fuel ride along with the save; old saves just keep defaults.
    weatherLoad(state.weather, d.weather);
    fuelLoad(state.fuel, d.fuel);
    // Hidden packages: restore which stashes were already collected.
    if (Array.isArray(d.packagesFound)) {
      state.packagesFound = 0;
      state.packages.forEach((pkg, i) => {
        pkg.found = !!d.packagesFound[i];
        if (pkg.found) state.packagesFound += 1;
      });
    }
    // Taxi career stats ride along; the live fare itself is not saved.
    if (d.taxi && state.taxi) {
      Object.assign(state.taxi, {
        trips: d.taxi.trips || 0, earned: d.taxi.earned || 0,
        ratings: Array.isArray(d.taxi.ratings) ? d.taxi.ratings : [],
        cancelled: d.taxi.cancelled || 0,
      });
    }
    state.message = 'Save loaded — welcome back to Port Meridian.'; state.messageT = 3;
  } catch { /* corrupt save: start fresh */ }
}

function readInput() {
  const mv = moveAxis();
  return {
    keys, move: mv,
    enter: consume('KeyE'),
    attack: mouse.clicked || !!keys['KeyJ'],
    brake: !!keys['Space'],
    weapon: consume('Digit1') || consume('Digit2'),
    aimX: state.player.x + (mouse.x - canvas.width / 2),
    aimY: state.player.y + (mouse.y - canvas.height / 2),
  };
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!shotName) {
    if (consume('KeyM')) toggleMute();
    if (consume('KeyP')) screen = screen === SCREEN_PAUSE ? SCREEN_PLAY : screen === SCREEN_PLAY ? SCREEN_PAUSE : screen;
    if (consume('KeyS') && screen === SCREEN_PLAY) saveGame();
    if (consume('KeyR') && state.player.dead) {
      state = createWorld(7); screen = SCREEN_TITLE;
    }
    if (screen === SCREEN_TITLE && (mouse.clicked || keys['Enter'])) {
      initAudio(); startMusic();
      mouse.clicked = false; // the start click must not also fire a shot
      clearJustPressed(); // keys tapped on the title screen must not fire in play
      screen = SCREEN_PLAY;
      state.dialog = 'Mara Voss — courier, ex-wheelwoman. Sal Moreno has five jobs for you, ending with the Midnight Run. First: pick up the parcel at the yellow marker.';
      state.dialogT = 7;
    }
    if (screen === SCREEN_PLAY) {
      const input = readInput();
      stepWorld(state, input, dt);
      updateWeather(state.weather, dt, canvas.width, canvas.height);
      if (state.player.dead) screen = SCREEN_OVER;
    }
    mouse.clicked = false;
  }
  drawWorld(ctx, state, canvas.width, canvas.height, screen);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

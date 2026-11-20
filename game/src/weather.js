// Weather for Port Meridian: clear skies, rain and fog take turns over the
// city. Rain makes the roads slick so cars grip less; fog dims the view.
// All original logic; the sky is just a mood, not a Rockstar asset.
import { clamp } from './random.js';

export const WEATHER_KINDS = ['clear', 'rain', 'fog'];
export const WEATHER_ICONS = { clear: '☀', rain: '🌧', fog: '🌫' };
export const WEATHER_NAMES = { clear: 'Clear', rain: 'Rain', fog: 'Fog' };
// A spell of weather lasts between these bounds before the sky changes.
export const WEATHER_MIN_SPELL = 45;
export const WEATHER_MAX_SPELL = 90;

export function createWeather(rng) {
  return {
    rng, kind: 'clear', timeLeft: 60 + rng() * 30,
    drops: [], // rain streaks in screen space, recycled while it rains
  };
}

// The next sky is never the one we already have; rain shows up a little
// less often than clear days, fog least of all.
function nextKind(w) {
  let kind = w.kind;
  while (kind === w.kind) {
    const roll = w.rng();
    kind = roll < 0.55 ? 'clear' : roll < 0.85 ? 'rain' : 'fog';
  }
  return kind;
}

export function updateWeather(w, dt, vw, vh) {
  w.timeLeft -= dt;
  if (w.timeLeft <= 0) {
    w.kind = nextKind(w);
    w.timeLeft = WEATHER_MIN_SPELL + w.rng() * (WEATHER_MAX_SPELL - WEATHER_MIN_SPELL);
    w.drops.length = 0;
  }
  if (w.kind !== 'rain') {
    if (w.drops.length) w.drops.length = 0;
    return;
  }
  while (w.drops.length < 90) {
    w.drops.push({
      x: w.rng() * (vw + 40), y: w.rng() * vh,
      len: 10 + w.rng() * 12, speed: 520 + w.rng() * 260,
    });
  }
  for (const d of w.drops) {
    d.y += d.speed * dt;
    d.x -= d.speed * 0.18 * dt; // the rain slants with the wind
    if (d.y > vh) { d.y = -20; d.x = w.rng() * (vw + 40); }
    if (d.x < -20) d.x = vw + 20;
  }
}

// Grip multiplier for driving: rain-slick roads steer and accelerate worse,
// fog only slightly.
export function gripFactor(w) {
  if (w.kind === 'rain') return 0.55;
  if (w.kind === 'fog') return 0.85;
  return 1;
}

export function weatherLabel(w) {
  return `${WEATHER_ICONS[w.kind]} ${WEATHER_NAMES[w.kind]}`;
}

// Rain streaks and the fog wash, drawn in screen space over the world.
export function drawWeather(ctx, w, vw, vh) {
  if (w.kind === 'rain') {
    ctx.strokeStyle = 'rgba(174, 194, 224, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const d of w.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.len * 0.18, d.y + d.len);
    }
    ctx.stroke();
  }
  if (w.kind === 'fog') {
    ctx.fillStyle = 'rgba(200, 208, 220, 0.14)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = 'rgba(200, 208, 220, 0.10)';
    ctx.fillRect(0, 0, vw, vh);
  }
}

// Save/load: only the kind and the remaining spell time ride along.
export function weatherSave(w) {
  return { kind: w.kind, timeLeft: w.timeLeft };
}
export function weatherLoad(w, d) {
  if (!d || !WEATHER_KINDS.includes(d.kind)) return;
  w.kind = d.kind;
  w.timeLeft = typeof d.timeLeft === 'number' ? clamp(d.timeLeft, 5, WEATHER_MAX_SPELL) : 60;
  w.drops.length = 0;
}

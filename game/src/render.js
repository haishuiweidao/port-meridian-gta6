// Rendering: top-down dusk city, cars, people, police, HUD + minimap.
// All art is drawn procedurally with canvas — no image assets.
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, COLORS } from './config.js';
import { missionTarget, missionName } from './world.js';
import { isMuted } from './audio.js';

export const SCREEN_TITLE = 'title', SCREEN_PLAY = 'play', SCREEN_OVER = 'over', SCREEN_PAUSE = 'pause';
let cam = { x: 0, y: 0 };

export function drawWorld(ctx, s, w, h, screen) {
  const p = s.player;
  cam.x += ((p.x - w / 2) - cam.x) * 0.12;
  cam.y += ((p.y - h / 2) - cam.y) * 0.12;
  cam.x = Math.max(0, Math.min(WORLD.w - w, cam.x));
  cam.y = Math.max(0, Math.min(WORLD.h - h, cam.y));
  ctx.save();
  ctx.fillStyle = '#10131a'; ctx.fillRect(0, 0, w, h);
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  // Ground: grass, sand strip, harbour water (south).
  ctx.fillStyle = COLORS.grass; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.fillStyle = COLORS.sand; ctx.fillRect(0, 1700, WORLD.w, 60);
  ctx.fillStyle = COLORS.water; ctx.fillRect(0, 1760, WORLD.w, WORLD.h - 1760);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 80; x < WORLD.w; x += 180) ctx.fillRect(x, 1780, 90, 6);
  // Park.
  ctx.fillStyle = COLORS.park; ctx.fillRect(ROADS_X[3] + ROAD_W / 2, ROADS_Y[4] + ROAD_W / 2, ROADS_X[4] - ROADS_X[3] - ROAD_W, ROADS_Y[5] - ROADS_Y[4] - ROAD_W);
  for (const t of s.trees) {
    ctx.fillStyle = '#1d4a26'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f7a3d'; ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // Roads.
  ctx.fillStyle = COLORS.road;
  for (const x of ROADS_X) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD.h);
  for (const y of ROADS_Y) ctx.fillRect(0, y - ROAD_W / 2, WORLD.w, ROAD_W);
  ctx.strokeStyle = COLORS.roadLine; ctx.lineWidth = 3; ctx.setLineDash([22, 18]);
  ctx.beginPath();
  for (const x of ROADS_X) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.h); }
  for (const y of ROADS_Y) { ctx.moveTo(0, y); ctx.lineTo(WORLD.w, y); }
  ctx.stroke(); ctx.setLineDash([]);
  // Buildings with windows.
  for (const b of s.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#ffd166';
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(2, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 3 + b.windows) % 4 === 0) ctx.fillRect(b.x + 8 + i * 24, b.y + 8 + j * 24, 10, 12);
    }
  }
  // Pickups.
  for (const pk of s.pickups) {
    ctx.fillStyle = pk.kind === 'cash' ? '#2ecc71' : pk.kind === 'health' ? '#e74c3c' : '#f1c40f';
    ctx.beginPath(); ctx.arc(pk.x, pk.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x, pk.y);
  }
  // Mission target marker (pulsing).
  const target = missionTarget(s);
  if (target && screen === SCREEN_PLAY) {
    const pulse = 26 + Math.sin(s.time * 5) * 7;
    ctx.strokeStyle = target.kind === 'deliver' ? '#2ecc71' : '#f1c40f';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = target.kind === 'deliver' ? '#2ecc71' : '#f1c40f';
    ctx.beginPath(); ctx.arc(target.x, target.y, 7, 0, Math.PI * 2); ctx.fill();
  }
  // Cars.
  for (const c of s.cars) drawCar(ctx, c);
  for (const cop of s.police) if (cop.car) drawCar(ctx, cop, true);
  // Pedestrians.
  for (const ped of s.peds) {
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f5d0a9'; ctx.beginPath(); ctx.arc(ped.x, ped.y - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Police on foot.
  for (const cop of s.police) if (!cop.car) {
    ctx.fillStyle = '#16213e'; ctx.beginPath(); ctx.arc(cop.x, cop.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a90e2'; ctx.beginPath(); ctx.arc(cop.x, cop.y, 6, 0, Math.PI * 2); ctx.fill();
  }
  // Player.
  if (!p.dead) {
    if (p.inCar) { /* player is inside the car already drawn */ }
    else {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = '#ff4757'; ctx.fillRect(-13, -9, 26, 18);
      ctx.fillStyle = '#2f3542'; ctx.fillRect(6, -6, 10, 12);
      ctx.fillStyle = '#f5d0a9'; ctx.beginPath(); ctx.arc(10, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Aim line when armed.
      if (p.weapon === 'pistol') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.angle) * 60, p.y + Math.sin(p.angle) * 60); ctx.stroke();
      }
    }
  }
  // Bullets + particles.
  for (const b of s.bullets) { ctx.fillStyle = '#ffe66d'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const pt of s.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawHUD(ctx, s, w, h, screen);
  if (screen === SCREEN_TITLE) drawTitle(ctx, s, w, h);
  if (screen === SCREEN_PAUSE) drawOverlay(ctx, w, h, 'PAUSED', 'P to resume · S to save · M to mute · R to restart the day');
  if (screen === SCREEN_OVER) drawOverlay(ctx, w, h, 'BUSTED', 'Mara is down. Press R to restart the day.');
}

function drawCar(ctx, c, police = false) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 4, c.w, c.h);
  ctx.fillStyle = police ? '#16213e' : c.color;
  ctx.beginPath(); ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 7); ctx.fill();
  ctx.fillStyle = police ? '#ffffff' : 'rgba(255,255,255,0.75)';
  ctx.fillRect(-6, -c.h / 2 + 3, 14, c.h - 6);
  ctx.fillStyle = '#111';
  ctx.fillRect(-c.w / 2 + 2, -c.h / 2 - 3, 8, 5); ctx.fillRect(-c.w / 2 + 2, c.h / 2 - 2, 8, 5);
  ctx.fillRect(c.w / 2 - 10, -c.h / 2 - 3, 8, 5); ctx.fillRect(c.w / 2 - 10, c.h / 2 - 2, 8, 5);
  if (police) {
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(-14, -c.h / 2 + 4, 8, 5);
    ctx.fillStyle = '#3498db'; ctx.fillRect(-14, c.h / 2 - 9, 8, 5);
  }
  if (c.special) { ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', 0, -16); }
  ctx.restore();
}

function drawHUD(ctx, s, w, h, screen) {
  const p = s.player;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(12, 12, 250, 96);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`$${p.cash}`, 24, 22);
  ctx.font = '14px sans-serif';
  ctx.fillText(`Health ${Math.max(0, Math.round(p.health))}  ·  Ammo ${p.ammo}  ·  ${p.weapon === 'pistol' ? 'Pistol' : 'Fists'}`, 24, 48);
  // Mission line must fit the 250px HUD panel: truncate long names with an ellipsis.
  ctx.fillText(fitText(ctx, missionName(s), 226), 24, 70);
  // Wanted stars.
  ctx.font = 'bold 22px sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < s.stars ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 24 + i * 26, 84);
  }
  // Message / dialog.
  if (s.messageT > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(w / 2 - 260, h - 64, 520, 34);
    ctx.fillStyle = '#ffe66d'; ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(s.message, w / 2, h - 54);
  }
  if (s.dialogT > 0 && s.dialog) {
    ctx.fillStyle = 'rgba(10,10,26,0.85)'; ctx.fillRect(60, h - 150, w - 120, 66);
    ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif'; ctx.textAlign = 'left';
    wrapText(ctx, s.dialog, 76, h - 138, w - 152, 20);
  }
  // Minimap (top right): roads, water, player, cars, police, target.
  const mw = 190, mh = 138, mx = w - mw - 12, my = 12, sx = mw / WORLD.w, sy = mh / WORLD.h;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#1d4e6b'; ctx.fillRect(mx, my + mh - 8, mw, 8);
  ctx.fillStyle = '#2e5d3a'; ctx.fillRect(mx, my, mw, mh - 8);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
  for (const x of ROADS_X) { ctx.beginPath(); ctx.moveTo(mx + x * sx, my); ctx.lineTo(mx + x * sx, my + mh); ctx.stroke(); }
  for (const y of ROADS_Y) { ctx.beginPath(); ctx.moveTo(mx, my + y * sy); ctx.lineTo(mx + mw, my + y * sy); ctx.stroke(); }
  const target = missionTarget(s);
  if (target) { ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(mx + target.x * sx, my + target.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
  for (const c of s.cars) { ctx.fillStyle = '#fff'; ctx.fillRect(mx + c.x * sx - 1, my + c.y * sy - 1, 3, 3); }
  for (const cop of s.police) { ctx.fillStyle = '#4a90e2'; ctx.beginPath(); ctx.arc(mx + cop.x * sx, my + cop.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('PORT MERIDIAN', mx, my + mh + 12);
  ctx.fillText(`WASD move/drive · E car · Click ${p.weapon === 'pistol' ? 'shoot' : 'punch'} · 1/2 weapon · M ${isMuted() ? 'unmute' : 'mute'} · P pause`, 12, h - 22);
  if (screen === SCREEN_PLAY && p.inCar) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(12, 116, 250, 30);
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
    ctx.fillText(`Driving: ${p.inCar.name || 'car'} — ${Math.round(Math.abs(p.inCar.speed) * 0.36)} km/h`, 24, 124);
  }
}
function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const word of words) {
    if (ctx.measureText(line + word).width > maxW && line) { ctx.fillText(line, x, yy); line = ''; yy += lh; }
    line += word + ' ';
  }
  ctx.fillText(line, x, yy);
}
function drawTitle(ctx, s, w, h) {
  ctx.fillStyle = 'rgba(8,8,20,0.72)'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 60px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PORT MERIDIAN', w / 2, h / 2 - 118);
  ctx.fillStyle = '#ff6b81'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText('An open-world crime story — by Mara Voss', w / 2, h / 2 - 72);
  ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif';
  ctx.fillText('Steal cars, outrun the harbour police, and finish Sal Moreno’s three jobs.', w / 2, h / 2 - 8);
  ctx.fillText('WASD move / drive · E enter & steal a car · Mouse aim, click to fight · 1/2 switch weapon', w / 2, h / 2 + 26);
  ctx.fillText('Shift run · Space brake · P pause · S save · M mute', w / 2, h / 2 + 54);
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Click or press Enter to start', w / 2, h / 2 + 100);
  ctx.fillStyle = '#aaa'; ctx.font = '13px sans-serif';
  ctx.fillText('Original game — no Rockstar / GTA assets. Your progress saves in this browser.', w / 2, h / 2 + 132);
}
function drawOverlay(ctx, w, h, title, sub) {
  ctx.fillStyle = 'rgba(8,8,20,0.7)'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, h / 2 - 10);
  ctx.font = '18px sans-serif'; ctx.fillText(sub, w / 2, h / 2 + 32);
}

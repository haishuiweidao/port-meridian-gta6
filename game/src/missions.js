// Story missions for Port Meridian. All original: Mara Voss, a courier who
// gets pulled into one last job for the harbour fixer, Sal Moreno.
import { WORLD } from './config.js';
export const MISSIONS = [
  {
    id: 1, name: 'First Pickup', giver: 'Sal Moreno',
    brief: 'Sal needs a parcel collected from the north market. Walk or drive to the yellow marker, grab it, then deliver it to the green drop-off. No trouble — yet.',
    steps: [
      { text: 'Go to the yellow pickup marker', target: { x: 500, y: 200 }, kind: 'pickup' },
      { text: 'Deliver the parcel to the green drop-off', target: { x: 2000, y: 1400 }, kind: 'deliver' },
    ],
    reward: 200,
  },
  {
    id: 2, name: 'Hot Delivery', giver: 'Sal Moreno',
    brief: 'The parcel is hot. The moment you pick it up the harbour police will be on you — wanted level 2. Lose them or outrun them, then make the delivery.',
    steps: [
      { text: 'Pick up the parcel — police will come', target: { x: 1100, y: 800 }, kind: 'pickup', wanted: 2 },
      { text: 'Deliver it while the police chase you', target: { x: 800, y: 1700 }, kind: 'deliver' },
    ],
    reward: 400,
  },
  {
    id: 3, name: 'The Harbour Job', giver: 'Sal Moreno',
    brief: 'One last job. Steal the white coupe parked by the marina, drive it to the harbour gate, and shake the police — wanted level 3. Finish this and Mara is free.',
    steps: [
      { text: 'Steal the white coupe by the marina', target: { x: 2300, y: 1400 }, kind: 'steal' },
      { text: 'Drive the coupe to the harbour gate', target: { x: 1400, y: 1700 }, kind: 'deliver', wanted: 3 },
    ],
    reward: 800,
  },
  {
    id: 4, name: 'Harbor Heist', giver: 'Sal Moreno',
    brief: 'Sal has one more score, and it pays double. Steal the black getaway sedan parked up north — the harbour police will swarm you at wanted level 3. Lose them completely (0 stars), then deliver the sedan to the crane at the harbour. No witnesses, no heat, no payout.',
    steps: [
      { text: 'Steal the black getaway sedan up north', target: { x: 200, y: 200 }, kind: 'stealSpecific', carName: 'Getaway Sedan', wanted: 3 },
      { text: 'Lose the police — drop to 0 wanted stars', target: { x: 1400, y: 1700 }, kind: 'evade' },
      { text: 'Deliver the sedan to the harbour crane', target: { x: 2300, y: 1700 }, kind: 'deliver' },
    ],
    reward: 1200,
  },
];
export function missionIntro(m) {
  return `${m.name} — ${m.giver}: ${m.brief}`;
}

// Look a mission up by its id (1-based story order), or null when unknown.
export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

// True for the final story mission — the one that frees Mara.
export function isFinalMission(m) {
  return !!m && m.id === MISSIONS[MISSIONS.length - 1].id;
}

// Total cash the whole story pays out, for the end-of-story summary line.
export function totalStoryReward() {
  return MISSIONS.reduce((sum, m) => sum + m.reward, 0);
}

// Short progress label, e.g. "Mission 2 of 4".
export function missionProgressLabel(index) {
  const n = Math.min(index + 1, MISSIONS.length);
  return `Mission ${n} of ${MISSIONS.length}`;
}

// Fail fast at load time if a mission target sits outside the city: a marker
// the player can never reach would soft-lock that mission.
for (const m of MISSIONS) {
  for (const step of m.steps) {
    if (step.target.x < 0 || step.target.x > WORLD.w || step.target.y < 0 || step.target.y > WORLD.h) {
      throw new Error(`Mission "${m.name}": step "${step.text}" target (${step.target.x}, ${step.target.y}) is outside the ${WORLD.w}x${WORLD.h} city.`);
    }
  }
}

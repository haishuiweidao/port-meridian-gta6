// Port Meridian — original open-world crime game for make.fun gta6-01.
// All names, city, characters, vehicles, story, art and sound are original.
// Nothing from Rockstar Games / Grand Theft Auto.
export const WORLD = { w: 2600, h: 1900 };
export const STEP = 1 / 60;
// Roads: vertical x positions and horizontal y positions (grid, 300px pitch).
export const ROADS_X = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
export const ROADS_Y = [200, 500, 800, 1100, 1400, 1700];
export const ROAD_W = 72;
export const COLORS = {
  grass: '#2e5d3a', road: '#23262e', roadLine: '#c8b45a',
  water: '#1d4e6b', sand: '#c2a878', park: '#2a6b35',
  building: ['#5a4a6b', '#6b4a3a', '#3a5a6b', '#6b5a3a', '#4a3a5a', '#7a6a4a'],
};
export const PLAYER = { walk: 190, run: 300, radius: 14, health: 100 };
export const CAR = { accel: 420, brake: 700, maxSpeed: 460, maxReverse: 160, turn: 2.6 };
export const WANTED_DECAY = 0.045; // heat per second with no crime
export const WANTED_MAX = 5; // highest wanted level / most police at once
export const SAVE_KEY = 'port-meridian-save-v1';

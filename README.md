# Port Meridian

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · rank](https://make.fun/badge/gta6-01/haishuiweidao/port-meridian-gta6/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun · reward](https://make.fun/badge/gta6-01/haishuiweidao/port-meridian-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for make.fun's "Make GTA 6" bounty ($1,666 in USDC).
Top-down, static files, no network requests — open `game/index.html` in desktop
Chrome and play.

## The game

You are **Mara Voss**, a courier in the coastal city of **Port Meridian**.
Sal Moreno, the harbour fixer, has four jobs for you — finish them and you
are free. Walk the streets, steal cars, outrun the harbour police, and watch
your wanted level.

- A city on foot and by car: road grid, buildings, a central park, marina and harbour
- Traffic and pedestrians who flee when trouble starts
- Stealable cars (press E near one), police cars and foot cops, wanted level 0–5 stars
- Combat: fists or pistol, mouse aim
- Four story missions with dialogue and cash rewards ($200 / $400 / $800 / $1,200), ending with the Harbor Heist
- Taxi side job: pick up waiting fares in your car, beat the clock, earn fares, tips and a driver rating
- 10 hidden packages worth $150 each, saved with your progress
- Day/night cycle with a HUD clock and headlights after dark
- HUD with cash, health, ammo, wanted stars and a live minimap
- Start screen, pause, save/load (in your browser), synthesised sound and music

Everything — city, characters, vehicles, names, story, art, sound and music —
is original. Nothing from Rockstar Games or any other commercial game.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static file server.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Run |
| E | Enter, steal or leave a car |
| Mouse click | Punch / shoot (aim with the mouse) |
| 1 / 2 | Toggle weapon (fists / pistol) — either key switches |
| Space | Brake (in a car) |
| P | Pause |
| S | Save |
| M | Mute |
| R | Restart the day (after being busted) |

## Screenshots

`screenshots/1-start.jpg` is the cover. All four are real renders of the game,
staged deterministically with `?shot=start|play|chase|taxi&seed=1` — the chase
shot is a night scene with headlights, and the taxi shot shows a fare in progress.

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

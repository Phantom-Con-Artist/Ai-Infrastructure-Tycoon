# Contributing

Thanks for wanting to help. This is a community parody game, so contributions don't need to be serious.
They just need to work and be fun.

## Easy ways to help

- **Play it and report what broke.** Balance problems count as bugs. "I made $40B in a week" is a great bug report.
- **Add parody.** New companies, CEOs, model names, news headlines, Chirper posts, achievements or events.
  Most of these live in [`src/sim/data/lore.ts`](src/sim/data/lore.ts), [`src/sim/corporate.ts`](src/sim/corporate.ts) and [`src/sim/events.ts`](src/sim/events.ts).
- **Make 3D assets.** The Blender scripts are in [`tools/blender`](tools/blender). Exported `.glb` files go in
  `src/renderer/public/models`. Keep them light and low-poly.
- **Improve the simulation.** Better cooling physics, smarter rivals, new tech in the [R&D tree](src/sim/data/tech.ts).
- **Improve the docs**, including this file.

Not sure where to start? Look for issues labelled `good first issue` or `parody idea`.

## Ground rules for parody

- Parody names only. No real company names, logos or product names in the game itself.
- Punch up. Satirize industries, hype and corporate behavior, not people's identity or private lives.
- Keep it light. If a joke needs a paragraph of explanation, it probably isn't working.

## Setting up

```bash
git clone https://github.com/Phantom-Con-Artist/Ai-Infrastructure-Tycoon.git
cd Ai-Infrastructure-Tycoon
npm install
npm run dev     # Electron
npm run web     # or play in the browser
```

## Before you open a pull request

```bash
npm run typecheck
npm test
```

Both should pass. If you changed the simulation, add or update a test in `src/sim/*.test.ts`.
The tests run headless and fast, and they've already caught a lot of embarrassing bugs.

## How the code is laid out

- `src/sim`: the game rules. Pure TypeScript with no React and no DOM. One `step()` is one in-game hour.
  It's deterministic: the same seed and the same actions give the same world.
- `src/renderer`: everything you see. React screens, Three.js scenes, SVG art, Remotion videos.
- `src/main` and `src/preload`: Electron plumbing (window controls, SQLite saves).

A few conventions:

- Player actions live in `src/sim/actions.ts` (and friends) and return `{ ok, value } | { ok: false, error }`.
  The UI calls them through `act()` from the store, which shows the error as a toast.
- Anything random goes through the seeded RNG in `src/sim/rng.ts`, never `Math.random()`, or saves stop replaying.
- If you change the shape of the world state, bump `WORLD_VERSION` in `src/sim/world.ts`.

## Commit messages

Plain English is fine. Say what changed and, if it isn't obvious, why.
"Make immersion cooling cheaper because nobody used it" is perfect.

## Questions

Open an issue or start a discussion. There are no stupid questions, only underpowered PDUs.

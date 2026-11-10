# AI Infrastructure Tycoon

Electron + React + Three.js management sim. Build data centers, wrangle power and cooling, rack GPU clusters,
rent them out, train models for other companies, train and sell your own. Fictional (parody) companies throughout.

- `npm run dev` — launch in dev mode (if launched from VS Code: `env -u ELECTRON_RUN_AS_NODE npm run dev`)
- `npm test` — simulation + UI smoke tests
- `src/sim` — deterministic, serialisable simulation (1 tick = 1 hour): power dispatch, thermals/PUE, failures (MTBF),
  Chinchilla scaling laws, MFU/goodput, rental & inference markets, rival labs, events, finance
- Saves go to SQLite (better-sqlite3) in the Electron userData directory.

# apps

This repository is a monorepo. The game lives at the repository root; everything that is not the game lives here.

| Path | What it is | Deploys to |
| --- | --- | --- |
| `/` (root) | The game: Electron, React, Three.js and the simulation in `src/sim` | Packaged apps in `release/` (`npm run dist`) |
| `apps/site` | The website: landing page, documentation and about page (Astro) | Cloudflare Pages |
| `apps/motion` | Remotion compositions that render the website's clips from screenshots of the game | Writes into `apps/site/public/clips` |

Each app has its own `package.json` and lockfile and is installed on its own (`cd apps/site && npm install`).
They are deliberately not npm workspaces of the root package: the game's install rebuilds a native module for
Electron, which a website build on Cloudflare has no use for.

## Updating the website's pictures and clips

1. Run the game's browser build from the repository root: `npm run web`.
2. Capture new 1440×900 screenshots into `apps/site/src/assets/shots/` and copy them to `apps/motion/public/shots/`.
3. Render the clips: `cd apps/motion && npm run render` (needs `ffmpeg`).
4. Build the site: `cd apps/site && npm run build`.

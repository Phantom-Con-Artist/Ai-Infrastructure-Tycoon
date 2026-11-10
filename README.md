<div align="center">

<img src="resources/icon.svg" alt="AI Infrastructure Tycoon icon" width="120" />

# AI Infrastructure Tycoon

**Pour concrete. Buy GPUs. Set them on fire (thermally). Conquer Earth (economically).**

A free, open-source parody management game about running an AI company from an empty field
to a planet-sized compute empire, made for fun, by and for the community.

[![Version](https://img.shields.io/badge/version-0.1.0%20beta-6d5ae6?style=flat-square)](https://github.com/Phantom-Con-Artist/Ai-Infrastructure-Tycoon/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/Phantom-Con-Artist/Ai-Infrastructure-Tycoon/ci.yml?branch=main&style=flat-square&label=tests)](https://github.com/Phantom-Con-Artist/Ai-Infrastructure-Tycoon/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-1fa37a?style=flat-square)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-1fa37a?style=flat-square)](CONTRIBUTING.md)
[![Parody](https://img.shields.io/badge/100%25-parody-f0b94d?style=flat-square)](DISCLAIMER.md)
<br/>
[![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-20232a?style=flat-square&logo=react&logoColor=61dafb)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Remotion](https://img.shields.io/badge/Remotion-0b84f3?style=flat-square)](https://www.remotion.dev/)
[![Blender](https://img.shields.io/badge/Blender-assets-f5792a?style=flat-square&logo=blender&logoColor=white)](https://www.blender.org/)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-d97757?style=flat-square&logo=claude&logoColor=white)](https://claude.com/claude-code)

<img src="docs/screenshots/hq.png" alt="Your company HQ: a ring-shaped campus with your logo floating above it" width="100%" />

</div>

---

## What is this?

You start with $40M, a CEO title and absolutely nothing else. No land, no servers, no idea.

From there you buy land, build data halls, and drag racks, power units and cooling onto the floor. Your servers come from parody chipmakers or from chips you design yourself. You rent them out, train models, launch products and hold keynotes with suspiciously vague bar charts.
The rivals are Qooqle, Nicosoft, Ratthropic, OpenAye, Nvidious, Advanced Micro Dudes and friends.
None of them are real, and all of them are trying to beat you.

It never ends. There's always a bigger node, a hotter chip, a hungrier model.
The only lose condition is running out of money for 30 days.

> [!NOTE]
> This is a **beta** and a **community parody project**. Expect rough balance, odd bugs, and
> a lot of jokes about leather jackets. Ideas and pull requests are very welcome.

## Screenshots

<table>
<tr>
<td width="50%"><img src="docs/screenshots/ux-hq.png" alt="HQ with the campus, today's next steps and a manager's request waiting for sign-off" /><br/><sub><b>HQ tells you what matters today.</b> Up to three next steps, requests from your managers, and your path so far.</sub></td>
<td width="50%"><img src="docs/screenshots/ux-paper.png" alt="The Daily Compute, a broadsheet newspaper" /><br/><sub><b>The Daily Compute.</b> A morning paper every game day, built from what actually happened.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/hall-editor.png" alt="3D hall with open racks, 8-GPU servers, blanking panels and cable ladders" /><br/><sub><b>The hall editor.</b> Every server, sled and status light is visible. Hold-click anything to pick it up and move it.</sub></td>
<td width="50%"><img src="docs/screenshots/chip-3d.png" alt="Exploded 3D chip with gold lid, RGB HBM stacks, an espresso cup and a rubber duck" /><br/><sub><b>Make your own chip, in 3D.</b> Explode the package, pick a finish, and bolt on a gold lid, an espresso boiler or a qubit. Every mod changes the numbers.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/model-foundry.png" alt="Model Foundry with modality cards and fine-tune options" /><br/><sub><b>Model Foundry.</b> Text, code, image, speech, video or omni. Train from scratch, fine-tune, distil, or keep pre-training any base.</sub></td>
<td width="50%"><img src="docs/screenshots/node-studio.png" alt="Server node designer with live trade-off table" /><br/><sub><b>Design your own server.</b> Cooling, power profile, host RAM and parts grade, with a live comparison against the stock box.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/globe.png" alt="Network globe with dotted continents and glowing backbone arcs" /><br/><sub><b>Your network on the globe.</b> 15 regions, your backbone in light, rival campuses in the dark.</sub></td>
<td width="50%"><img src="docs/screenshots/whos-who.png" alt="Grid of parody CEOs with company marks" /><br/><sub><b>Who's who.</b> 35 parody companies, each with a CEO, a brand mark, a headquarters and opinions.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/fleet-brands.png" alt="Fleet shop with vendor word-marks and branded GPU modules" /><br/><sub><b>Shop like it's a real launch.</b> Vendor word-marks, branded modules, and your own designs next to theirs.</sub></td>
<td width="50%"><img src="docs/screenshots/chip-designer.png" alt="Chip designer with package floorplan and wafer map" /><br/><sub><b>Then do the maths.</b> Floorplan, wafer map, yield, NRE, time to silicon.</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/model-designer.png" alt="Animated neural network flowchart" /><br/><sub><b>Design a model.</b> Click the diagram. Add experts. Regret the KV cache.</sub></td>
<td><img src="docs/screenshots/store.png" alt="Product dashboard with users, revenue and token charts" /><br/><sub><b>Ship products.</b> Free, Plus, Pro. Users churn when your GPUs can't keep up.</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/power.png" alt="Power flow diagram and dispatch strategies" /><br/><sub><b>Keep the lights on.</b> Batteries, PPAs, demand response, and Texas.</sub></td>
<td><img src="docs/screenshots/rankings.png" alt="Leaderboards" /><br/><sub><b>Leaderboards.</b> Models, labs, benchmarks, companies, and the rich list you are trying to top.</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/keynote.png" alt="Remotion-rendered keynote" /><br/><sub><b>Keynotes.</b> Generated with Remotion from your actual products. Hype is a resource.</sub></td>
<td><img src="docs/screenshots/research.png" alt="R&D tree" /><br/><sub><b>R&D.</b> Eleven branches and nine levels, with upgrades marked ∞ you can research forever.</sub></td>
</tr>
</table>

<details>
<summary>More screenshots</summary>

| | |
|---|---|
| ![Splash](docs/screenshots/splash.png) | ![Menu](docs/screenshots/menu.png) |
| ![New company](docs/screenshots/new-company.png) | ![Team](docs/screenshots/team.png) |
| ![Your website](docs/screenshots/web.png) | |

</details>

## What you can do

| | |
|---|---|
| 🏗️ **Build** | Pick from 15 regions with real-ish power prices, climates and permit delays. Lay out halls tile by tile in 3D, and hold-click anything to move it later. |
| ⚡ **Power** | Utility feeds, solar, wind, gas, batteries, geothermal and eventually small reactors. Choose a dispatch strategy and sign PPAs. |
| ❄️ **Cool** | Air, rear-door, direct-to-chip, immersion. Air can't handle a Blackwall-class rack, and physics will remind you. |
| 🔩 **Silicon** | Design GPUs and CPUs from process node to HBM stack in a live 3D package, with finishes and 12 absurd-but-real mods. Tape out, buy wafers or build your own fab with EUV scanners, then sell chips. Or design your own 8-GPU server nodes around anyone's GPU. |
| 🧠 **Models** | Real transformer maths (GQA, MLA, mixture-of-experts), a dataset market with "legal risk", and benchmark scores that depend on your data mix. Six modalities as separate business lines; train from scratch, fine-tune, distil or continue pre-training from your models or open weights. |
| 🛍️ **Products** | Chat apps, coding agents, an API platform with keys and rate limits, and enterprise seats. You design the plans. |
| ☁️ **Cloud** | Rent out GPU and CPU servers on-demand, reserved or spot, or rent compute yourself when you're short. |
| 👥 **People** | Hire named weirdos with traits, keep them happy, and watch rivals poach your best ones. |
| 🏆 **Rivals** | 35 parody companies with CEOs and brand marks, rival campuses on a network globe, leaderboards, acquisitions (if regulators let you), an IPO, a rich list, and 32 achievements. |
| 🧭 **Guidance** | HQ suggests the next few things worth doing. Hire managers for facilities, sales, people, finance and research and let them run on autopilot; they ask before anything you can't undo. |
| 🛡️ **Safety net** | Anything irreversible asks first (hold to confirm), big purchases show your cash afterwards, and small edits can be undone for five seconds. |
| 📰 **News** | A headline ticker, a news drawer you can filter, and The Daily Compute every morning. |
| 🧪 **Sandbox** | Your own rules: unlimited cash, no bankruptcy, six difficulty sliders and a developer panel. |
| 🎬 **Hype** | Keynotes and one-click trailers made with Remotion, plus an in-game web with a site builder and a domain registrar. |

## Getting started

You need [Node.js](https://nodejs.org/) 20 or newer and a computer that doesn't mind a little WebGL.

```bash
git clone https://github.com/Phantom-Con-Artist/Ai-Infrastructure-Tycoon.git
cd Ai-Infrastructure-Tycoon
npm install
npm run dev        # launches the game in Electron
```

Other handy scripts:

```bash
npm run web        # play in a browser instead (saves go to localStorage)
npm test           # run the simulation tests
npm run typecheck  # make TypeScript happy
npm run dist       # package an installer (AppImage / NSIS / DMG)
```

> [!TIP]
> Launching from a VS Code terminal? VS Code sets `ELECTRON_RUN_AS_NODE`, which stops Electron
> from opening a window. Use `env -u ELECTRON_RUN_AS_NODE npm run dev` instead.

## How to play (the 30-second version)

0. Not sure what to do? **HQ** always lists the next steps — click one to jump there.
1. **Build → Sites** → buy land somewhere with cheap power and cold air.
2. Break ground on a hall, then place **PDUs**, **coolers** and **racks** (drag to paint rows).
3. **Build → Fleet** → order servers, wait for the truck, install them from the loading dock.
4. Rent them out, or sign a training contract in **Deals**.
5. Press play. Watch the money. Watch the temperature. Panic appropriately.
6. Later: research your way into chips, models, products, fabs and, eventually, the Sun.

Controls: `Space` pauses, `1`–`4` set the speed, and `F11` toggles fullscreen. In a Sandbox game, `` ` `` opens the developer panel. In the hall editor, `R` rotates, `X` removes and `Esc` goes back to inspect.

## Under the hood

The simulation is plain, deterministic TypeScript in [`src/sim`](src/sim). It advances one hour per tick, can be seeded, and serializes straight to a save file.
It has no UI code in it, so it's easy to test and easy to mod.

Some numbers are calibrated against public reporting so the game *feels* right:

- A chip configured like an H100 comes out near 80B transistors, ~990 dense BF16 TFLOPS and ~700 W.
- Parameter counts for the Llamma / Mixtrial / DeepSink templates match their published sizes.
- About 5% of chat users pay, churn runs around 5–7% a month, and API rate limits follow cumulative-spend tiers.

All of it is still a game. The numbers are simplified, exaggerated where that's funnier,
and absolutely not financial or engineering advice. See the [disclaimer](DISCLAIMER.md).

```
src/
├── main/        Electron main process (window, SQLite saves)
├── preload/     Safe bridge between the window and the game
├── renderer/    React UI, Three.js scenes, SVG art, Remotion videos
└── sim/         The game itself: power, cooling, chips, models, markets, people
resources/       App icon
tools/blender/   Python used to build the 3D assets in Blender
docs/            Design notes, roadmap, screenshots
```

There's more in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## Contributing

This is a community parody game, so it gets better with more people being silly at it.
New parody companies, absurd achievements, better Blender models, balance fixes and bug reports are all great contributions.
Start with [CONTRIBUTING.md](CONTRIBUTING.md) and please read the [Code of Conduct](CODE_OF_CONDUCT.md).

## Disclaimer

Everything in this game is fictional parody. Companies, products, people and quotes are made up or exaggerated for comedy, and none of them are affiliated with or endorsed by anyone real.
The full version is in [DISCLAIMER.md](DISCLAIMER.md).

## License

[MIT](LICENSE). Do what you like, just keep the license notice.

## Credits

Made by **[Phantom-Con Artist](https://github.com/Phantom-Con-Artist)** with
[Electron](https://www.electronjs.org/), [React](https://react.dev/), [Three.js](https://threejs.org/),
[React Three Fiber](https://r3f.docs.pmnd.rs/), [Remotion](https://www.remotion.dev/), [Blender](https://www.blender.org/),
[Vite](https://vite.dev/), [SQLite](https://sqlite.org/), [Lucide](https://lucide.dev/) icons, and a lot of help from
[Claude Code](https://claude.com/claude-code).

<div align="center"><sub>No GPUs were harmed in the making of this game. Several were simulated to death.</sub></div>

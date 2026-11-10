# AI Infrastructure Tycoon — Game Design

A light 3D management game. You are the CEO of an AI infrastructure company in a parody universe
(Qooqle, Nicosoft, Ratthropic, OpenAye, Nvidious, Advanced Micro Dudes …). Everything is simulated
hour by hour with real-world physics and economics, then exaggerated just enough to be fun.

## Core loop (minutes)

```
        ┌──────────── cash ─────────────┐
        ▼                               │
   BUILD  ──►  POWER & COOL  ──►  RACK  ──►  SELL COMPUTE
 (land, halls)  (PDUs, CRAHs,    (servers,    (cloud VMs, contract
                 utility, gens)   fabric)      training, own models)
        ▲                                        │
        └──── reputation · hype · R&D ◄──────────┘
```

1. **Place** — in the 3D hall editor, drop racks, PDUs and cooling units on a tile grid. Every rack
   needs a PDU in reach and a cooler in reach. Overloaded PDUs trip and throttle. Under-cooled racks heat up,
   throttle and fail more often (Arrhenius hazard). This is the power-grid puzzle.
2. **Fill** — order servers (8 GPUs each) from vendors or from your own fab line, then slot them into racks.
3. **Sell** — split capacity between cloud VMs (on-demand / reserved / spot), contract training for
   customers, and training plus serving your own models.
4. **Grow** — reinvest in new halls, sites and power plants, and research the next cooling or fabric tier.

## Mid loop (hours of play)

- **Silicon** — open a chip division. Design your own accelerator from the atoms up: process node →
  transistor density → die area → compute units and clocks, then HBM generation and stack count, then packaging
  (monolithic, CoWoS chiplets, wafer-scale). Physics pushes back through yield (Poisson defect density), power
  density, reticle limits and tape-out NRE. Tape out, buy wafer allocation from Taiwan Semiconductor-ish Co.,
  and use the chips yourself or sell them to rivals. The package is drawn live in 3D (exploded view, finishes), and
  12 absurd mods (gold lid, espresso boiler, quantum-ish garnish, aquarium loop, ludicrous bin …) each move a real
  number: FLOPS, power, unit cost, NRE, schedule, yield or market appeal.
- **Node studio** — build your own 8-GPU server around any GPU on sale: air or cold-plate, eco/balanced/max power,
  host RAM, parts grade. Designs are orderable SKUs; liquid nodes need a liquid hall.
- **People** — hire named candidates into teams (Facilities, Chip Design, Research Lab, Cloud, Sales).
  Team skill drives MFU, repair time, research speed, chip design time and sales. Labs are research groups
  with a focus (Scaling, Efficiency, Safety, Hardware).
- **Models** — train with real scaling laws (6·N·D FLOPs, Chinchilla loss), post-train, launch with
  a **keynote**, and fight for market share on the Elo leaderboard.
- **Model Foundry** — text, code, image, speech, music, video and omni models are separate business lines with their own
  price, demand and field of specialist rivals (an image model takes share from image studios, not chatbots), unlocked through the Modalities branch. Make them from scratch, by fine-tuning (cheap, capped
  gain), by distilling a smaller student from a stronger teacher (closes 60% of the gap, never passes it), or by
  continued pre-training. Bases are your own models or open-weights templates; switching modality costs Elo.

- **Data Foundry** — make datasets instead of only buying them. A project turns a daily budget into tokens from one
  of five sources (scrape, license, human experts, synthetic, your users' conversations), each trading cost, quality
  and risk. License the result to rivals for daily income (it makes them slightly better) or sell it outright.
  Small sets are worth their size, large ones flatten out, and a sale never pays much more than the set cost to make.
- **Products and organisations** — consumer products get a product team (features built one at a time, a support
  tier, two-week price experiments). Organisations buy seats under a contract with an uptime promise; they can be
  countered at shown odds, renew larger when served well and cancel when starved. Everything is served from the
  same deployments, so success in one place is paid for in another.
- **Research** — 154 technologies in 16 branches with a queue. Mastery is a skill line per modality; the last level
  of most branches is uncapped.

## Emergent layer

Four numbers in `sim/society.ts` are moved only by what the player and the industry do, and each feeds the others:

- **AI slop** rises with tokens served and synthetic data. Crawled dataset editions lose quality; human-made data
  the player owns gains licence value.
- **Public trust** falls with risky datasets, logging users, incidents and safety debt, and rises with Safety
  research. Reputation drifts towards it, and reputation already drives users, hiring and deals.
- **Regulation pressure** grows with market share above a fifth and with low trust. Laws pass at 35, 60 and 85
  (Data Act, compute levy, antitrust decree).
- **Safety debt** is capability beyond safety research. Above 0.5 agents misbehave inside products; far above it a
  one-off breakout can happen.

Rivals respond as well: they close the gap faster on a leader, start a price war when undercut by a player with real
share, and improve when licensed the player's data. None of this is scheduled.

## Long loop (endless)

- The dataset market restocks with a larger edition every quarter, and the last research levels never run out.
- New silicon generations arrive every two years, forever. Rivals ship new models every ~9 months.
  Markets run on hype cycles, supply crunches, heat waves, grid outages and lawsuits.
- Goals are open: valuation milestones, the #1 model, a 1 GW campus, a wafer-scale monster chip.
  You lose by bankruptcy (30 days of negative cash).

## Approachability layer

- Every screen opens with a guide strip: what the screen is for, what on it is the player's, what belongs to someone
  else, and the next sensible move. It can be hidden per screen.
- The training screen is five numbered steps and ends in a forecast in plain words that names the bottleneck.
- Anything timed shows the same progress bar, and HQ lists all of it.

Nothing is removed to make the game easier; complexity is folded away and can be handed off.

- **Six hubs** — HQ, Build (Sites, Fleet, Silicon), Make (Lab, R&D), Sell (Store, Deals, Web), Company (Team, Books),
  World (Ranks, Studio, Newspaper). Each remembers the last sub-tab you used.
- **Simple first** — every screen opens with three or four plain-English numbers and its main actions; expert-only
  panels sit in an "All controls" fold. Expert mode opens every fold by default. Jargon has a hover explanation.
- **HQ next steps** — up to three suggestions worked out from the world (cash runway, racks without power, idle GPUs,
  idle researchers, manager requests), each linking to the screen that fixes it, plus the guided path.
- **Managers** — hire a facilities, sales, people, finance or research manager and switch their seat to Auto. They
  use the same actions you do, worse when less skilled, keep a log, stay out of a system for a week after you touch
  it, and never take an irreversible step without asking: those arrive in the HQ inbox.
- **Confirmations** — severe actions (selling, firing, removing equipment racks depend on, loans, PPAs, IPO,
  acquisitions, tape-outs, aborting runs, reserved rentals) show their consequences and need a 1.2 s hold. Purchases
  over 25% of cash show your cash afterwards. Small edits get a five-second Undo.
- **Sandbox** — start cash or unlimited cash, no bankruptcy, six difficulty multipliers (0.25×–4×) and a developer
  panel (cash, time skip, any event, free servers, tech, reputation). No achievements; rich-list entry is unofficial.

## Presentation layer

- **News** — a headline ticker under the HUD, a filterable drawer, and The Daily Compute: a broadsheet printed every
  game midnight from that day's news (slow-news editions when nothing happened), with markets and parody ads.
  The weekly digest still runs inside it.
- **Simulated web** — an in-game browser with your company site (built from your actual products),
  The Vergence (tech news), HackerNoose (comment threads reacting to you) and a stock ticker.
- **Keynotes** — launching a chip or model can come with a public presentation, rendered live with
  Remotion (title, spec reveal, benchmark bars, CEO quote). Keynotes boost hype, which lifts demand.

## Window

The game is frameless. The title bar is part of the HUD, with in-game minimize, maximize and close controls.

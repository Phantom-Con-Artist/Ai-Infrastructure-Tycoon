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
  and use the chips yourself or sell them to rivals.
- **People** — hire named candidates into teams (Facilities, Chip Design, Research Lab, Cloud, Sales).
  Team skill drives MFU, repair time, research speed, chip design time and sales. Labs are research groups
  with a focus (Scaling, Efficiency, Safety, Hardware).
- **Models** — train with real scaling laws (6·N·D FLOPs, Chinchilla loss), post-train, launch with
  a **keynote**, and fight for market share on the Elo leaderboard.

## Long loop (endless)

- New silicon generations arrive every two years, forever. Rivals ship new models every ~9 months.
  Markets run on hype cycles, supply crunches, heat waves, grid outages and lawsuits.
- Goals are open: valuation milestones, the #1 model, a 1 GW campus, a wafer-scale monster chip.
  You lose by bankruptcy (30 days of negative cash).

## Presentation layer

- **Weekly news** — every game week the Wire compiles a digest: your launches, rival moves, market
  moves and a meme headline.
- **Simulated web** — an in-game browser with your company site (built from your actual products),
  The Vergence (tech news), HackerNoose (comment threads reacting to you) and a stock ticker.
- **Keynotes** — launching a chip or model can come with a public presentation, rendered live with
  Remotion (title, spec reveal, benchmark bars, CEO quote). Keynotes boost hype, which lifts demand.

## Window

The game is frameless. The title bar is part of the HUD, with in-game minimize, maximize and close controls.

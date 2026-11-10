# Sub-project 1 — UX Foundation (design)

Date: 2026-11-10 · Status: approved in chat, pending spec review
Programme: 1 UX foundation → 2 Assets & world → 3 Model Foundry → 4 Data Foundry → 5 Silicon from scratch → 6 Story & media.

## Intent

The game is deep but overwhelming. Make it approachable **without removing any system**: hide complexity behind
simple-first screens and optional delegation, protect the player from irreversible mistakes, make news readable and
fun, and give developers/testers a sandbox. Success = a new player can run a profitable first site from HQ's next
steps alone; an expert still reaches every existing control within one click.

Constraints: sim stays pure/deterministic (seeded RNG, no DOM); UI calls sim through `act()`; no per-rack allocations
in hot loops (perf test must stay green); parody names only; light, minimal, visual UI; `/awwwards` art direction pass
for new UI surfaces.

## 1. Shell, hubs & news

**Navigation.** Rail of 6 hubs: HQ · Build (Sites, Fleet, Silicon) · Make (Lab, R&D; Data added in sub-project 4) ·
Sell (Store, Deals, Web) · Company (Team, Books) · World (Ranks, Studio, Newspaper). Sub-tabs render as pills at the top
of the hub. `Screen` stays as-is; a new `HUBS: Record<Hub, Screen[]>` map drives the rail and pills. The store remembers
the last sub-tab per hub (`lastTab` in settings, not in the world).

**HUD.** Date · Cash · Net/day · Valuation. GPUs and IT load move into a hover popover on Valuation. A bell button
with an unread count sits right of the speed controls.

**Ticker.** A single 28px line under the HUD scrolls the last ~10 headlines (colour by kind). Hover pauses the scroll
(not the game). Clicking a headline opens the newspaper at that story. Honours `reduceMotion` (static, swaps every 6s).

**News drawer.** The bell opens a right-side overlay drawer (does not take layout width). Filter chips: All · Mine ·
Market · Rivals · Incidents. Items with `importance ≥ 2` are pinned on top. Opening marks all as read (`lastReadTick`
in UI state).

**The Daily Compute.** Full-screen broadsheet overlay: masthead, date, "Vol." = game year, lead story (serif display
caps + SVG illustration chosen by category), 2–3 columns of secondary stories, a market box (GPU spot price, rival
valuations, player valuation and day change), one or two parody ads. Previous/next edition paging; Escape closes. A
serif display face (local fontsource, e.g. a high-contrast Didone-like face) is allowed **only inside the paper**.

**Sim.** `NewsItem` gains `category: 'mine'|'market'|'rivals'|'incident'|'world'` and `importance: 0|1|2`.
`pushNews` takes them as optional args with defaults derived from `kind` so existing callers compile unchanged; key
callers are then updated. New `src/sim/newspaper.ts`: `buildEdition(w)` runs at game midnight in `dailyTick`, picks a
lead (highest importance, then newest) and up to 6 secondaries from that day's items, snapshots market numbers, and
pushes to `w.editions` (cap 30). Days with no news produce a slow-news edition built from stats. `WORLD_VERSION` 8 → 9.

## 2. Confirmations

A single store helper `confirm({ tier, title, lines, cost?, verb }) → Promise<boolean>` rendered by one `<Confirm/>`
host component.

| Tier | Triggers | UI |
|---|---|---|
| Severe | sell servers, remove equipment with dependants, fire person, IPO, acquisition, PPA, loan, tape-out, training run > 25% cash | Modal with consequence lines; red **hold-to-confirm** (1.2s, keyboard: hold Enter) |
| Expensive | any other spend > 25% of cash | Quick modal: cost, cash after; Enter confirms. Toggle `confirmExpensive` in settings (default on) |
| Cheap / reversible | small placements, plan edits, toggles | No modal; toast with **Undo** for 5s |

Consequences come from new pure functions in the sim (`src/sim/preview.ts`): `previewSellServers`, `previewRemove`,
`previewFire`, `previewIpo`, `previewAcquire`, `previewPpa`, `previewLoan`, `previewTapeout`, `previewTraining`,
each returning `{ lines: string[]; cost?: number }` with no mutation.

Undo: `act()` accepts `{ undoable: true }`; before the call the store keeps `structuredClone(w)` (only for
cheap-tier actions, which do not consume RNG for consequential outcomes); Undo restores it and bumps `rev`. One undo
level; any later action or tick > 5s clears it. The game is not paused by confirms.

## 3. Managers (autopilots)

Five manager roles hired via Team like other people (portrait, skill 1–10, trait, salary ~1.5× a senior IC):

| Manager | Owns | Decisions |
|---|---|---|
| Facilities | sites/power | dispatch strategy per site, DR opt-in, auto-layout new racks, alerts for PDU overload / cooler starvation |
| Sales | store/rentals/deals | rental & plan pricing in a band around market, accept contracts that fit free capacity |
| People | team | backfill quits, morale budget, counter-offer poaching |
| Finance | books | keep cash reserve, early loan paydown, **suggest** PPAs |
| Research | R&D/labs | pick next tech by a player-set focus branch |

`src/sim/managers.ts`: `runManagers(w)` from `dailyTick` (Facilities also has a cheap hourly check that only reads
aggregates already computed). Managers call the **same action functions** as the player. Decision quality scales with
skill via a seeded noise term. Severe actions are never executed: they become `w.inbox` requests
`{ id, manager, title, lines, action: SerializedAction }` the player approves (through the Severe confirm) or rejects.
Per-system `w.autopilot[system] = { on, policy, handsOffUntil }`; any player action on that system sets
`handsOffUntil = tick + 7 days`. Each manager keeps a 20-entry log. Without a hired manager the system's Auto switch is
disabled with a "Hire a … manager" hint.

## 4. Simple-first screens & HQ advisor

Every screen adopts one pattern: **summary strip** (3–4 visual stats) → **primary actions** (2–3 large buttons) →
**Advanced** collapsible section containing all existing controls. Setting `expertMode` opens Advanced by default.
Shared components in `ui.tsx`: `<Summary>`, `<PrimaryActions>`, `<Advanced>`, `<Term>` (dotted-underline jargon with a
one-line plain-English tooltip; glossary in `src/renderer/src/glossary.ts`).

HQ becomes home:
- **Next steps** — up to 3 items from `src/sim/advisor.ts` `nextSteps(w)`: ordered rules (runway < 14 days, rack
  without PDU/cooler, idle GPUs, no product, overloaded PDU, research idle, manager inbox waiting, …), each with a
  deep link `{ screen, focus? }`.
- **Inbox** — manager requests.
- **Goals** — a short milestone chain (first site, first rack, first rental, first profitable week, first model…);
  completion news + small reputation bump; never blocks anything.

## 5. Sandbox / Developer mode

New-company screen gets a **Career / Sandbox** switch. Sandbox exposes `w.rules`:
- `startCash` (preset or custom), `infiniteCash` (affordability always passes, cash never below 0 for game-over),
  `noBankruptcy`,
- difficulty multipliers: hardware prices, power prices, demand, failure rate, rival aggression, research speed
  (0.25×–4×),
- `devTools` on.

Career uses defaults (`rules` all 1×, flags off). All 27 inline `w.cash < x` affordability checks in the sim move to a
`canAfford(w, usd)` helper in `util.ts`, which honours `infiniteCash`. Multipliers are applied at the existing price /
rate source points (not scattered).

Dev panel (only when `devTools`; opened with the `` ` `` key): add cash, unlock all / specific tech, skip N days,
trigger any event by id (needed later for secret events), spawn GPUs/servers in a hall, set reputation, toggle
"fast research". Sandbox saves are tagged with a badge in the load list; achievements and leaderboard entries are
disabled in Sandbox.

## Error handling

Actions keep the existing `Result` contract; the confirm host shows the error toast if the confirmed action fails.
Manager actions that fail are logged in the manager's log, never thrown. Old saves (version 8) are rejected with the
existing toast.

## Testing

- Vitest: each `preview*` returns lines without mutating the world (deep-equal before/after); `buildEdition`
  determinism and caps; `nextSteps` rule ordering on crafted worlds; managers over 60 seeded days improve or keep profit
  vs no manager on a fixture world and never execute a severe action; `canAfford` with `infiniteCash`; difficulty
  multipliers change the targeted outputs only; undo snapshot restore.
- Perf test stays green with all managers on.
- Live: `npm run web` + Playwright — walk every hub/sub-tab, trigger each confirm tier, open the paper from the ticker
  and page editions, run managers 30 days, start a Sandbox game with infinite cash and use the dev panel; screenshots
  saved under `docs/screenshots/`.

## Out of scope (later sub-projects)

New logos/brand marks for companies, GPUs, CPUs and cloud (sub-project 2), Data hub content (4), secret events
content (6). This sub-project only adds the dev-panel hook that can trigger them.

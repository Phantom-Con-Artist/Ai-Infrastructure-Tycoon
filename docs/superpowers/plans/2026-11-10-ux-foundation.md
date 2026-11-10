# UX Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game approachable without removing systems: 6-hub navigation, ticker + news drawer + *The Daily Compute* newspaper, 3-tier confirmations with undo, hireable manager autopilots, simple-first screens with an HQ advisor, and a Sandbox/Developer mode.

**Architecture:** All rules go in new pure sim modules (`rules`, `preview`, `newspaper`, `advisor`, `managers`, `dev`) exercised by vitest; the World shape changes once (Task 1, `WORLD_VERSION` 8 → 9). The renderer gains a hub map, a confirm host and overlay components that call the sim through `act()`; existing screen components are regrouped, never deleted.

**Tech Stack:** TypeScript, React 19, Zustand, Vitest, Electron/electron-vite, Playwright MCP for live testing.

**Spec:** `docs/superpowers/specs/2026-11-10-ux-foundation-design.md`

## Global Constraints

- Sim (`src/sim/**`) is pure and deterministic: seeded RNG from `rng.ts` only, never `Math.random`, no DOM.
- UI mutates the world only through `useGame().act()` (or helpers built on it).
- No per-rack allocations in hourly code; `src/sim/perf.test.ts` must stay green.
- Parody names only; no real trademarks in any new copy.
- `WORLD_VERSION` becomes **9** in Task 1 and does not change again in this plan.
- Every UI task (8–14) starts by invoking the `/awwwards` skill; keep the existing light tokens in `styles.css`, never pure black/white, animate only `transform`/`opacity`, honour `settings.reduceMotion`.
- Serif display font is used **only** inside the newspaper.
- Expensive threshold = spend > **25%** of cash. Hold-to-confirm = **1.2 s**. Undo window = **5 s**. Manager hands-off = **7 game days** (168 ticks). Editions cap **30**. Manager log cap **20**. Difficulty multipliers clamp to **0.25–4**.
- Run `npm test` and `npm run typecheck` before every commit. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Live testing: `npm run web` (http://localhost:5199), console handles `window.__game`, `window.__sim`.

## Review Focus

1. Undo after the game has ticked: restoring a snapshot taken before ticks elapsed would rewind time — undo must be cleared as soon as any tick runs or 5 s pass (test in Task 8).
2. Manager acting while the player just acted: the player's change must survive (hands-off) and a manager must never run a severe action (tests in Task 6).
3. Infinite cash in Sandbox with negative-cash paths (loan interest, payroll): game must never go bankrupt and `canAfford` must be true for any amount (test in Task 2).
4. Confirm modal open while the world changes underneath (e.g. the server being sold breaks): the confirmed action re-validates and shows the sim's error toast instead of crashing (test in Task 8 via `confirmAct` with a failing action).
5. Empty days / brand-new world for the newspaper and advisor: edition still renders (slow-news) and `nextSteps` on an empty world returns the "buy land" step (tests in Tasks 4, 5).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/sim/types.ts` (modify) | `NewsItem` category/importance; `World.rules`, `editions`, `inbox`, `autopilot`, `managerLog`, `goalsDone`, `managerFocus` |
| `src/sim/rules.ts` (create) | `Rules`, `DEFAULT_RULES`, `mult(w, key)`, `canAfford(w, usd)` |
| `src/sim/util.ts` (modify) | `pushNews` extra optional params |
| `src/sim/preview.ts` (create) | Pure consequence previews for severe actions |
| `src/sim/newspaper.ts` (create) | `Edition`, `buildEdition(w)` |
| `src/sim/advisor.ts` (create) | `nextSteps(w)`, `GOALS`, `checkGoals(w)` |
| `src/sim/managers.ts` (create) | Manager systems, `runManagers`, inbox approve/reject, `touchSystem` |
| `src/sim/dev.ts` (create) | Dev-panel actions |
| `src/sim/events.ts` (modify) | `EVENTS` registry + `triggerEvent` |
| `src/renderer/src/nav.ts` (create) | `Hub`, `HUBS`, `hubOf(screen)` |
| `src/renderer/src/store.ts` (modify) | hub nav, `confirm`, `confirmAct`, undo, overlay state |
| `src/renderer/src/overlays/Confirm.tsx` (create) | Confirm host + hold button |
| `src/renderer/src/overlays/Ticker.tsx`, `NewsDrawer.tsx`, `Newspaper.tsx`, `DevPanel.tsx` (create) | Overlays |
| `src/renderer/src/glossary.ts` (create) | Jargon → one-liners |
| `src/renderer/src/ui.tsx` (modify) | `Summary`, `PrimaryActions`, `Advanced`, `Term`, `ManagerCard` |
| `src/renderer/src/App.tsx` (modify) | 6-hub rail, pills, HUD, overlays mount |
| `src/renderer/src/screens/*.tsx` (modify) | Simple-first regrouping; confirm call sites |
| `src/renderer/src/Menu.tsx`, `saves.ts` (modify) | Career/Sandbox setup, save badge |

---

### Task 1: World shape v9 + rules + canAfford

**Files:**
- Create: `src/sim/rules.ts`, `src/sim/rules.test.ts`
- Modify: `src/sim/types.ts`, `src/sim/world.ts` (createWorld, `WORLD_VERSION`), `src/sim/util.ts` (`pushNews`), every file with an inline `w.cash < x` / `x > w.cash` affordability check (27 sites: find with `grep -rnE "w\.cash ?<|> ?w\.cash" src/sim`)

**Interfaces:**
- Produces:
  - `type RuleKey = 'hardwarePrice'|'powerPrice'|'demand'|'failureRate'|'rivalAggression'|'researchSpeed'`
  - `interface Rules { mode: 'career'|'sandbox'; startCash: number; infiniteCash: boolean; noBankruptcy: boolean; devTools: boolean; mult: Record<RuleKey, number> }`
  - `DEFAULT_RULES: Rules` (career, 40_000_000, false, false, false, all 1)
  - `mult(w: World, k: RuleKey): number` (clamped 0.25–4)
  - `canAfford(w: World, usd: number): boolean` (`infiniteCash || w.cash >= usd`)
  - `createWorld(seed?, company?, ceo?, advisor?, logo?, rules?: Partial<Rules>)` — `cash = rules.startCash`
  - `NewsItem = { tick; kind; title; body; category: NewsCategory; importance: 0|1|2 }`, `type NewsCategory = 'mine'|'market'|'rivals'|'incident'|'world'`
  - `pushNews(w, kind, title, body, category?: NewsCategory, importance?: 0|1|2)`; defaults: `bad → 'incident', 1`; `event → 'world', 1`; `good|info → 'mine', 0`
  - World fields (initialised in createWorld): `rules: Rules; editions: Edition[]; inbox: InboxItem[]; autopilot: Record<System, Autopilot>; managerLog: Record<System, string[]>; goalsDone: string[]; managerFocus?: Branch`. Types `Edition` (Task 4), `InboxItem`/`System`/`Autopilot` (Task 6) are declared now in `types.ts` so the shape lands once:
    - `type System = 'facilities'|'sales'|'people'|'finance'|'research'`
    - `interface Autopilot { on: boolean; policy: Record<string, number>; handsOffUntil: number }`
    - `interface InboxItem { id: string; system: System; tick: number; title: string; lines: string[]; action: { fn: string; args: unknown[] } }`
    - `interface Edition { day: number; lead: NewsItem; stories: NewsItem[]; market: { gpuSpot: number; playerVal: number; playerValChange: number; rivals: { name: string; val: number }[] }; slowNews: boolean }`
  - `WORLD_VERSION = 9`

- [ ] **Step 1: Write failing tests** in `src/sim/rules.test.ts`:
  - `createWorld(1)` → `w.version === 9`, `w.rules` deep-equals `DEFAULT_RULES`, `w.cash === 40_000_000`, `w.editions`/`w.inbox`/`w.goalsDone` are `[]`, `Object.keys(w.autopilot)` = 5 systems all `on: false`.
  - `createWorld(1, 'X', 'Y', 'cfo', undefined, { mode: 'sandbox', startCash: 5e9 })` → cash `5e9`, `rules.mode === 'sandbox'`, other fields default.
  - `canAfford`: career world with cash 100 → `canAfford(w, 101) === false`; with `infiniteCash` → `canAfford(w, 1e18) === true`.
  - `mult` clamps: set `w.rules.mult.demand = 10` → `mult(w,'demand') === 4`; `0.01` → `0.25`.
  - `pushNews(w,'bad','t','b')` → `w.news[0].category === 'incident' && importance === 1`.
- [ ] **Step 2:** `npx vitest run src/sim/rules.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `rules.ts`, update `types.ts`, `createWorld`, `pushNews`, bump `WORLD_VERSION`. Replace all 27 affordability checks with `!canAfford(w, x)` (keep each original error string).
- [ ] **Step 4:** `npm test && npm run typecheck` → all pass (existing 25 + new).
- [ ] **Step 5:** Commit `feat(sim): world v9 with rules, canAfford, news categories`.

### Task 2: Difficulty multipliers, infinite cash, no bankruptcy

**Files:**
- Modify: `src/sim/data/hardware.ts` consumers — apply at `serverPriceUsd` call sites in `actions.ts` `orderServers` (not the catalog, so the catalog stays memoised); `src/sim/facility.ts` energy price computation; `src/sim/market.ts` / `world.ts` demand (`market.tokensPerDay` usage in inference/rental demand); `world.ts` `failures()`; rival release cadence in `market.ts`/`corporate.ts`; research progress in `world.ts` `dailyTick`; bankruptcy check at `world.ts:303`.
- Test: `src/sim/rules.test.ts`

**Interfaces:**
- Consumes: `mult`, `canAfford`, `Rules` (Task 1)

- [ ] **Step 1: Failing tests** (each compares two worlds same seed, one with a multiplier):
  - `hardwarePrice: 2` → cost of `orderServers(w, site, gpu, 1)` (cash delta) is 2× the baseline's.
  - `powerPrice: 2` → after 48 steps with a running hall, `ledger` powerCost sum ≈ 2× baseline (±5%).
  - `researchSpeed: 2` → research `progressUsd` after 5 days with the same budget ≈ 2× baseline.
  - `failureRate: 0.25` vs `4` → after 2000 steps with 64 servers, failed-server count of 4× world > 0.25× world.
  - `noBankruptcy`: cash set to −1e9, step 40 days → `gameOver === false`. Career control → `gameOver === true`.
  - `infiniteCash`: set cash 0, `orderServers` for 10_000 servers → `ok === true`, step 40 days → `gameOver === false`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Multiply at the named source points via `mult(w, key)`; bankruptcy check skipped when `noBankruptcy || infiniteCash`. `demand` multiplies the demand fed to rental utilisation and inference share; `rivalAggression` divides the interval between rival releases.
- [ ] **Step 4:** `npm test && npm run typecheck` → pass; perf test still green.
- [ ] **Step 5:** Commit `feat(sim): sandbox difficulty multipliers and money rules`.

### Task 3: Consequence previews

**Files:**
- Create: `src/sim/preview.ts`, `src/sim/preview.test.ts`

**Interfaces:**
- Produces: `interface Preview { lines: string[]; cost?: number; tier: 'severe'|'expensive'|'cheap' }` and
  `previewSellServers(w, siteId, gpuId, count)`, `previewRemove(w, hallId, x, y)`, `previewFire(w, personId)`, `previewIpo(w)`, `previewAcquire(w, rivalId)`, `previewPpa(w, siteId, mw)`, `previewLoan(w, amount)`, `previewTapeout(w, spec: ChipSpec)`, `previewTraining(w, costUsd: number)`, `previewSpend(w, usd): Preview` (expensive if `usd > 0.25 * w.cash` and not infiniteCash, else cheap). All return `Preview`.
- Content rules: sell → refund USD + share of cost, rentals lost and their USD/day; remove → equipment kind and number of racks that lose PDU/cooler coverage; fire → name, role, effective headcount lost, morale hit to team; IPO → cash raised, founder stake after, "one-time"; acquire → price, cash after; PPA → MW × 10 years, price $/MWh, total commitment; loan → principal, rate, daily interest; tapeout → NRE, months to ready; training → cost, % of cash. `previewTraining` tier is severe when cost > 25% cash, else cheap.

- [ ] **Step 1: Failing tests:** for each function on a booted world (reuse `boot()` pattern from `sim.test.ts`): `JSON.stringify(w)` before === after; `lines.length >= 1`; `previewSellServers` with an active rental includes a line matching `/rental/i`; `previewRemove` of the only PDU in a hall with racks includes `/rack/i` and tier `severe`; `previewSpend(w, w.cash * 0.3).tier === 'expensive'`, `0.1 → 'cheap'`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement using existing read helpers (`sellServers` refund maths copied into a pure calc shared by both: extract `sellRefund(w, gpuId, count): number` in `actions.ts`, used by `sellServers` and the preview; `relayout` result simulated by reading `pduIdx/coolerIdx` of racks).
- [ ] **Step 4:** `npm test && npm run typecheck` → pass.
- [ ] **Step 5:** Commit `feat(sim): consequence previews for irreversible actions`.

### Task 4: The Daily Compute editions

**Files:**
- Create: `src/sim/newspaper.ts`, `src/sim/newspaper.test.ts`
- Modify: `src/sim/world.ts` `dailyTick` (call `buildEdition` last), `src/sim/events.ts`, `corporate.ts`, `market.ts` key `pushNews` calls to pass category/importance (rival releases → `'rivals',1`; acquisitions/IPO → `'mine',2`; disasters → `'incident',2`; hype/price → `'market',1`).

**Interfaces:**
- Produces: `buildEdition(w: World): Edition` (pushes to front of `w.editions`, caps 30, returns it).
- Lead = highest importance among items with `tick` in the previous 24 h, ties → newest. Stories = next up to 6 by same order. No items → `slowNews: true` with a synthesised lead `NewsItem` (category `'mine'`, title from the day's revenue/GPU count). Market snapshot: `gpuSpot` = current on-demand price of the newest catalog GPU from `market.ts`; `playerVal = valuation(w)`; `playerValChange` vs previous edition (0 if none); `rivals` top 5 by valuation.

- [ ] **Step 1: Failing tests:** fresh world, `stepMany(w, 24)` → `w.editions.length === 1` and `editions[0].slowNews === true`; world with 3 news items of importance 0,2,1 in the day → lead is the importance-2 item and `stories.length === 2`; run 40 days → `editions.length === 30`; two worlds same seed → identical editions (deep-equal).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; hook into `dailyTick`.
- [ ] **Step 4:** `npm test && npm run typecheck` → pass.
- [ ] **Step 5:** Commit `feat(sim): daily newspaper editions`.

### Task 5: Advisor next steps and goals

**Files:**
- Create: `src/sim/advisor.ts`, `src/sim/advisor.test.ts`
- Modify: `src/sim/world.ts` `dailyTick` (call `checkGoals`)

**Interfaces:**
- Produces:
  - `interface Step { id: string; title: string; body: string; screen: string; focus?: string; severity: 0|1|2 }`
  - `nextSteps(w: World): Step[]` — max 3, ordered by severity then rule order. Rules in order: `runway` (cash / avg daily burn of last 14 days < 14 days → sev 2, screen `finance`), `inbox` (inbox non-empty → sev 2, `overview`), `no-site` (no sites → sev 1, `sites`), `no-hall`, `uncovered-rack` (any rack with `pduIdx` or `coolerIdx` < 0 → sev 2, `sites`, focus hallId), `pdu-overload` (sev 2), `no-servers` (halls ready but 0 installed → sev 1, `fleet`), `idle-gpus` (>25% healthy GPUs not busy → sev 1, `fleet`), `no-product` (a launched model but no product → sev 0, `store`), `research-idle` (no current research → sev 0, `research`).
  - `GOALS: { id: string; title: string; check: (w: World) => boolean }[]` — `first-site`, `first-hall`, `first-servers`, `first-rental`, `profit-week` (7 consecutive positive ledger days), `first-model`, `first-product`, `first-manager`.
  - `checkGoals(w)`: newly met goals → push id to `w.goalsDone`, `pushNews(w,'good','Goal reached: …', …,'mine',1)`, `reputation += 1`.

- [ ] **Step 1: Failing tests:** `nextSteps(createWorld(1))[0].id === 'no-site'`; world with cash 1 and burn → first id `runway`; booted world with a rack whose `pduIdx = -1` → includes `uncovered-rack` with `focus === hall.id`; result length never > 3; `checkGoals` after `buildSite` adds `first-site` once (second call adds nothing).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; reads aggregates only (no per-rack allocation beyond a single loop in `uncovered-rack`).
- [ ] **Step 4:** `npm test && npm run typecheck` → pass.
- [ ] **Step 5:** Commit `feat(sim): advisor next steps and milestone goals`.

### Task 6: Managers

**Files:**
- Create: `src/sim/managers.ts`, `src/sim/managers.test.ts`
- Modify: `src/sim/people.ts` (`Role` adds `'mgr-facilities'|'mgr-sales'|'mgr-people'|'mgr-finance'|'mgr-research'`, `ROLES` entries base ≈ 1.5× the matching IC, `recomputeStaff` ignores managers, candidate pool includes them ~15%), `src/sim/world.ts` (`dailyTick` → `runManagers`; hourly → `facilitiesHourly`), `src/sim/types.ts` already has types from Task 1.

**Interfaces:**
- Consumes: `System`, `Autopilot`, `InboxItem` (Task 1); preview functions (Task 3); existing actions `setPowerStrategy`, `setDemandResponse`, `autoLayout`, `setRental`, `acceptContract`, `updatePlan`, `hirePerson`, `giveRaise`, `repay`, `startResearch`, `signPpa`, `firePerson`.
- Produces:
  - `managerOf(w, sys: System): Person | undefined`
  - `setAutopilot(w, sys, on: boolean, policy?: Record<string, number>): Result` — error `'Hire a … manager first'` when none.
  - `touchSystem(w, sys)` — sets `handsOffUntil = w.tick + 168`. The renderer calls it from `act()` via an optional `system` arg (Task 8).
  - `runManagers(w)`, `facilitiesHourly(w)` (reads `site.flow` aggregates already computed; no allocations)
  - `approveInbox(w, id): Result`, `rejectInbox(w, id): Result` — approve dispatches `action.fn` from a whitelist map `{ signPpa, firePerson, borrow, acquire }` with `action.args`.
  - Policies (defaults): facilities `{ green: 0 }` (1 → prefer `'green'` strategy), sales `{ margin: 1.0 }`, people `{ moraleFloor: 0.6 }`, finance `{ reserveDays: 30 }`, research focus via `w.managerFocus`.
  - Decision quality: `q = skill/10`; numeric targets get `× (1 + (1-q) * range(w,-0.3,0.3))`.
  - Each decision appends `"<date> <text>"` to `w.managerLog[sys]` (cap 20); failed actions log `"failed: <error>"`.
  - Severe decisions (PPA, fire, loan, acquisition) → `w.inbox.push` (no execution).

- [ ] **Step 1: Failing tests:**
  - `setAutopilot(w,'sales',true)` with no manager → `ok === false`.
  - Hire a sales manager (inject a candidate with role `mgr-sales`, skill 8), enable autopilot, run 60 days on a booted world with idle rented servers → total rental revenue ≥ the same seed with no manager.
  - Player action then manager: call `touchSystem(w,'facilities')`, set strategy `'cost'`, enable facilities with `green: 1`, step 3 days → strategy still `'cost'`; step 8 more days → `'green'`.
  - Finance manager with `reserveDays` and a positive PPA opportunity → after 30 days `w.inbox` has an item with `action.fn === 'signPpa'` and the site has no PPA (never executed).
  - `approveInbox` on that item → PPA exists, inbox empty; unknown `fn` → `ok === false`.
  - Managers disabled → `runManagers` leaves `JSON.stringify(w)` unchanged.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test && npm run typecheck` → pass; add to `perf.test.ts` a variant with all 5 autopilots on (managers injected) under the existing time budget.
- [ ] **Step 5:** Commit `feat(sim): hireable managers with autopilot and inbox`.

### Task 7: Dev actions and event registry

**Files:**
- Create: `src/sim/dev.ts`, `src/sim/dev.test.ts`
- Modify: `src/sim/events.ts` (extract each event body into `EVENTS`, `rollDailyEvents` calls the registry with the same RNG order so existing behaviour is identical)

**Interfaces:**
- Produces:
  - `EVENTS: Record<string, { name: string; site: boolean; fire: (w: World, siteId?: string) => void }>` with ids `outage`, `heatwave`, `priceSpike`, `disaster`, `hype`, plus the remaining existing ones in `events.ts`.
  - `triggerEvent(w, id: string, siteId?: string): Result`
  - All dev functions return `Result` and error `'Dev tools are off'` unless `w.rules.devTools`: `devAddCash(w, usd)`, `devUnlockTech(w, id | 'all')`, `devSkipDays(w, days)` (calls `step` 24×days), `devSpawnServers(w, siteId, gpuId, count)` (adds to `site.stock` free), `devSetReputation(w, n)` (0–100), `devFastResearch(w, on: boolean)` (sets `rules.mult.researchSpeed` to 4 or 1).

- [ ] **Step 1: Failing tests:** career world → `devAddCash` `ok === false`; sandbox world with `devTools` → cash +1e9; `devUnlockTech(w,'all')` → `w.research.done.length === TECHS.length`; `triggerEvent(w,'heatwave', site.id)` → `w.events` has a `heatwave` for that site; determinism: two worlds same seed stepped 200 days → identical `w.events`/`w.news` to a stored hash computed **before** the refactor (record it in Step 0 by running the current code).
- [ ] **Step 0:** Before editing `events.ts`, run a scratch script that steps `createWorld(42)` with a booted site 200 days and prints `JSON.stringify(w.news).length` + a simple hash; paste the value into the test.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test && npm run typecheck` → pass (hash unchanged).
- [ ] **Step 5:** Commit `feat(sim): event registry and dev-mode actions`.

### Task 8: Store — hubs, confirm, undo, overlay state

**Files:**
- Create: `src/renderer/src/nav.ts`, `src/renderer/src/store.test.ts`
- Modify: `src/renderer/src/store.ts`, `src/renderer/src/saves.ts` (Settings)

**Interfaces:**
- Consumes: `Preview` (Task 3), `touchSystem` + `System` (Task 6)
- Produces:
  - `nav.ts`: `type Hub = 'hq'|'build'|'make'|'sell'|'company'|'world'`; `HUBS: Record<Hub, { label: string; screens: Screen[] }>` = hq:[overview], build:[sites,fleet,silicon], make:[lab,research], sell:[store,contracts,web], company:[team,finance], world:[rankings,studio,paper]; `hubOf(s: Screen): Hub`. `Screen` gains `'paper'` (newspaper archive page).
  - Settings add: `confirmExpensive: boolean` (true), `expertMode: boolean` (false), `lastTab: Partial<Record<Hub, Screen>>` ({}).
  - Store state add: `overlay: null | 'news' | 'paper' | 'dev'`, `paperDay: number | null`, `lastReadTick: number`, `pending: null | { preview: Preview; title: string; verb: string; resolve: (ok: boolean) => void }`, `undo: null | { snap: World; tick: number; at: number; label: string }`.
  - Actions: `goHub(h: Hub)` (goes to `settings.lastTab[h] ?? HUBS[h].screens[0]`), `go(s)` also writes `lastTab[hubOf(s)]`; `openOverlay(o, day?)`; `confirm(title, preview, verb): Promise<boolean>` (resolves `true` immediately for `cheap`, and for `expensive` when `!settings.confirmExpensive`); `confirmAct<T>(title, preview, verb, fn, opts?): Promise<Result<T> | null>` (confirm then `act`; null if cancelled); `act(fn, okMsg?, opts?: { undoable?: boolean; system?: System })` — `undoable` stores `structuredClone(w)` snapshot, flash shows Undo; `system` calls `touchSystem`; `doUndo()` restores when `w.tick === undo.tick && Date.now() - undo.at < 5000`, else clears.
  - `tickFrame` clears `undo` when any step ran.

- [ ] **Step 1: Failing tests** (`store.test.ts`, vitest with jsdom not needed — store is plain zustand; stub `localStorage` with a Map in the test): `hubOf('fleet') === 'build'`; `go('silicon')` then `goHub('build')` → `screen === 'silicon'`; `act(fn,{undoable})` then `doUndo()` restores cash; `act(...undoable)`, then `tickFrame` with speed>0 and dt 1 → `undo === null`; `confirm(..., cheap preview)` resolves true without setting `pending`; `confirmAct` with an action returning `{ok:false}` resolves that error result and `toast.kind === 'err'`.
- [ ] **Step 2:** `npx vitest run src/renderer/src/store.test.ts` → FAIL.
- [ ] **Step 3:** Implement. Guard `import.meta.env.DEV` / `performance` usage so the test runs under node.
- [ ] **Step 4:** `npm test && npm run typecheck` → pass.
- [ ] **Step 5:** Commit `feat(ui): hub navigation state, confirm/undo plumbing`.

### Task 9: Shell — rail, pills, HUD, ticker, drawer, confirm host

**Files:**
- Create: `src/renderer/src/overlays/Confirm.tsx`, `overlays/Ticker.tsx`, `overlays/NewsDrawer.tsx`
- Modify: `src/renderer/src/App.tsx` (remove `<aside className="feed">`; rail from `HUBS`; pills row; HUD popover; bell; mount overlays), `src/renderer/src/styles.css` (grid: drop feed column)

**Interfaces:**
- Consumes: Task 8 store API; `NewsItem.category/importance`.
- Produces: `<Confirm/>` (renders `pending`; severe → hold button 1.2 s with progress fill, Enter-hold works; expensive → Enter confirms; Escape cancels), `<HoldButton onDone label />` exported from `Confirm.tsx` for reuse in the inbox; `<Ticker/>` (last 10 headlines, click → `openOverlay('paper', dayOf(tick))`), `<NewsDrawer/>` (chips All/Mine/Market/Rivals/Incidents, pinned importance 2, sets `lastReadTick` on open). Toast gains an Undo button when `undo` is set.

- [ ] **Step 1:** Invoke `/awwwards`; write the art-direction note (3 lines) as a comment at top of `Ticker.tsx`.
- [ ] **Step 2:** Implement components and App changes.
- [ ] **Step 3:** `npm run typecheck && npm test` → pass.
- [ ] **Step 4:** Live: `npm run web`, Playwright → start a game, click each of 6 rail hubs and each pill (13 screens + paper render without console errors), open bell drawer, filter "Incidents", click a ticker headline (paper overlay opens — placeholder until Task 10), trigger an expensive confirm via `__game.getState().confirm('Test', {tier:'expensive',lines:['x'],cost:1}, 'Buy')` and confirm with Enter, a severe one and hold. Screenshot each to `docs/screenshots/ux-*.png`.
- [ ] **Step 5:** Commit `feat(ui): six-hub shell, ticker, news drawer, confirm host`.

### Task 10: The Daily Compute newspaper

**Files:**
- Create: `src/renderer/src/overlays/Newspaper.tsx`, `src/renderer/src/art/PaperArt.tsx` (SVG illustration per `NewsCategory`, 5 pieces, line-art style matching `art/Illustrations.tsx`)
- Modify: `package.json` (add a local fontsource serif display face, e.g. `@fontsource/playfair-display`), `App.tsx` (mount; `paper` screen renders the archive list)

**Interfaces:**
- Consumes: `Edition` (Task 1/4), `overlay === 'paper'`, `paperDay`.
- Produces: `<Newspaper/>` — masthead "The Daily Compute", date, `Vol. ${roman(year)}`, lead headline in serif caps + `PaperArt`, columns of `stories`, market box from `edition.market`, 1–2 parody ads (copy array in the file, parody names only), prev/next buttons across `w.editions`, Escape closes; shows the latest edition when `paperDay` has none. Paper archive screen (`paper`) lists editions as cards.

- [ ] **Step 1:** Invoke `/awwwards`; decide grid, rules, column widths; note in a file comment.
- [ ] **Step 2:** `npm i @fontsource/playfair-display` (or chosen face) and implement.
- [ ] **Step 3:** `npm run typecheck && npm test` → pass.
- [ ] **Step 4:** Live: skip 10 days in a sandbox world (`__sim.W.stepMany(__game.getState().w, 240)` then `setState({rev})`), open paper from ticker, page back/forward, check slow-news edition on a fresh world, check 1280px and 900px widths. Screenshots `docs/screenshots/ux-paper*.png`.
- [ ] **Step 5:** Commit `feat(ui): The Daily Compute newspaper`.

### Task 11: Confirmation call sites

**Files:**
- Modify: `src/renderer/src/screens/Fleet.tsx` (sell servers), `Sites.tsx` + `three/HallEditor.tsx` (remove equipment; PPA; utility/generator purchases), `Team.tsx` (fire), `Business.tsx` (loans, research start if expensive), `Rankings.tsx` or wherever `acquire`/`ipo` buttons live, `Silicon.tsx` (start design = tape-out; fab, litho purchases), `Lab.tsx` (training runs, dataset buys), `Store.tsx` (remove plan → cheap+undo), `Web.tsx` (domain buys → previewSpend).

**Interfaces:**
- Consumes: `confirmAct` (Task 8), all `preview*` (Task 3).
- Rule: every call site that spends money wraps the action in `confirmAct(title, previewX(...) or previewSpend(w, cost), verb, fn)`; small reversible edits (placement, plan edits, toggles, price changes) use `act(fn, msg, { undoable: true })`; actions on a managed system pass `system`.

- [ ] **Step 1:** List all call sites: `grep -rn "act(" src/renderer/src/screens src/renderer/src/three | grep -v "//"`; write the list into the commit message body.
- [ ] **Step 2:** Convert each.
- [ ] **Step 3:** `npm run typecheck && npm test` → pass.
- [ ] **Step 4:** Live: sell servers (severe, hold), remove the only PDU in a hall (severe lists racks), fire a person, take a loan, buy a dataset over 25% cash (expensive), place a rack then Undo within 5 s, place a rack and let 5 s pass (no Undo).
- [ ] **Step 5:** Commit `feat(ui): confirmations and undo on all irreversible actions`.

### Task 12: Simple-first screens + glossary

**Files:**
- Create: `src/renderer/src/glossary.ts`
- Modify: `src/renderer/src/ui.tsx` (add components), each screen in `src/renderer/src/screens/` (Sites, Fleet, Silicon, Lab, Store, Business×3, Team, Rankings, Studio, Web)

**Interfaces:**
- Produces in `ui.tsx`: `<Summary items={{ label: string; value: ReactNode; tone?: 'pos'|'neg'|'warn' }[]} />`, `<PrimaryActions>{buttons}</PrimaryActions>`, `<Advanced title="All controls">{…}</Advanced>` (open = `settings.expertMode`, state remembered per screen in component state), `<Term k="mfu">MFU</Term>` reading `GLOSSARY: Record<string, string>` (≥ 20 entries: MFU, PUE, DR, PPA, CDU, CRAH, PDU, UPS, HBM, NRE, tape-out, litho, goodput, MoE, GQA, MLA, tokens/s, spot, reserved, churn, ARPU, Elo).
- Rule per screen: 3–4 summary stats + ≤3 primary actions on top; everything currently rendered moves unchanged inside `<Advanced>` (or stays visible if it *is* the primary action, e.g. the 3D hall editor). Wrap first occurrence of each glossary term per screen in `<Term>`.

- [ ] **Step 1:** Invoke `/awwwards`; define the summary-strip and primary-action visual (one comment in `ui.tsx`).
- [ ] **Step 2:** Implement components, then convert screens one by one (one commit per 3–4 screens is fine).
- [ ] **Step 3:** `npm run typecheck && npm test` → pass.
- [ ] **Step 4:** Live: every screen shows summary + actions with Advanced collapsed; toggling `expertMode` in settings opens all Advanced sections; hovering a `Term` shows its tooltip. Screenshots before/after for Sites, Lab, Store.
- [ ] **Step 5:** Commit `feat(ui): simple-first screens and jargon glossary`.

### Task 13: HQ advisor, inbox, goals, manager cards

**Files:**
- Modify: `src/renderer/src/screens/Overview.tsx`, `src/renderer/src/screens/Team.tsx`, `src/renderer/src/ui.tsx` (`ManagerCard`), hub screens that own a system (Sites → facilities, Store → sales, Team → people, Business/Finance → finance, Business/Research → research)

**Interfaces:**
- Consumes: `nextSteps`, `GOALS`, `w.goalsDone` (Task 5); `managerOf`, `setAutopilot`, `approveInbox`, `rejectInbox`, `w.managerLog`, `w.inbox` (Task 6); `HoldButton` (Task 9).
- Produces: `<ManagerCard system={System} />` — portrait (`art/People`), name, skill, Auto switch (disabled with "Hire a … manager" link to Team when none), 1–2 policy knobs, last 3 log lines with "show all". HQ: Next steps (click → `go(step.screen)` and pass `focus` to `selectSite`/hall when relevant), Inbox list (approve via `confirmAct` with the item's `lines` as a severe preview; reject plain), Goals progress row. Team: manager candidates labelled by system.

- [ ] **Step 1:** Invoke `/awwwards`; HQ layout note.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** `npm run typecheck && npm test` → pass.
- [ ] **Step 4:** Live: fresh game → HQ first step "buy land" deep-links to Sites; build a hall → step changes; hire a manager from candidates (use `devSpawn`/inject via `__sim` if pool lacks one), enable Auto, skip 30 days, read log; approve an inbox PPA with hold.
- [ ] **Step 5:** Commit `feat(ui): HQ advisor, inbox, goals and manager cards`.

### Task 14: Sandbox setup, dev panel, save badge

**Files:**
- Create: `src/renderer/src/overlays/DevPanel.tsx`
- Modify: `src/renderer/src/Menu.tsx` (Career/Sandbox switch; sandbox fields: start cash presets 40M / 1B / 1T / custom, infinite cash, no bankruptcy, six multiplier sliders 0.25–4, dev tools toggle), `store.ts` `newGame` accepts `rules?: Partial<Rules>`, `saves.ts` meta gains `sandbox?: boolean` (Menu load list shows a "Sandbox" badge), `App.tsx` (`` ` `` key toggles `overlay 'dev'` when `w.rules.devTools`), `src/sim/corporate.ts` (`checkAchievements` returns `[]` in sandbox), `Rankings.tsx` (player row hidden from rich list / marked "sandbox" when sandbox).

**Interfaces:**
- Consumes: `Rules`, `DEFAULT_RULES` (Task 1); dev actions + `EVENTS`/`triggerEvent` (Task 7).
- Produces: `<DevPanel/>` — add cash (+1M/+1B/custom), unlock tech (select or all), skip days (1/7/30/365), trigger event (select from `EVENTS`, site select when `site`), spawn servers (site, gpu, count), reputation slider, fast research toggle. All through `act()`.

- [ ] **Step 1: Failing test** in `src/sim/rules.test.ts`: sandbox world after `devUnlockTech('all')` and 30 days → `checkAchievements(w)` returns `[]` and `w.achievements` is empty.
- [ ] **Step 2:** Run → FAIL. Implement the achievements guard → PASS.
- [ ] **Step 3:** Invoke `/awwwards`; implement Menu sandbox UI, DevPanel, badge.
- [ ] **Step 4:** `npm run typecheck && npm test` → pass. Live: create a Sandbox company with infinite cash and hardware price 0.25×, buy 1000 servers, open dev panel with `` ` ``, trigger heatwave on a site (news + ticker show it), skip 365 days, save → load list shows badge; career game: `` ` `` does nothing.
- [ ] **Step 5:** Commit `feat: sandbox / developer mode`.

### Task 15: Final verification and docs

**Files:**
- Modify: `README.md` (features + new screenshots), `docs/GAME_DESIGN.md` (hubs, managers, sandbox), `docs/ROADMAP.md` (mark sub-project 1 done), `Next-Session.md` (git-ignored; update layout notes)

- [ ] **Step 1:** `npm test && npm run typecheck && npm run build` → all pass; paste counts.
- [ ] **Step 2:** Full live playthrough, 15 minutes at speed 3 from an empty career start using only HQ next steps: reach first rental and a profitable week; zero console errors (`browser_console_messages`).
- [ ] **Step 3:** Update docs and screenshots.
- [ ] **Step 4:** Commit `docs: UX foundation`.

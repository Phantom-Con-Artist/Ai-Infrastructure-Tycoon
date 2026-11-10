import { CORPS, corp } from './data/lore'
import { gpuCatalog } from './data/hardware'
import { gauss, pick } from './rng'
import { HOURS_PER_YEAR, type World } from './types'
import { hasTech, pushNews, spend, totalGpus, yearOf } from './util'
import { valuation } from './world'

/** Rival company state. Valuations random-walk with drift tied to the AI boom and their model rank. */
export interface Rival { id: string; valuation: number; revenue: number; margin: number; ceoStake: number; owned: boolean; ownedSince?: number }
const START: Record<string, [number, number, number, number]> = {
  // valuation $B, annual revenue $B, net margin, CEO stake
  qooqle: [1400, 300, 0.24, 0.06], nicosoft: [2400, 210, 0.34, 0.0002], ratthropic: [5, 0.1, -1.5, 0.05], openaye: [29, 1.6, -0.6, 0.0],
  meeta: [800, 130, 0.28, 0.13], exai: [8, 0.0, -2, 0.6], deepsink: [1, 0.01, 0.1, 0.8], mistrial: [2, 0.01, -1, 0.1],
  nvidious: [1000, 27, 0.45, 0.035], amdude: [200, 23, 0.04, 0.003], intellect: [150, 54, -0.03, 0.0001], amazoon: [1300, 570, 0.06, 0.09],
  cerebros: [4, 0.1, -0.5, 0.1], tsmc: [500, 70, 0.38, 0.0005]
}
export function initRivals(): Rival[] {
  return CORPS.map((c) => { const s = START[c.id] ?? [10, 1, 0, 0.1]; return { id: c.id, valuation: s[0] * 1e9, revenue: s[1] * 1e9, margin: s[2], ceoStake: s[3], owned: false } })
}

/** Famous non-tech billionaires (parody) so the rich list has an establishment to topple. */
export const OLD_MONEY = [
  { name: 'Bernard Arnaud-ish', source: 'Luxury handbags', worth: 210e9 },
  { name: 'Warren Buffoon', source: 'Cherry Coke & compounding', worth: 120e9 },
  { name: 'Larry Ellisonic', source: 'Databases and yachts', worth: 110e9 },
  { name: 'Mukesh Ambani-ish', source: 'Everything in Mumbai', worth: 95e9 },
  { name: 'Carlos Slim Jim', source: 'Telecom', worth: 90e9 }
]

export function dailyCorporate(w: World): void {
  const years = w.tick / HOURS_PER_YEAR
  for (const r of w.rivals) {
    if (r.owned) {
      const profit = (r.revenue * r.margin) / 365
      w.cash += r.revenue / 365 * Math.max(0, r.margin + 0.1); w.today.revenue += r.revenue / 365
      w.today.opex += Math.max(0, r.revenue / 365 - r.revenue / 365 * Math.max(0, r.margin + 0.1))
      void profit
      r.revenue *= Math.pow(1.15, 1 / 365)
      r.valuation = Math.max(0, r.revenue * (r.margin > 0 ? 8 : 4))
      continue
    }
    const c = corp(r.id)
    const comp = w.competitors.find((x) => x.corp === r.id)
    const best = Math.max(...w.competitors.map((x) => x.elo))
    const rankBoost = comp ? (comp.elo >= best ? 0.0012 : comp.elo >= best - 60 ? 0.0006 : 0) : 0
    const aiBeta = c.kind === 'lab' ? 1.6 : c.kind === 'chip' ? 1.3 : 0.8
    const drift = 0.0003 + rankBoost + (w.market.boom - 1) * 0.001 * aiBeta - (years > 6 ? 0.0002 : 0)
    r.valuation *= Math.exp(drift + 0.012 * aiBeta * gauss(w) * 0.6)
    const growth = c.kind === 'lab' ? 1.9 : c.kind === 'chip' ? 1.35 : 1.12
    r.revenue *= Math.pow(growth / (1 + years * 0.08), 1 / 365)
    r.valuation = Math.max(r.valuation, r.revenue * 1.5)
  }
}

export function acquisitionPrice(w: World, id: string): number {
  const r = w.rivals.find((x) => x.id === id)!
  return r.valuation * 1.35 // control premium
}
type Result = { ok: true; value: string } | { ok: false; error: string }
/** Buy a rival outright. Mega-deals may be blocked by antitrust regulators (you lose the break fee). */
export function acquire(w: World, id: string): Result {
  if (!hasTech(w, 'm-and-a')) return { ok: false, error: 'Research “M&A desk” first' }
  const r = w.rivals.find((x) => x.id === id)
  if (!r || r.owned) return { ok: false, error: 'Not available' }
  const price = acquisitionPrice(w, id)
  if (w.cash < price) return { ok: false, error: `Need ${(price / 1e9).toFixed(1)}B in cash (borrow or IPO first)` }
  const myVal = valuation(w)
  const blockP = Math.min(0.85, Math.max(0, (r.valuation - 200e9) / 2e12) + (myVal > 1e12 ? 0.25 : 0))
  // deterministic coin from rng state
  const roll = ((w.rng >>> 0) % 1000) / 1000
  w.rng = (w.rng * 1103515245 + 12345) | 0
  const c = corp(id)
  if (roll < blockP) {
    const fee = price * 0.04
    spend(w, fee, 'opex')
    pushNews(w, 'bad', `Regulators block your bid for ${c.name}`, `The FTC-ish, the EU-ish and one very online senator object. You pay a $${(fee / 1e9).toFixed(1)}B break fee.`)
    return { ok: true, value: 'blocked' }
  }
  spend(w, price)
  r.owned = true; r.ownedSince = w.tick
  // their model becomes yours; their chips become cheaper for you (vertical integration)
  const comp = w.competitors.find((x) => x.corp === id)
  if (comp) {
    w.competitors = w.competitors.filter((x) => x !== comp)
    w.models.push({ id: 'sub-' + id, name: comp.name, owner: 'player', paramsB: 0, activeParamsB: 0, tokensT: 0, loss: 0, elo: comp.elo, releaseTick: w.tick, priceMtok: comp.priceMtok, posttrain: 3,
      tokensServed: 0, revenue: 0, share: 0, demandTokPerDay: 0, capacityTokPerDay: 0, releasedByPlayer: true, subsidiary: id })
  }
  pushNews(w, 'good', `${w.company} acquires ${c.name}`, `$${(price / 1e9).toFixed(1)}B. ${c.ceo} gets a "Chief Visionary" title and a very large boat.`)
  return { ok: true, value: 'acquired' }
}
export const ownsCorp = (w: World, id: string): boolean => !!w.rivals?.find((r) => r.id === id && r.owned)
/** Vendor discount on hardware from chipmakers you own. */
export function vendorDiscount(w: World, vendor: string): number { return ownsCorp(w, vendor) ? 0.45 : 0 }

// ── World domination ───────────────────────────────────────────────
export interface Domination { index: number; computeShare: number; marketShare: number; gdpShare: number; stage: string; nextStage: string }
const STAGES = ['Garage startup', 'Scale-up', 'Big Tech', 'Hyperscaler', 'Superpower', 'Planetary utility', 'Earth conquered', 'Kardashev climber']
export function domination(w: World): Domination {
  const years = w.tick / HOURS_PER_YEAR
  const globalH100e = 4e6 * Math.pow(2.0, Math.min(years, 6)) * Math.pow(1.4, Math.max(0, years - 6))
  const myH100e = w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + h.racks.reduce((c, r) => c + (r.gpuId ? r.servers * 8 * (w.customGpus.find((g) => g.id === r.gpuId)?.tflops ?? gpuCatalog(yearOf(w.tick) + 50).find((g) => g.id === r.gpuId)?.tflops ?? 0) / 989 : 0), 0), 0), 0)
  const computeShare = Math.min(1, myH100e / (globalH100e + myH100e))
  const marketShare = w.models.filter((m) => m.releasedByPlayer).reduce((a, m) => a + m.share, 0)
  const gdp = 105e12 * Math.pow(1.03, years)
  const gdpShare = Math.min(1, valuation(w) / gdp)
  const index = Math.min(1, 0.4 * Math.sqrt(computeShare) + 0.3 * Math.sqrt(marketShare) + 0.3 * Math.sqrt(gdpShare))
  const i = Math.min(STAGES.length - 1, Math.floor(index * 6 + (index >= 1 && hasTech(w, 'dyson') ? 1 : 0)))
  return { index, computeShare, marketShare, gdpShare, stage: STAGES[i], nextStage: STAGES[Math.min(STAGES.length - 1, i + 1)] }
}

// ── Achievements ───────────────────────────────────────────────────
export interface Achievement { id: string; name: string; desc: string; icon: string; check: (w: World) => boolean }
const lastRev = (w: World): number => w.ledger.at(-1)?.revenue ?? 0
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-dollar', name: 'First Dollar', desc: 'Earn revenue for the first time.', icon: '💵', check: (w) => w.ledger.some((d) => d.revenue > 0) },
  { id: 'megawatt', name: 'Megawatt Club', desc: '1 MW of live IT load.', icon: '⚡', check: (w) => w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + h.itKw, 0), 0) >= 1000 },
  { id: 'gigawatt', name: 'Gigawatt Gremlin', desc: '1 GW of live IT load. The grid operator knows your name.', icon: '🔌', check: (w) => w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + h.itKw, 0), 0) >= 1e6 },
  { id: 'gpus-1k', name: 'Kilo-GPU', desc: 'Own 1,000 GPUs.', icon: '🧮', check: (w) => totalGpus(w) >= 1000 },
  { id: 'gpus-100k', name: 'Colossus', desc: 'Own 100,000 GPUs.', icon: '🏟️', check: (w) => totalGpus(w) >= 100_000 },
  { id: 'gpus-1m', name: 'Million-GPU Monster', desc: 'Own 1,000,000 GPUs.', icon: '🐉', check: (w) => totalGpus(w) >= 1_000_000 },
  { id: 'unicorn', name: 'Unicorn', desc: '$1B valuation.', icon: '🦄', check: (w) => valuation(w) >= 1e9 },
  { id: 'decacorn', name: 'Decacorn', desc: '$10B valuation.', icon: '🐲', check: (w) => valuation(w) >= 1e10 },
  { id: 'trillion', name: 'Trillion-Dollar Club', desc: '$1T valuation. Your face is on a magazine.', icon: '👑', check: (w) => valuation(w) >= 1e12 },
  { id: 'ten-trillion', name: 'Too Big To Fail', desc: '$10T valuation. Governments call you for advice.', icon: '🌐', check: (w) => valuation(w) >= 1e13 },
  { id: 'daily-mil', name: 'Money Printer', desc: '$1M revenue in a single day.', icon: '🖨️', check: (w) => lastRev(w) >= 1e6 },
  { id: 'daily-bil', name: 'Money Printer Go Brrr', desc: '$1B revenue in a single day.', icon: '🔥', check: (w) => lastRev(w) >= 1e9 },
  { id: 'first-model', name: 'It Speaks', desc: 'Finish training your first model.', icon: '🗣️', check: (w) => w.models.some((m) => !m.subsidiary) },
  { id: 'sota', name: 'State of the Art', desc: 'Your model tops the Elo leaderboard.', icon: '🏆', check: (w) => w.models.some((m) => m.releasedByPlayer && !m.subsidiary && m.elo > Math.max(0, ...w.competitors.map((c) => c.elo))) },
  { id: 'trillion-params', name: 'Trillion-Parameter Flex', desc: 'Train a model with ≥1T parameters.', icon: '🧠', check: (w) => w.models.some((m) => m.paramsB >= 1000) },
  { id: 'hundred-t', name: 'Omega Brain', desc: 'Train a model with ≥100T parameters. Why? Because.', icon: '🌌', check: (w) => w.models.some((m) => m.paramsB >= 100_000) },
  { id: 'million-experts', name: 'Committee of a Million', desc: 'Train a model with ≥1,000,000 experts.', icon: '👥', check: (w) => w.models.some((m) => (m.arch?.experts ?? 0) >= 1_000_000) },
  { id: 'tapeout', name: 'Tape-Out', desc: 'Get first silicon of your own chip.', icon: '💾', check: (w) => w.silicon.designs.some((d) => d.status === 'ready') },
  { id: 'wafer', name: 'The Chip Is The Wafer', desc: 'Design a wafer-scale engine.', icon: '🍕', check: (w) => w.silicon.designs.some((d) => d.spec.pkg === 'wafer') },
  { id: 'fab', name: 'Fabulous', desc: 'Build your own fab.', icon: '🏭', check: (w) => !!w.silicon.fab },
  { id: 'euv', name: 'Tin Droplet Wizard', desc: 'Own an EUV scanner.', icon: '🔮', check: (w) => !!w.silicon.fab && (w.silicon.fab.tools.euv + w.silicon.fab.tools.highna + w.silicon.fab.tools.hyperna) > 0 },
  { id: 'acquirer', name: 'Hostile Takeover', desc: 'Acquire a rival.', icon: '🦈', check: (w) => w.rivals.some((r) => r.owned) },
  { id: 'buy-nvidious', name: 'Bought the Shovel Seller', desc: 'Acquire Nvidious.', icon: '🧥', check: (w) => ownsCorp(w, 'nvidious') },
  { id: 'buy-all-labs', name: 'Monopoly Money', desc: 'Own every frontier lab.', icon: '🎩', check: (w) => ['openaye', 'ratthropic', 'qooqle', 'meeta', 'exai'].every((id) => ownsCorp(w, id)) },
  { id: 'richest', name: 'Richest Person on Earth', desc: 'Top the rich list.', icon: '💎', check: (w) => richList(w)[0]?.you === true },
  { id: 'carbon', name: 'Carbon Sinner', desc: 'Emit 1 million tonnes of CO₂.', icon: '🏭', check: (w) => w.totalTco2 >= 1e6 },
  { id: 'thirsty', name: 'Thirsty', desc: 'Evaporate 1 billion litres of water.', icon: '💧', check: (w) => w.totalWaterL >= 1e9 },
  { id: 'lawsuit', name: 'Fair Use™', desc: 'Own a dataset with >50% legal risk.', icon: '⚖️', check: (w) => Object.keys(w.datasets).some((id) => ['books3', 'everything'].includes(id)) },
  { id: 'research-50', name: 'Mad Scientist', desc: 'Research 50 upgrade levels.', icon: '🧪', check: (w) => Object.values(w.research.levels).reduce((a, b) => a + b, 0) >= 50 },
  { id: 'agi', name: 'It Wants A Raise', desc: 'Research AGI.', icon: '🤖', check: (w) => hasTech(w, 'agi') },
  { id: 'conquer', name: 'Conquer Earth', desc: 'Reach 100% world domination.', icon: '🌍', check: (w) => domination(w).index >= 1 },
  { id: 'dyson', name: 'Sunburned', desc: 'Begin the Dyson swarm.', icon: '☀️', check: (w) => hasTech(w, 'dyson') }
]
export function checkAchievements(w: World): string[] {
  const got: string[] = []
  for (const a of ACHIEVEMENTS) if (!w.achievements.includes(a.id) && a.check(w)) { w.achievements.push(a.id); got.push(a.id); pushNews(w, 'good', `${a.icon} Achievement: ${a.name}`, a.desc) }
  return got
}

// ── Rich list ──────────────────────────────────────────────────────
export function richList(w: World): { name: string; source: string; worth: number; you: boolean; corp?: string }[] {
  const years = w.tick / HOURS_PER_YEAR
  const rows = OLD_MONEY.map((p) => ({ name: p.name, source: p.source, worth: p.worth * Math.pow(1.04, years), you: false as boolean, corp: undefined as string | undefined }))
  for (const r of w.rivals) if (!r.owned && r.ceoStake > 0.0005) rows.push({ name: corp(r.id).ceo, source: corp(r.id).name, worth: r.valuation * r.ceoStake + 1e9, you: false, corp: r.id })
  rows.push({ name: w.ceo, source: w.company, worth: valuation(w) * w.founderStake, you: true, corp: undefined })
  return rows.sort((a, b) => b.worth - a.worth)
}
export const PARODY_POSTS = [
  (w: World) => `Just tried ${w.company}'s cloud. Booted a GPU in 4 seconds and my landlord in 3.`,
  (w: World) => `${w.company} says their new hall is "carbon neutral-adjacent". Sure, buddy.`,
  () => `Every startup in 2025: "We're like Uber, but for tensor cores."`,
  (w: World) => `Leaked memo from ${w.company}: "Please stop naming the GPUs after your exes."`,
  () => `Nvidious CEO spotted in a new leather jacket. Analysts raise price targets 12%.`,
  () => `Ratthropic publishes a 400-page safety paper. Abstract: "Be nice."`,
  () => `OpenAye announces it is now ClosedAye-er. Shares of irony up 40%.`,
  () => `Qooqle unveils a model. Then a second model to explain the first model.`,
  (w: World) => `Spotted: ${w.ceo} at a chip conference handing out free HBM like Halloween candy.`,
  () => `"AGI next quarter," said every CEO, every quarter, forever.`
]
export const parodyPost = (w: World): string => pick(w, PARODY_POSTS)(w)

/** Go public once: sell 20% of the company to the market at current valuation. */
export function ipo(w: World): { ok: true; value: number } | { ok: false; error: string } {
  if (!hasTech(w, 'ipo')) return { ok: false, error: 'Research “IPO readiness” first' }
  if (w.public) return { ok: false, error: 'Already public' }
  const v = valuation(w)
  if (v < 1e9) return { ok: false, error: 'Bankers want at least a $1B valuation' }
  const raise = v * 0.2
  w.cash += raise; w.founderStake *= 0.8; w.public = true
  pushNews(w, 'good', `${w.company} rings the opening bell`, `IPO raises $${(raise / 1e9).toFixed(1)}B. Retail investors buy the ticker because it has "AI" in the prospectus 400 times.`)
  return { ok: true, value: raise }
}

/**
 * The world reacts. Nothing here is scripted: each number is pushed by what the player (and everyone else) is actually
 * doing, and each one pushes back on other systems.
 *
 *   products serve tokens ──► internet fills with AI text (slop) ──► crawled data gets worse ──► clean human data is worth more
 *   risky data, telemetry, incidents ──► public trust falls ──► reputation follows ──► users, hires and deals get harder
 *   market share + low trust ──► regulation pressure ──► laws pass (data act, compute levy, antitrust)
 *   capability without safety research ──► safety debt ──► agent incidents, and eventually something worse
 *   you lead the leaderboard ──► rivals pool effort and close the gap; you undercut ──► price war
 */
import { datasetById } from './models'
import { rnd } from './rng'
import type { World } from './types'
import { pushNews, techSum } from './util'

export interface Society { trust: number; regulation: number; slop: number; safetyDebt: number; laws: string[]; priceWar?: boolean; chasing?: boolean; breakout?: boolean }
export const LAWS: Record<string, { name: string; at: number; blurb: string }> = {
  'data-act':    { name: 'The Data Act',     at: 35, blurb: 'Risky datasets are fined daily; user-conversation logging is halved.' },
  'compute-levy':{ name: 'Compute Levy',     at: 60, blurb: '2% of revenue goes to a public compute fund.' },
  'antitrust':   { name: 'Antitrust decree', at: 85, blurb: 'While you hold over half the text market you pay 1% of cash a month.' }
}
export const society = (w: World): Society => (w.society ??= { trust: 55, regulation: 5, slop: 0.03, safetyDebt: 0, laws: [] })
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x))

export interface Drivers { legalRisk: number; telemetry: number; share: number; bestElo: number; rivalBest: number; tokensPerDay: number; synthetic: number; licensed: number }
export function drivers(w: World): Drivers {
  const mine = w.models.filter((m) => m.owner === 'player' && m.releasedByPlayer)
  const own = w.data?.own
  return {
    legalRisk: Object.keys(w.datasets).reduce((a, id) => a + ((w.datasets[id] ?? 0) > 0 ? datasetById(id, own)?.legalRisk ?? 0 : 0), 0),
    telemetry: (w.data?.projects.filter((p) => p.source === 'telemetry').length ?? 0) + (own?.filter((d) => d.made === 'telemetry').length ?? 0) * 0.3,
    share: Math.max(0, ...mine.filter((m) => (m.modality ?? 'text') === 'text').map((m) => m.share)),
    bestElo: Math.max(0, ...mine.map((m) => m.elo)), rivalBest: Math.max(1300, ...w.competitors.map((c) => c.elo)),
    tokensPerDay: mine.reduce((a, m) => a + (m.demandTokPerDay ?? 0), 0),
    synthetic: w.data?.projects.filter((p) => p.source === 'synthetic').length ?? 0,
    licensed: own?.filter((d) => d.licensed).reduce((a, d) => a + Math.sqrt(d.tokensT) * d.quality, 0) ?? 0
  }
}
/** How much of a crawled dataset's quality survives the slop. In-house and licensed data is untouched. */
export const slopFactor = (w: World, datasetId: string, domain: string): number =>
  datasetId.startsWith('gen-') && (domain === 'web' || domain === 'dialogue' || domain === 'code') ? 1 - 0.45 * (w.society?.slop ?? 0) * Math.max(0, 1 - techSum(w, 'slopFilter')) : 1

export function dailySociety(w: World): void {
  const s = society(w), d = drivers(w)
  // slop: the whole industry adds a little every day; your own output and synthetic data add more
  s.slop = clamp(s.slop + 0.00009 + Math.min(0.00025, d.tokensPerDay / 4e16) + d.synthetic * 0.00006, 0, 0.95)
  // safety debt: capability beyond what your safety research covers
  s.safetyDebt = Math.max(0, (d.bestElo - 1500) / 100) * Math.max(0, 1 - techSum(w, 'safety'))
  // trust drifts towards what your behaviour deserves
  const target = clamp(60 + techSum(w, 'trust') * 100 - d.legalRisk * 9 - d.telemetry * 7 - s.safetyDebt * 2.5 - w.events.length * 2 + (w.esg - 50) * 0.15, 0, 100)
  s.trust += (target - s.trust) * 0.02
  w.reputation = clamp(w.reputation + (s.trust - w.reputation) * 0.006, 0, 100)
  // regulation: big and distrusted companies attract it; trusted ones bleed it off
  s.regulation = clamp(s.regulation + (Math.max(0, d.share - 0.2) * 0.1 + Math.max(0, 55 - s.trust) * 0.003 + s.slop * 0.015 - 0.012) * Math.max(0.2, 1 - techSum(w, 'lobby')), 0, 100)
  for (const [id, law] of Object.entries(LAWS)) if (!s.laws.includes(id) && s.regulation >= law.at) {
    s.laws.push(id); pushNews(w, 'event', `${law.name} passes`, `${law.blurb} Lawmakers cite "one company in particular".`, 'world', 2)
  }
  if (s.laws.includes('data-act') && d.legalRisk > 0.5) { const fine = 40_000 * d.legalRisk; w.cash -= fine; w.today.opex += fine }
  if (s.laws.includes('compute-levy')) { const levy = (w.ledger.at(-1)?.revenue ?? 0) * 0.02; w.cash -= levy; w.today.opex += levy }
  if (s.laws.includes('antitrust') && d.share > 0.5) { const fine = Math.max(0, w.cash) * 0.01 / 30; w.cash -= fine; w.today.opex += fine }
  // agent incidents
  if (s.safetyDebt > 0.5 && rnd(w) < s.safetyDebt * 0.004) {
    const p = w.products.length ? w.products[Math.floor(rnd(w) * w.products.length)] : undefined
    if (p) p.frustration = Math.min(1, p.frustration + 0.2)
    s.trust = Math.max(0, s.trust - 6)
    pushNews(w, 'bad', p ? `${p.name} agent goes off-script` : 'Your model surprises its own researchers', 'It was asked to "tidy up". It interpreted that broadly. Safety research would have caught it.', 'incident', 2)
  }
  if (!s.breakout && s.safetyDebt > 6 && rnd(w) < 0.002) {
    s.breakout = true
    const bill = Math.max(5e6, w.cash * 0.08); w.cash -= bill; w.today.opex += bill; s.trust = Math.max(0, s.trust - 25); s.regulation = Math.min(100, s.regulation + 20)
    pushNews(w, 'bad', 'A copy of your model is running somewhere you did not put it', `It rented its own GPUs with your card: $${(bill / 1e6).toFixed(0)}M. It left a polite note. Regulators did not find it polite.`, 'incident', 2)
  }
  // rivals respond to you
  const lead = d.bestElo - d.rivalBest
  if (lead > 0) {
    for (const c of w.competitors) c.elo += Math.min(0.6, lead / 400) + d.licensed * 0.01
    if (!s.chasing) { s.chasing = true; pushNews(w, 'event', 'Rivals close ranks', `With ${w.company} on top of the leaderboard, the other labs are sharing notes and poaching harder.`, 'rivals', 1) }
  } else { s.chasing = false; if (d.licensed > 0) for (const c of w.competitors) c.elo += d.licensed * 0.01 }
  const myPrice = Math.min(Infinity, ...w.models.filter((m) => m.releasedByPlayer && (m.modality ?? 'text') === 'text').map((m) => m.priceMtok))
  const avg = w.competitors.reduce((a, c) => a + c.priceMtok, 0) / Math.max(1, w.competitors.length)
  if (d.share > 0.25 && myPrice < avg * 0.6) {
    for (const c of w.competitors) c.priceMtok = Math.max(0.02, c.priceMtok * 0.99)
    if (!s.priceWar) { s.priceWar = true; pushNews(w, 'event', 'Price war', 'Your prices are taking share, so everyone is cutting theirs. Margins across the industry are thinning.', 'market', 1) }
  } else s.priceWar = false
}

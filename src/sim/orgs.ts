/**
 * Organisations: companies that buy seats on one of your models under a contract.
 * Unlike consumer products they negotiate, hold you to an uptime promise, and renew (and grow) or walk depending on
 * how they were treated. Their traffic is served from the same deployments as everything else.
 */
import { MODALITIES, bestRivalElo, type Modality } from './foundry'
import { pick, rnd } from './rng'
import type { World } from './types'
import { newId, pushNews, techSum } from './util'

export interface OrgDeal {
  id: string; org: string; sector: string; modality: Modality; seats: number; pricePerSeat: number; minElo: number; sla: number; months: number
  status: 'offer' | 'active'; expiresTick: number; endTick?: number; modelId?: string; satisfaction: number; servedFrac: number; care: 'standard' | 'premium'; earned: number; tokPerSeatDay: number; renewals: number
}
const ORGS: [string, string][] = [['Globex Logistics', 'logistics'], ['Initech', 'software'], ['Umbrella Health', 'healthcare'], ['Vandelay Industries', 'import/export'], ['Hooli', 'big tech'], ['Soylent Foods', 'food'], ['Wonka Confectionery', 'retail'], ['Stark Insurance', 'insurance'], ['Pied Paper Co', 'paper'], ['Massive Dynamic', 'defence'], ['The Department of Forms', 'government'], ['Prestige Worldwide', 'entertainment'], ['Bluth Homes', 'real estate'], ['Dunder Bank', 'banking'], ['Aperture Labs', 'research']]
export const orgDeals = (w: World): OrgDeal[] => (w.orgDeals ??= [])
type R<T = undefined> = { ok: true; value: T } | { ok: false; error: string }
const mineFor = (w: World, mod: Modality): number => Math.max(0, ...w.models.filter((m) => m.releasedByPlayer && (m.modality ?? 'text') === mod).map((m) => m.elo))

function rollOffer(w: World): void {
  const mods = [...new Set(w.models.filter((m) => m.releasedByPlayer).map((m) => m.modality ?? 'text'))]
  if (!mods.length) return
  const modality = pick(w, mods), [org, sector] = pick(w, ORGS)
  const best = mineFor(w, modality), rival = bestRivalElo(w, modality)
  // bigger names come to you as reputation grows; they ask for a model near the frontier
  const seats = Math.round(Math.pow(10, 1.7 + rnd(w) * 1.6 + w.reputation / 45 + techSum(w, 'seats')) / 10) * 10
  const minElo = Math.round(Math.min(best + 30, rival - 140 + rnd(w) * 160))
  orgDeals(w).push({
    id: newId(w, 'od'), org, sector, modality, seats, pricePerSeat: Math.round((18 + rnd(w) * 30) * MODALITIES[modality].price), minElo, sla: [0.9, 0.95, 0.99][Math.floor(rnd(w) * 3)], months: [6, 12, 24][Math.floor(rnd(w) * 3)],
    status: 'offer', expiresTick: w.tick + 21 * 24, satisfaction: 0.7, servedFrac: 1, care: 'standard', earned: 0, tokPerSeatDay: 20_000 + Math.round(rnd(w) * 60_000), renewals: 0
  })
}
export function eligibleModels(w: World, d: OrgDeal): { id: string; name: string; elo: number }[] {
  return w.models.filter((m) => m.releasedByPlayer && (m.modality ?? 'text') === d.modality && m.elo >= d.minElo).map((m) => ({ id: m.id, name: m.name, elo: m.elo }))
}
/** Tokens a day this organisation will send, and how much the model has to spare after everything else it serves. */
export const dealDemand = (d: OrgDeal): number => d.seats * d.tokPerSeatDay
export function spareCapacity(w: World, modelId: string): number {
  const m = w.models.find((x) => x.id === modelId)
  return m ? Math.max(0, m.capacityTokPerDay - (m.reservedTokPerDay ?? 0)) : 0
}
export function acceptDeal(w: World, id: string, modelId: string): R {
  const d = orgDeals(w).find((x) => x.id === id && x.status === 'offer'); if (!d) return { ok: false, error: 'That offer is gone' }
  if (!eligibleModels(w, d).some((m) => m.id === modelId)) return { ok: false, error: `They need a ${MODALITIES[d.modality].name.toLowerCase()} model of at least ${d.minElo} Elo` }
  d.status = 'active'; d.modelId = modelId; d.endTick = w.tick + d.months * 730
  pushNews(w, 'good', `${d.org} signs`, `${d.seats.toLocaleString()} seats for ${d.months} months. Their procurement team sends a 90-page questionnaire to celebrate.`, 'mine', 1)
  return { ok: true, value: undefined }
}
/** Chance they take a price `pct` higher (0.1 = +10%). Shown to the player before they ask. */
export function counterOdds(w: World, d: OrgDeal, pct: number): number {
  return Math.max(0.03, Math.min(0.97, 0.85 - pct * 2.4 + Math.max(0, Math.min(0.25, (mineFor(w, d.modality) - d.minElo) / 400)) + (w.reputation - 50) / 200 + techSum(w, 'dealWin')))
}
export function counterDeal(w: World, id: string, pct: number): R<boolean> {
  const all = orgDeals(w); const d = all.find((x) => x.id === id && x.status === 'offer'); if (!d) return { ok: false, error: 'That offer is gone' }
  if (rnd(w) < counterOdds(w, d, pct)) { d.pricePerSeat = Math.round(d.pricePerSeat * (1 + pct)); return { ok: true, value: true } }
  w.orgDeals = all.filter((x) => x !== d)
  pushNews(w, 'info', `${d.org} walks away`, 'Their buyer said the number out loud, laughed, and hung up.', 'mine', 0)
  return { ok: true, value: false }
}
export function setCare(w: World, id: string, care: OrgDeal['care']): R {
  const d = orgDeals(w).find((x) => x.id === id); if (!d) return { ok: false, error: 'No such deal' }
  d.care = care; return { ok: true, value: undefined }
}
export function dailyOrgs(w: World): void {
  const all = orgDeals(w), day = Math.floor(w.tick / 24)
  if (day % 5 === 0 && all.filter((d) => d.status === 'offer').length < 4) rollOffer(w)
  w.orgDeals = all.filter((d) => d.status !== 'offer' || d.expiresTick > w.tick)
  for (const d of [...w.orgDeals]) {
    if (d.status !== 'active') continue
    const m = w.models.find((x) => x.id === d.modelId)
    const demand = d.seats * d.tokPerSeatDay
    const avail = m ? Math.max(0, m.capacityTokPerDay - (m.reservedTokPerDay ?? 0)) : 0
    const served = Math.min(demand, avail)
    if (m) m.reservedTokPerDay = (m.reservedTokPerDay ?? 0) + served
    d.servedFrac = demand > 0 ? served / demand : 1
    const gross = d.seats * d.pricePerSeat / 30
    const breach = d.servedFrac < d.sla
    const rev = gross * d.servedFrac * (breach ? 0.8 : 1) * (d.care === 'premium' ? 0.92 : 1) // SLA credits; white-glove support costs margin
    w.cash += rev; w.today.revenue += rev; w.today.inferRev += rev; d.earned += rev
    const quality = m ? Math.max(-0.3, Math.min(0.3, (m.elo - bestRivalElo(w, d.modality)) / 400)) : -0.3
    const target = Math.max(0, Math.min(1, (breach ? d.servedFrac * 0.6 : 0.8) + (quality + (d.care === 'premium' ? 0.15 : 0)) * d.servedFrac))
    d.satisfaction += (target - d.satisfaction) * 0.04
    if (d.satisfaction < 0.25) {
      w.orgDeals = w.orgDeals.filter((x) => x !== d); w.reputation = Math.max(0, w.reputation - 0.5)
      pushNews(w, 'bad', `${d.org} cancels`, `"${(d.servedFrac * 100).toFixed(0)}% of our requests were answered. We were promised ${(d.sla * 100).toFixed(0)}%." They are telling their friends.`, 'mine', 1)
    } else if (w.tick >= (d.endTick ?? Infinity)) {
      if (d.satisfaction > 0.7) {
        d.seats = Math.round(d.seats * (1.15 + d.satisfaction * 0.35) / 10) * 10; d.endTick = w.tick + d.months * 730; d.renewals++
        pushNews(w, 'good', `${d.org} renews and expands`, `Now ${d.seats.toLocaleString()} seats. Happy customers grow on their own.`, 'mine', 1)
      } else { w.orgDeals = w.orgDeals.filter((x) => x !== d); pushNews(w, 'info', `${d.org} does not renew`, 'No hard feelings. A rival offered a discount and a steak dinner.', 'mine', 0) }
    }
  }
}

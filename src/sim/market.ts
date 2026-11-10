import { modalityRivals, type Modality } from './foundry'
import { mult } from './rules'
import { CUSTOMERS, RIVAL_RELEASES, corp } from './data/lore'
import { GPUS_PER_SERVER, gpuCatalog, isCpu, serverPriceUsd, type GpuSpec } from './data/hardware'
import { referencePrice } from './ai'
import { webQuality } from './web'
import { apiPlatformBonus } from './store'
import { gauss, pick, range, rnd } from './rng'
import { HOURS_PER_YEAR, type Competitor, type Contract, type World } from './types'
import { clamp, newId, pushNews, siteServers, techSum, yearOf } from './util'

/** Street price of a GPU (new silicon tracks list price; old silicon decays). */
export function gpuMarketPrice(w: World, g: GpuSpec): number {
  const age = Math.max(0, yearOf(w.tick) - g.year)
  const decay = age <= 1 ? 1 : Math.max(0.3, Math.pow(0.82, age - 1))
  return g.priceUsd * decay * (1 + 0.35 * (w.market.supplyTight - 0.3))
}
export const serverMarketPrice = (w: World, g: GpuSpec): number => {
  const p = gpuMarketPrice(w, g)
  return Math.round((GPUS_PER_SERVER * p * 1.2 + 20000 + 0 * serverPriceUsd(g)) * mult(w, 'hardwarePrice'))
}
export const leadDays = (w: World): number => Math.round(21 + w.market.supplyTight * 70)

/** Reference cloud rental price in $/GPU-hour before demand pressure. */
export function refRentPerGpuHour(w: World, g: GpuSpec): number {
  const cost = gpuMarketPrice(w, g) * 1.25
  return Math.max(0.2, (cost / (4 * HOURS_PER_YEAR * 0.7)) * 1.8)
}
export const RENTAL_KIND: Record<'ondemand' | 'reserved' | 'spot', { name: string; price: number; util: number | null; blurb: string }> = {
  ondemand: { name: 'On-demand', price: 1, util: null, blurb: 'Full price, utilisation follows the market.' },
  reserved: { name: '1-yr reserved', price: 0.62, util: 0.93, blurb: 'Customers commit for a year: steady, discounted.' },
  spot: { name: 'Spot', price: 0.32, util: 0.97, blurb: 'Dirt cheap, always full, preemptible.' }
}
export function rentalPrice(w: World, g: GpuSpec): number {
  if (isCpu(g)) return (g.vcpus ?? 0) * 0.034 * Math.pow(clamp(w.market.vmPressure ?? 1, 0.5, 2), 0.6) * (1 + techSum(w, 'rentPrice'))
  const p = w.market.gpuPressure[g.id] ?? 1
  return refRentPerGpuHour(w, g) * Math.pow(clamp(p, 0.3, 3), 0.8) * (1 + techSum(w, 'rentPrice'))
}
export function rentalUtilisation(w: World, g: GpuSpec, priceMult: number): number {
  const p = isCpu(g) ? (w.market.vmPressure ?? 1) : (w.market.gpuPressure[g.id] ?? 1)
  const salesBoost = 1 + Math.min(0.08, Math.log10(1 + w.staff.sales) * 0.04)
  return clamp(0.8 * p * mult(w, 'demand') * salesBoost * Math.pow(priceMult, -1.6) * (0.6 + 0.4 * w.reputation / 100) + techSum(w, 'rentUtil'), 0.03, 0.97)
}

export function marketDemandTokensPerDay(w: World): number { return w.market.tokensPerDay * w.market.boom * (1 + techSum(w, 'demand')) * mult(w, 'demand') }

export function currentCompetitors(w: World): Competitor[] { return w.competitors }

export function dailyMarket(w: World): void {
  const m = w.market
  const years = w.tick / HOURS_PER_YEAR
  const growth = 0.15 + 1.1 / (1 + years / 2.5)
  m.tokensPerDay *= Math.pow(1 + growth, 1 / 365)
  m.boom += (1 - m.boom) * 0.01 + 0.01 * gauss(w)
  m.boom = clamp(m.boom, 0.35, 3)
  m.supplyTight += (0.3 - m.supplyTight) * 0.012
  m.vmPressure = clamp((m.vmPressure ?? 1) + (1.05 - (m.vmPressure ?? 1)) * 0.02 + 0.01 * gauss(w), 0.6, 1.6)
  const cat = gpuCatalog(yearOf(w.tick)).sort((a, b) => b.year - a.year || b.tflops - a.tflops)
  const topYear = cat[0]?.year ?? 2023
  for (const g of cat) {
    const gen = topYear - g.year
    const f = gen <= 0 ? 1.25 : gen === 1 ? 1.1 : gen === 2 ? 0.9 : gen === 3 ? 0.7 : 0.5
    w.market.gpuPressure[g.id] = clamp(m.boom * f * (0.8 + 0.2 * m.supplyTight), 0.1, 3.5)
  }
  // price drift
  m.priceDrift = Math.pow(0.55, 1 / 365)
  rivalReleases(w)
  for (const c of w.competitors) {
    const yrs = years
    c.priceMtok = referencePrice(yrs, c.elo) * (corp(c.corp).kind === 'cloud' ? 0.9 : 1)
  }
  rollContracts(w)
}

function rivalReleases(w: World): void {
  const month = (w.tick / HOURS_PER_YEAR) * 12
  const released = (w.releasedNames ??= [])
  const rivalNext = (w.rivalNext ??= {})
  for (const r of RIVAL_RELEASES) {
    if (month >= r.month && !released.includes(r.name) && r.month > 0) {
      released.push(r.name)
      const existing = w.competitors.find((c) => c.corp === r.corp)
      if (existing) { existing.name = r.name; existing.elo = Math.max(existing.elo, r.elo) }
      else w.competitors.push({ corp: r.corp, name: r.name, elo: r.elo, priceMtok: referencePrice(month / 12, r.elo) })
      pushNews(w, 'event', `${corp(r.corp).name} launches ${r.name}`, `${corp(r.corp).ceo}: "${corp(r.corp).quip}" Leaderboard Elo ${r.elo}.`, 'rivals', 2)
    }
  }
  // Beyond the scripted table: procedural releases, ~every 9 months per lab with diminishing gains.
  if (month > 36) {
    for (const c of w.competitors) {
      const key = c.corp
      const agg = mult(w, 'rivalAggression')
      if (rivalNext[key] === undefined) rivalNext[key] = month + range(w, 3, 12) / agg
      if (month >= rivalNext[key]) {
        const gain = 70 * Math.pow(0.97, month - 36) * range(w, 0.4, 1.4)
        c.elo += gain
        const ver = Math.floor((month - 36) / 9) + 6
        c.name = `${c.name.replace(/\s\d+(\.\d+)?.*$/, '')} ${ver}`
        rivalNext[key] = month + range(w, 6, 12) / agg
        pushNews(w, 'event', `${corp(c.corp).name} ships ${c.name}`, `New SOTA at Elo ${Math.round(c.elo)}. The leaderboard is a treadmill.`, 'rivals', 1)
      }
    }
  }
}

export function initCompetitors(): Competitor[] {
  return [
    { corp: 'openaye', name: 'GPTea 3.5', elo: 1390, priceMtok: 2 },
    { corp: 'ratthropic', name: 'Clawed Instant', elo: 1340, priceMtok: 1.6 },
    { corp: 'qooqle', name: 'Palmy', elo: 1330, priceMtok: 1.5 },
    { corp: 'meeta', name: 'Llamma 1', elo: 1290, priceMtok: 0.9 }
  ]
}

export function modelShare(w: World): Map<string, number> {
  // softmax over utility (quality vs price), one race per modality: an image model competes with image studios, not chatbots
  const out = new Map<string, number>()
  const u = (elo: number, price: number): number => (elo - 1500) / 110 - Math.log(Math.max(0.01, price))
  const mine = w.models.filter((m) => m.owner === 'player' && m.releasedByPlayer)
  const groups = new Set<Modality>(['text', ...mine.map((m) => m.modality ?? 'text')])
  for (const mod of groups) {
    const entries: { id: string; u: number }[] = modalityRivals(w, mod).map((c) => ({ id: 'c:' + c.corp, u: u(c.elo, c.priceMtok) }))
    for (const m of mine) {
      if ((m.modality ?? 'text') !== mod) continue
      const hype = 1 + (w.advisor === 'pr' ? 0.06 : 0)
      entries.push({ id: m.id, u: u(m.elo, m.priceMtok) + Math.log(hype) + Math.log(1 + (m.hype ?? 0)) + webQuality(w) * 0.15 + apiPlatformBonus(w, m.id) + (w.reputation - 50) / 120 })
    }
    const mx = Math.max(...entries.map((e) => e.u))
    const exps = entries.map((e) => Math.exp(e.u - mx))
    const sum = exps.reduce((a, b) => a + b, 0)
    entries.forEach((e, i) => out.set(e.id, exps[i] / sum))
  }
  return out
}

function rollContracts(w: World): void {
  w.contracts = w.contracts.filter((c) => c.accepted || c.expiresTick > w.tick)
  const open = w.contracts.filter((c) => !c.accepted).length
  if (open >= 6 || rnd(w) > 0.4) return
  // size offers to what the player's biggest site can actually do
  let best = { servers: 8, tflops: 312, site: '' }
  for (const s of w.sites) for (const gId of Object.keys(s.stock).concat(s.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))) {
    const g = gpuCatalog(yearOf(w.tick) + 50).find((x) => x.id === gId)
    if (!g) continue
    const n = siteServers(s, gId)
    if (n * g.tflops > best.servers * best.tflops) best = { servers: n, tflops: g.tflops, site: s.id }
  }
  const frac = range(w, 0.15, 0.7)
  const days = Math.round(range(w, 4, 40))
  const flops = best.servers * frac * 8 * best.tflops * 1e12 * 0.33 * days * 86400
  const maxN = Math.sqrt(flops / 120) / 1e9
  const paramsB = Math.round(Math.exp(range(w, 0, Math.log(Math.max(2, Math.min(400, maxN))))))
  const nb = Math.max(1, paramsB)
  const tokensT = Math.max(0.02, flops / (6 * nb * 1e9) / 1e12)
  const rate = 3.6 * range(w, 1.15, 1.7)
  const gpuHours = (best.servers * frac * 8 * days * 24)
  const pay = Math.round(gpuHours * rate * (0.8 + 0.2 * w.market.boom) / 1000) * 1000
  const moe = nb > 100 && rnd(w) < 0.3
  const c: Contract = {
    id: newId(w, 'k'), customer: pick(w, CUSTOMERS), modelName: `${pick(w, ['Project', 'Operation', 'Initiative'])} ${pick(w, ['Gizmo', 'Banana', 'Cobweb', 'Walrus', 'Nimbus', 'Tulip', 'Anvil'])}`,
    paramsB: nb, tokensT: +tokensT.toFixed(3), moe, deadlineTick: w.tick + Math.round(days * 24 * range(w, 1.5, 2.5)),
    payUsd: Math.max(50_000, pay), expiresTick: w.tick + 24 * 14, minGpuMemGB: nb > 70 ? 80 : 40, accepted: false
  }
  w.contracts.push(c)
}

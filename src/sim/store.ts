import { canAfford } from './rules'
import { bestRivalElo } from './foundry'
/**
 * Consumer & business products built on your models (the "Store").
 *
 * Calibration (public reporting, 2024–2025): ~5% of weekly active users pay; consumer subscription churn
 * ~5–7%/month, B2B ~2–3%; a typical free chat user sends ~40 requests/month of ~2.4k tokens; API platforms
 * gate rate limits by cumulative-spend tiers ($5 / $50 / $100 / $250 / $1,000).
 *
 * Everything here is coherent with the rest of the sim: product usage is served by the backing model's
 * deployments (GPU capacity). If capacity is short, users get rate-limited, get frustrated and churn.
 */
import { pick, rnd } from './rng'
import { HOURS_PER_YEAR, type World } from './types'
import { newId, pushNews, spend } from './util'
import { webQuality } from './web'

export type Category = 'chat' | 'coding' | 'creative' | 'companion' | 'enterprise' | 'api'
export interface CategorySpec { id: Category; name: string; blurb: string; tam0: number; tamGrowth: number; penetration0: number; baseTokPerDay: number; wtp: number; churnMonthly: number; rivalPull: number; seatBased?: boolean }
export const CATEGORIES: Record<Category, CategorySpec> = {
  chat:       { id: 'chat',       name: 'Chat assistant',  blurb: 'The everything-app. Homework, recipes, existential dread.', tam0: 4.5e9, tamGrowth: 1.03, penetration0: 0.06, baseTokPerDay: 3200, wtp: 22, churnMonthly: 0.065, rivalPull: 6 },
  coding:     { id: 'coding',     name: 'Coding agent',    blurb: 'Writes code. Deletes prod. Apologises beautifully.',     tam0: 30e6,  tamGrowth: 1.08, penetration0: 0.15, baseTokPerDay: 60000, wtp: 35, churnMonthly: 0.05, rivalPull: 4 },
  creative:   { id: 'creative',   name: 'Creative studio', blurb: 'Images, video, music. Hands mostly have five fingers.',  tam0: 600e6, tamGrowth: 1.06, penetration0: 0.04, baseTokPerDay: 9000, wtp: 15, churnMonthly: 0.08, rivalPull: 5 },
  companion:  { id: 'companion',  name: 'AI companion',    blurb: 'A friend who always texts back. Wholesome. Mostly.',     tam0: 900e6, tamGrowth: 1.05, penetration0: 0.02, baseTokPerDay: 12000, wtp: 12, churnMonthly: 0.1, rivalPull: 3 },
  enterprise: { id: 'enterprise', name: 'Enterprise suite', blurb: 'SSO, audit logs, and a 90-page security questionnaire.', tam0: 1.0e9, tamGrowth: 1.04, penetration0: 0.03, baseTokPerDay: 25000, wtp: 45, churnMonthly: 0.02, rivalPull: 5, seatBased: true },
  api:        { id: 'api',        name: 'Developer API',   blurb: 'API keys, rate limits, usage tiers. Developers build on you.', tam0: 30e6, tamGrowth: 1.12, penetration0: 0.1, baseTokPerDay: 400000, wtp: 0, churnMonthly: 0.04, rivalPull: 5 }
}

export interface Plan { id: string; name: string; price: number; tokPerDay: number; seatsMin: number; ads: boolean; priority: boolean; subs: number }
export interface ApiTier { name: string; minSpend: number; rpm: number; tpm: number }
export interface ApiKey { id: string; owner: string; tier: number; tokPerDay: number; spend: number; created: number }
export interface DayPoint { day: number; users: number; paid: number; mrr: number; tokens: number; served: number; churned: number; revenue: number }
export interface Product {
  id: string; name: string; category: Category; modelId: string; launched: number
  plans: Plan[]; freeUsers: number; marketingPerDay: number; history: DayPoint[]
  servedFrac: number; frustration: number
  api?: { tiers: ApiTier[]; signupCredit: number; keys: ApiKey[]; devs: number }
}
export const DEFAULT_PLANS = (c: Category): Omit<Plan, 'id' | 'subs'>[] => c === 'enterprise'
  ? [{ name: 'Team', price: 30, tokPerDay: 40000, seatsMin: 5, ads: false, priority: true }, { name: 'Enterprise', price: 60, tokPerDay: 120000, seatsMin: 150, ads: false, priority: true }]
  : c === 'api' ? []
  : [{ name: 'Free', price: 0, tokPerDay: CATEGORIES[c].baseTokPerDay, seatsMin: 1, ads: false, priority: false },
     { name: 'Plus', price: 20, tokPerDay: CATEGORIES[c].baseTokPerDay * 12, seatsMin: 1, ads: false, priority: true },
     { name: 'Pro', price: 200, tokPerDay: CATEGORIES[c].baseTokPerDay * 120, seatsMin: 1, ads: false, priority: true }]
export const DEFAULT_TIERS: ApiTier[] = [
  { name: 'Free', minSpend: 0, rpm: 3, tpm: 40_000 }, { name: 'Tier 1', minSpend: 5, rpm: 500, tpm: 200_000 }, { name: 'Tier 2', minSpend: 50, rpm: 5_000, tpm: 2_000_000 },
  { name: 'Tier 3', minSpend: 100, rpm: 5_000, tpm: 4_000_000 }, { name: 'Tier 4', minSpend: 250, rpm: 10_000, tpm: 10_000_000 }, { name: 'Tier 5', minSpend: 1_000, rpm: 30_000, tpm: 150_000_000 }]

type R<T = undefined> = { ok: true; value: T } | { ok: false; error: string }
export function createProduct(w: World, o: { name: string; category: Category; modelId: string }): R<Product> {
  const m = w.models.find((x) => x.id === o.modelId)
  if (!m || !m.releasedByPlayer) return { ok: false, error: 'Pick a launched model to power it' }
  if (w.products.some((p) => p.category === o.category && o.category === 'api' && p.modelId === o.modelId)) return { ok: false, error: 'That model already has an API platform' }
  const cost = o.category === 'enterprise' ? 5e6 : 1e6
  if (!canAfford(w, cost)) return { ok: false, error: `Launch budget ${cost / 1e6}M` }
  spend(w, cost, 'opex')
  const p: Product = {
    id: newId(w, 'p'), name: o.name, category: o.category, modelId: o.modelId, launched: w.tick,
    plans: DEFAULT_PLANS(o.category).map((x) => ({ ...x, id: newId(w, 'pl'), subs: 0 })), freeUsers: 0, marketingPerDay: 0, history: [], servedFrac: 1, frustration: 0,
    api: o.category === 'api' ? { tiers: DEFAULT_TIERS.map((t) => ({ ...t })), signupCredit: 5, keys: [], devs: 0 } : undefined
  }
  w.products.push(p)
  pushNews(w, 'good', `${p.name} launches`, `${CATEGORIES[o.category].name} powered by ${m.name}. ProductHunt-ish #1 of the day, narrowly beating a to-do app.`, 'mine', 2)
  return { ok: true, value: p }
}
export function updatePlan(w: World, productId: string, planId: string, patch: Partial<Plan>): R {
  const p = w.products.find((x) => x.id === productId); if (!p) return { ok: false, error: 'No product' }
  const pl = p.plans.find((x) => x.id === planId); if (!pl) return { ok: false, error: 'No plan' }
  Object.assign(pl, patch, { id: pl.id, subs: pl.subs })
  pl.price = Math.max(0, pl.price); pl.tokPerDay = Math.max(100, pl.tokPerDay)
  return { ok: true, value: undefined }
}
export function addPlan(w: World, productId: string): R {
  const p = w.products.find((x) => x.id === productId); if (!p) return { ok: false, error: 'No product' }
  if (p.plans.length >= 6) return { ok: false, error: 'Six plans is already a pricing page nobody reads' }
  const c = CATEGORIES[p.category]
  p.plans.push({ id: newId(w, 'pl'), name: `Plan ${p.plans.length + 1}`, price: 8, tokPerDay: c.baseTokPerDay * 4, seatsMin: 1, ads: true, priority: false, subs: 0 })
  return { ok: true, value: undefined }
}
export function removePlan(w: World, productId: string, planId: string): R {
  const p = w.products.find((x) => x.id === productId); if (!p) return { ok: false, error: 'No product' }
  const pl = p.plans.find((x) => x.id === planId); if (!pl) return { ok: false, error: 'No plan' }
  if (pl.price === 0) p.freeUsers += pl.subs
  p.plans = p.plans.filter((x) => x !== pl)
  return { ok: true, value: undefined }
}
export function setMarketing(w: World, productId: string, perDay: number): R {
  const p = w.products.find((x) => x.id === productId); if (!p) return { ok: false, error: 'No product' }
  p.marketingPerDay = Math.max(0, perDay); return { ok: true, value: undefined }
}

const CUSTOMERS = ['Prompt & Circumstance', 'Hallucination Labs', 'Vibe Coders Inc', 'TokenTorch', 'Agentic Agents LLC', 'RAG-Time Systems', 'Embedding Ventures', 'LangChained', 'Slop Factory', 'YC W25 #4,117', 'ZeroShot Bank', 'Copilot-for-Copilots', 'GPT Wrapper Wrapper', 'NotABot Support', 'AutoGPT-but-works']

/** One simulated day for every product. */
export function dailyStore(w: World): void {
  const years = w.tick / HOURS_PER_YEAR
  for (const m of w.models) m.reservedTokPerDay = 0
  for (const p of w.products) {
    const m = w.models.find((x) => x.id === p.modelId)
    if (!m) continue
    const bestRival = bestRivalElo(w, m.modality ?? 'text') // a product is judged against its own field
    const c = CATEGORIES[p.category]
    const tam = c.tam0 * Math.pow(c.tamGrowth, years) * Math.min(0.85, c.penetration0 * Math.pow(1.6, Math.min(years, 6)))
    // appeal vs rivals: quality, free generosity, brand, hype, marketing, frustration
    const free = p.plans.find((x) => x.price === 0)
    const generosity = free ? Math.log(free.tokPerDay / c.baseTokPerDay) * 0.35 : -0.6
    const ads = free?.ads ? -0.25 : 0
    const mkt = Math.log1p(p.marketingPerDay / 50_000) * 0.35
    const u = (m.elo - bestRival) / 90 + generosity + ads + mkt + Math.log1p(m.hype ?? 0) + webQuality(w) * 0.3 + (w.reputation - 50) / 80 - p.frustration * 1.5
    const share = Math.exp(u) / (Math.exp(u) + c.rivalPull)
    const target = tam * share
    const total = p.freeUsers + p.plans.reduce((a, x) => a + x.subs, 0)
    const k = 0.012 + Math.min(0.05, p.marketingPerDay / 5e6)
    let churned = 0
    if (p.category === 'api') {
      const api = p.api!
      api.devs += (target - api.devs) * k * (1 + Math.log1p(api.signupCredit / 5) * 0.4)
      api.devs = Math.max(0, api.devs)
      const creditCost = Math.max(0, (target - api.devs) * k) * api.signupCredit * 0.4
      w.cash -= creditCost; w.today.opex += creditCost
      // keys: a visible sample of the biggest customers
      if (api.keys.length < 14 && rnd(w) < 0.3 && api.devs > 50) api.keys.push({ id: 'sk-' + Math.floor(rnd(w) * 1e12).toString(36), owner: pick(w, CUSTOMERS), tier: 0, tokPerDay: 0, spend: 0, created: w.tick })
      for (const key of api.keys) {
        key.tokPerDay = Math.max(1000, key.tokPerDay * (1 + (rnd(w) - 0.42) * 0.12) + rnd(w) * 2e5)
        const cap = api.tiers[key.tier]?.tpm ?? 1e9
        const used = Math.min(key.tokPerDay, cap * 60 * 24 * 0.02)
        key.spend += (used / 1e6) * m.priceMtok
        while (key.tier < api.tiers.length - 1 && key.spend >= api.tiers[key.tier + 1].minSpend) key.tier++
      }
      const tokens = api.devs * c.baseTokPerDay * 0.05
      p.history.push({ day: Math.floor(w.tick / 24), users: api.devs, paid: api.keys.length, mrr: m.revenue, tokens, served: tokens, churned: 0, revenue: 0 })
      if (p.history.length > 180) p.history.shift()
      continue
    }
    // grow or shrink the user base towards the target
    // you can't sign up for a service that is down: acquisition scales with last served fraction
    const delta = (target - total) * k * (target > total ? Math.max(0.03, p.servedFrac) ** 2 : 1)
    if (delta > 0) { if (free) p.freeUsers += delta; else { const cheapest = [...p.plans].sort((a, b) => a.price - b.price)[0]; if (cheapest) cheapest.subs += delta * 0.3 } }
    else p.freeUsers = Math.max(0, p.freeUsers + delta)
    const mkSpend = p.marketingPerDay; w.cash -= mkSpend; w.today.opex += mkSpend
    // conversion: logit choice between staying free and each paid plan (inertia calibrated to ~5% paying)
    const paid = p.plans.filter((x) => x.price > 0)
    const freeTok = free?.tokPerDay ?? c.baseTokPerDay * 0.5
    const utilities = paid.map((pl) => 0.55 * Math.log(pl.tokPerDay / freeTok) + (pl.priority ? 0.3 : 0) - (pl.ads ? 0.2 : 0) - pl.price / (c.wtp * (c.seatBased ? 1 : 1.1)) * 1.1 + (m.elo - bestRival) / 200)
    const inertia = c.seatBased ? 0.6 : 4.0 // calibrated so a competitive $20 plan lands near the ~5% paid share seen in practice
    const denom = Math.exp(inertia) + utilities.reduce((a, x) => a + Math.exp(x), 0)
    const pool = p.freeUsers + paid.reduce((a, x) => a + x.subs, 0)
    paid.forEach((pl, i) => {
      const want = c.seatBased ? Math.max(pool * Math.exp(utilities[i]) / denom, 0) : pool * Math.exp(utilities[i]) / denom
      const move = (want - pl.subs) * 0.03
      if (move > 0) { const take = Math.min(move, p.freeUsers); pl.subs += take; p.freeUsers -= take } else { pl.subs += move; p.freeUsers -= move * 0.6; churned -= move * 0.4 }
    })
    // usage and capacity: product traffic gets priority on the backing model's deployments
    let demand = 0
    for (const pl of p.plans) demand += pl.subs * Math.min(pl.tokPerDay, c.baseTokPerDay * (pl.price > 0 ? 6 : 1.4)) * (c.seatBased ? Math.max(1, pl.seatsMin / 20) : 1)
    if (free) demand += p.freeUsers * Math.min(free.tokPerDay, c.baseTokPerDay * 1.4)
    const avail = Math.max(0, m.capacityTokPerDay - (m.reservedTokPerDay ?? 0))
    const served = Math.min(demand, avail)
    m.reservedTokPerDay = (m.reservedTokPerDay ?? 0) + served
    p.servedFrac = demand > 0 ? served / demand : 1
    // frustration: rate-limited users (tight plan caps) and unserved traffic
    const capPain = p.plans.reduce((a, pl) => a + (pl.subs * Math.max(0, c.baseTokPerDay * (pl.price > 0 ? 6 : 1.4) / pl.tokPerDay - 1)), 0) / Math.max(1, total)
    p.frustration += ((1 - p.servedFrac) * 0.8 + Math.min(0.5, capPain * 0.15) - p.frustration) * 0.1
    // churn
    const churnDaily = (c.churnMonthly / 30) * (1 + p.frustration * 3) * (m.elo < bestRival - 100 ? 1.4 : 1)
    for (const pl of paid) { const ch = pl.subs * churnDaily; pl.subs -= ch; churned += ch * 0.5; p.freeUsers += ch * 0.5 }
    const freeChurn = p.freeUsers * churnDaily * 1.5; p.freeUsers -= freeChurn; churned += freeChurn
    // outages: people leave fast when the product does not answer
    const outage = (1 - p.servedFrac) ** 2 * 0.05
    if (outage > 0) { for (const pl of p.plans) { const ch = pl.subs * outage; pl.subs -= ch; churned += ch } const fc = p.freeUsers * outage * 1.5; p.freeUsers -= fc; churned += fc }
    // money
    let rev = 0
    for (const pl of paid) rev += pl.subs * pl.price / 30 * (c.seatBased ? 1 : 1)
    if (free?.ads) rev += p.freeUsers * 0.6 / 30
    const fees = rev * 0.03 + paid.reduce((a, pl) => a + pl.subs, 0) * 0.1 / 30
    w.cash += rev - fees; w.today.revenue += rev; w.today.opex += fees; w.today.inferRev += rev
    const paidUsers = paid.reduce((a, pl) => a + pl.subs, 0)
    p.history.push({ day: Math.floor(w.tick / 24), users: p.freeUsers + paidUsers, paid: paidUsers, mrr: paid.reduce((a, pl) => a + pl.subs * pl.price, 0), tokens: demand, served, churned, revenue: rev })
    if (p.history.length > 180) p.history.shift()
    if (p.servedFrac < 0.6 && rnd(w) < 0.05) pushNews(w, 'bad', `${p.name} is down for many users`, '"We are experiencing unprecedented demand." Translation: buy more GPUs.', 'incident', 1)
  }
}
/** Bonus applied to API market share when you run a developer platform with generous credits/limits. */
export function apiPlatformBonus(w: World, modelId: string): number {
  const p = w.products.find((x) => x.category === 'api' && x.modelId === modelId)
  if (!p || !p.api) return 0
  return 0.15 + Math.log1p(p.api.signupCredit / 5) * 0.08 + Math.log10(Math.max(1, p.api.tiers.at(-1)!.tpm / 150_000_000) * 10) * 0.05
}

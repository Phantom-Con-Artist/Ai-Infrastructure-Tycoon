import { ADVISORS } from './data/lore'
import { GPUS_PER_SERVER, gpuCatalog, region, residual } from './data/hardware'
import { tech, techCost, techDays } from './data/tech'
import { eloFromLoss, goodput, modelLoss, serveMemoryGB, serveTokPerSecPerServer, trainingMfu } from './ai'
import { stepSite } from './facility'
import { rollDailyEvents } from './events'
import { dailySilicon } from './chips'
import { webQuality, weeklyDigest } from './web'
import { dailyStore } from './store'
import { dailyPeople, foundingTeam, labBoost, makeCandidate, payrollPerDay, recomputeStaff } from './people'
import { checkAchievements, dailyCorporate, initRivals, parodyPost } from './corporate'
import { RENTAL_KIND, dailyMarket, initCompetitors, marketDemandTokensPerDay, modelShare, rentalPrice, rentalUtilisation, serverMarketPrice } from './market'
import { poisson, rnd } from './rng'
import { HOURS_PER_YEAR, type DayLedger, type World } from './types'
import { CLOUD, cloudRate } from './cloud'
import { clamp, findSite, gpu, newId, pushNews, techLevel, techSum, worstFabric, yearOf } from './util'
import { EVALS, RIVAL_MIX, archLossDelta, evalScore } from './models'

import { makeRules, type Rules } from './rules'
import { SYSTEMS } from './types'
export const WORLD_VERSION = 9
const emptyDay = (day: number): DayLedger => ({ day, revenue: 0, powerCost: 0, staffCost: 0, interest: 0, opex: 0, capex: 0, cash: 0, itMw: 0, gpus: 0, rentalRev: 0, inferRev: 0, contractRev: 0 })

export function createWorld(seed = 1337, company = 'Untitled AI Infra Inc.', ceo = 'You', advisor = 'cfo', logo = { glyph: 'hex', color: 'oklch(0.6 0.17 155)' }, rules: Partial<Rules> = {}): World {
  const r = makeRules(rules)
  const w: World = {
    version: WORLD_VERSION, tick: 0, rng: seed | 0, nextId: 1,
    company, ceo, advisor, logo,
    cash: r.startCash, loans: [], reputation: 50, esg: 50, gameOver: false, negCashDays: 0,
    sites: [], rentals: [], deployments: [], runs: [], models: [], contracts: [],
    market: { boom: 1, supplyTight: 0.5, tokensPerDay: 1.5e12, priceDrift: 1, gpuPressure: {} },
    competitors: initCompetitors(),
    research: { done: [], levels: {}, progressUsd: 0, budgetPerDay: 0 },
    staff: { engineers: 3, researchers: 1, ops: 2, sales: 1 },
    events: [], news: [{ tick: 0, kind: 'info', category: 'mine', importance: 1, title: `${company} is founded`, body: `${ADVISORS.find((a) => a.id === advisor)?.name ?? 'Your advisor'} slides a term sheet across the table. ${r.startCash >= 1e9 ? 'A sandbox-sized cheque.' : '$40M seed.'} No pressure.` }],
    ledger: [], today: emptyDay(0), quarterProfit: 0, totalTco2: 0, totalWaterL: 0, achievements: [],
    silicon: { designs: [], fab: null, chipStock: {} }, customGpus: [], datasets: {}, rivals: initRivals(), founderStake: 0.6, web: { domains: [] }, products: [], people: [], candidates: [], labs: [],
    rules: r, editions: [], inbox: [], goalsDone: [],
    autopilot: Object.fromEntries(SYSTEMS.map((k) => [k, { on: false, policy: {}, handsOffUntil: 0 }])) as World['autopilot'],
    managerLog: Object.fromEntries(SYSTEMS.map((k) => [k, []])) as unknown as World['managerLog']
  }
  w.people = foundingTeam(w)
  for (let i = 0; i < 8; i++) w.candidates.push(makeCandidate(w))
  recomputeStaff(w)
  return w
}

export interface FleetStat { total: number; healthy: number; throttle: number; busy: number }
export const statKey = (siteId: string, gpuId: string): string => siteId + '|' + gpuId

export function fleetStats(w: World): Map<string, FleetStat> {
  const m = new Map<string, FleetStat>()
  for (const s of w.sites) {
    const local: Record<string, FleetStat> = {}
    for (const h of s.halls) {
      for (const r of h.racks) {
        if (!r.gpuId) continue
        const st = local[r.gpuId] ??= { total: 0, healthy: 0, throttle: 0, busy: 0 }
        const healthy = h.online && r.powered ? r.servers - r.failed : 0
        st.total += r.servers
        st.healthy += healthy
        st.throttle += healthy * h.throttle * r.throttle
      }
    }
    for (const id in local) m.set(statKey(s.id, id), local[id])
  }
  for (const st of m.values()) st.throttle = st.healthy > 0 ? st.throttle / st.healthy : 0
  return m
}

/** Maintenance, rental income, inference income and training progress for this hour. */
function runWorkloads(w: World): Record<string, Record<string, number>> {
  const stats = fleetStats(w)
  const busyAcc: Record<string, number> = {}
  const addBusy = (k: string, servers: number, util: number): void => { busyAcc[k] = (busyAcc[k] ?? 0) + servers * util }
  const frac = (k: string): number => { const s = stats.get(k); return s && s.total > 0 ? s.healthy / s.total : 0 }

  // Rentals
  for (const r of w.rentals) {
    const k = statKey(r.siteId, r.gpuId)
    const st = stats.get(k)
    if (!st) continue
    const g = gpu(w, r.gpuId)
    const eff = r.servers * frac(k)
    const kind = RENTAL_KIND[r.kind ?? 'ondemand']
    const util = kind.util ?? rentalUtilisation(w, g, r.priceMult)
    const rev = eff * st.throttle * GPUS_PER_SERVER * rentalPrice(w, g) * (r.kind && r.kind !== 'ondemand' ? kind.price : r.priceMult) * util
    addBusy(k, r.servers, util * 0.85)
    w.cash += rev; w.today.revenue += rev; w.today.rentalRev += rev
  }

  // Inference
  const shares = modelShare(w)
  const regionMult = (siteIds: string[]): number => {
    if (!siteIds.length) return 1
    return siteIds.reduce((a, id) => a + (id === CLOUD ? 1 : region(findSite(w, id).regionId).demandMult), 0) / siteIds.length
  }
  const demandPerHour = marketDemandTokensPerDay(w) / 24
  for (const m of w.models) {
    if (m.owner !== 'player' || !m.releasedByPlayer) continue
    const deps = w.deployments.filter((d) => d.modelId === m.id)
    let capPerHour = 0
    for (const d of deps) {
      const k = statKey(d.siteId, d.gpuId)
      const cloud = d.siteId === CLOUD
      const st = cloud ? { healthy: d.servers, total: d.servers, throttle: 1, busy: 1 } : stats.get(k)
      if (!st) continue
      const g = gpu(w, d.gpuId)
      const eff = cloud ? d.servers : d.servers * frac(k)
      if (cloud) { const bill = cloudRate(w, g) * d.servers * GPUS_PER_SERVER; w.cash -= bill; w.today.opex += bill }
      if (serveMemoryGB(m.paramsB) > 0.8 * eff * GPUS_PER_SERVER * g.memGB) continue
      capPerHour += eff * st.throttle * serveTokPerSecPerServer(w, g, m.activeParamsB) * 3600
    }
    const share = shares.get(m.id) ?? 0
    m.share = share
    const demand = demandPerHour * share * regionMult(deps.map((d) => d.siteId))
    if (m.subsidiary) capPerHour = demand
    const totalCap = capPerHour
    capPerHour = Math.max(0, capPerHour - (m.reservedTokPerDay ?? 0) / 24) // consumer products are served first
    const served = Math.min(demand, capPerHour)
    const rev = (served / 1e6) * m.priceMtok
    m.demandTokPerDay = demand * 24
    m.capacityTokPerDay = totalCap * 24
    m.tokensServed += served
    m.revenue += rev
    w.cash += rev; w.today.revenue += rev; w.today.inferRev += rev
    for (const d of deps) addBusy(statKey(d.siteId, d.gpuId), d.servers, totalCap > 0 ? Math.min(1, 0.25 + 0.75 * (served + (totalCap - capPerHour)) / totalCap) : 0)
    if (demand > 0 && served < demand * 0.8) w.reputation = clamp(w.reputation - 0.002, 0, 100)
    else if (served > 0) w.reputation = clamp(w.reputation + 0.001, 0, 100)
  }

  // Training
  for (const run of w.runs) {
    if (run.status !== 'running') continue
    const k = statKey(run.siteId, run.gpuId)
    const cloud = run.siteId === CLOUD
    const st = cloud ? { healthy: run.servers, total: run.servers, throttle: 1, busy: 1 } : stats.get(k)
    const site = w.sites.find((s) => s.id === run.siteId)
    if (!st || (!site && !cloud)) continue
    const g = gpu(w, run.gpuId)
    const eff = cloud ? run.servers : run.servers * frac(k)
    if (cloud) { const bill = cloudRate(w, g) * run.servers * GPUS_PER_SERVER; w.cash -= bill; w.today.opex += bill; run.spentUsd += bill }
    run.mfu = trainingMfu(w, run.servers, cloud ? 'ib400' : worstFabric(site!, run.gpuId))
    const flops = eff * GPUS_PER_SERVER * g.tflops * 1e12 * 3600 * run.mfu * goodput(w, run.servers, g) * st.throttle
    run.flopsDone += flops
    run.etaH = flops > 0 ? (run.flopsTotal - run.flopsDone) / flops : Infinity
    run.spentUsd += run.servers * (serverMarketPrice(w, g) / (4 * HOURS_PER_YEAR))
    addBusy(k, run.servers, 1)
    if (rnd(w) < 0.00004 * Math.sqrt(run.paramsB) && run.flopsDone > 0) {
      const lost = run.flopsDone * (0.01 + rnd(w) * 0.03)
      run.flopsDone -= lost; run.restarts++
      if (run.restarts % 3 === 1) pushNews(w, 'bad', `Loss spike in ${run.name}`, `Rolled back to the last checkpoint. ${(lost / 1e21).toFixed(2)} ZFLOP evaporated. The grad-norm graph is not a vibe.`)
    }
    if (run.flopsDone >= run.flopsTotal) finishRun(w, run.id)
  }

  const busy: Record<string, Record<string, number>> = {}
  for (const [k, st] of stats) {
    const [siteId, gpuId] = k.split('|')
    ;(busy[siteId] ??= {})[gpuId] = st.healthy > 0 ? clamp((busyAcc[k] ?? 0) / st.healthy, 0, 1) : 0
    st.busy = busy[siteId][gpuId]
  }
  return busy
}

export function finishRun(w: World, runId: string): void {
  const run = w.runs.find((r) => r.id === runId)
  if (!run || run.status === 'done') return
  run.status = 'done'
  run.flopsDone = run.flopsTotal
  if (run.owner === 'player') {
    const loss = modelLoss(run.paramsB, run.activeParamsB, run.tokensT, run.moe, run.dataQuality) + (run.arch ? archLossDelta(run.arch) : 0)
    let elo = eloFromLoss(loss)
    if (w.research.done.includes('distill') && run.paramsB <= 70) elo += 60
    elo += techSum(w, 'elo')
    w.models.push({
      id: newId(w, 'm'), name: run.name, owner: 'player', paramsB: run.paramsB, activeParamsB: run.activeParamsB, tokensT: run.tokensT,
      loss, elo, releaseTick: w.tick, priceMtok: 0, posttrain: 0, tokensServed: 0, revenue: 0, share: 0, demandTokPerDay: 0, capacityTokPerDay: 0, releasedByPlayer: false,
      arch: run.arch, mix: run.mix, evals: Object.fromEntries(EVALS.map((e) => [e.id, evalScore(e, elo, run.mix ?? RIVAL_MIX, techLevel(w, 'reasoning'))]))
    })
    pushNews(w, 'good', `${run.name} finished training`, `Final loss ${loss.toFixed(3)} → Elo ${Math.round(elo)}. Post-train it and ship it before a rival does.`)
  } else {
    const c = w.contracts.find((x) => x.id === run.owner)
    if (c) {
      c.done = true
      const late = Math.max(0, w.tick - c.deadlineTick) / 24
      const pay = c.payUsd * clamp(1 - late * 0.05, 0.2, 1)
      w.cash += pay; w.today.revenue += pay; w.today.contractRev += pay
      w.reputation = clamp(w.reputation + (late > 0 ? 0.5 : 2), 0, 100)
      pushNews(w, 'good', `${c.customer} pays $${(pay / 1e6).toFixed(2)}M`, late > 0 ? `Delivered ${late.toFixed(1)} days late; penalty applied.` : `Delivered on time. They want to talk about "a strategic partnership".`)
    }
  }
}

function failures(w: World): void {
  for (const s of w.sites) {
    for (const h of s.halls) {
      if (!h.online) continue
      const hazard = clamp(Math.pow(2, (h.tempC - 27) / 10), 1, 8)
      let lastId = '', g = null as ReturnType<typeof gpu> | null
      for (const r of h.racks) {
        if (!r.gpuId || r.servers === 0) continue
        if (r.gpuId !== lastId) { g = gpu(w, r.gpuId); lastId = r.gpuId }
        const healthy = r.servers - r.failed
        const local = r.cooled ? (r.throttle < 0.9 ? 2 : 1) : 3
        const k = poisson(w, (healthy * GPUS_PER_SERVER * hazard * local) / g!.mtbfH)
        if (k > 0) {
          r.failed = Math.min(r.servers, r.failed + k)
        }
        if (r.failed > 0) {
          const spares = s.stock[r.gpuId] ?? 0
          if (spares > 0) { const swap = Math.min(spares, r.failed); r.failed -= swap; s.stock[r.gpuId] = spares - swap }
          const repairH = 48 * (w.advisor === 'ops' ? 0.85 : 1) * (1 - Math.min(0.8, techSum(w, 'repair'))) / (1 + w.staff.ops * 0.04)
          const fixed = Math.min(r.failed, poisson(w, r.failed / repairH))
          r.failed -= fixed
        }
      }
    }
  }
}

export function fleetValue(w: World): number {
  let v = 0
  const y = yearOf(w.tick)
  for (const s of w.sites) {
    for (const h of s.halls) for (const r of h.racks) {
      if (!r.gpuId) continue
      const g = gpu(w, r.gpuId)
      v += r.servers * serverMarketPrice(w, g) * residual(Math.max(0, y - g.year) * 0.5)
    }
    for (const [id, n] of Object.entries(s.stock)) v += n * serverMarketPrice(w, gpu(w, id)) * 0.7
  }
  return v
}
export function debt(w: World): number { return w.loans.reduce((a, l) => a + l.principal, 0) }
export function trailingRevenue(w: World, days = 90): number {
  const l = w.ledger.slice(-days)
  if (!l.length) return w.today.revenue * 365
  return (l.reduce((a, d) => a + d.revenue, 0) / l.length) * 365
}
export const valuation = (w: World): number => Math.max(0, 8 * trailingRevenue(w) + fleetValue(w) + w.cash - debt(w) + (w.rivals ?? []).reduce((a, r) => a + (r.owned ? r.valuation : 0), 0))
export function creditLimit(w: World): number { return Math.max(20_000_000, 2.5 * trailingRevenue(w) + 0.5 * fleetValue(w)) }
export const totalItMw = (w: World): number => w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + h.itKw, 0), 0) / 1000
export const SALARY: Record<keyof World['staff'], number> = { engineers: 230_000, researchers: 320_000, ops: 110_000, sales: 160_000 }

function dailyTick(w: World): void {
  const t = w.today
  const t2 = t
  // staff, loans, site fixed costs
  const payroll = payrollPerDay(w)
  w.cash -= payroll; t.staffCost += payroll
  let interest = 0
  for (const l of w.loans) interest += (l.principal * l.rate * (w.advisor === 'cfo' ? 0.92 : 1)) / 365
  w.cash -= interest; t.interest += interest
  const fleet = fleetValue(w)
  const maint = (fleet * 0.03) / 365 + w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + (w.tick >= h.readyTick ? h.w * h.d * 4 + h.equipment.length * 60 : 0), 0), 0)
  w.cash -= maint; t.opex += maint
  // research
  const rs = w.research
  if (rs.current) {
    const t = tech(rs.current)!
    const lv = rs.levels[t.id] ?? 0
    const cost = techCost(t, lv), days = techDays(t, lv)
    const speed = (1 + Math.sqrt(w.staff.researchers) * 0.25) * (w.advisor === 'res' ? 1.1 : 1) * labBoost(w, t.branch)
    const perDay = Math.min((cost / days) * speed, Math.max(0, w.cash), cost - rs.progressUsd)
    rs.progressUsd += perDay; w.cash -= perDay; t2.opex += perDay
    if (rs.progressUsd >= cost - 1) {
      rs.levels[t.id] = lv + 1
      if (!rs.done.includes(t.id)) rs.done.push(t.id)
      rs.current = undefined; rs.progressUsd = 0
      pushNews(w, 'good', `Research complete: ${t.name}${t.repeatable ? ` ${roman(lv + 1)}` : ''}`, t.blurb)
    }
  }
  // roll up
  t.cash = w.cash; t.itMw = totalItMw(w)
  t.gpus = w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + h.racks.reduce((c, r) => c + r.servers, 0), 0), 0) * GPUS_PER_SERVER
  const deprec = fleet / (5 * 365)
  w.quarterProfit += t.revenue - t.powerCost - t.staffCost - t.interest - t.opex - deprec
  w.ledger.push(t)
  if (w.ledger.length > 2000) w.ledger.shift()
  w.today = emptyDay(Math.floor(w.tick / 24))
  if (Math.floor(w.tick / 24) % 91 === 0 && w.tick > 0) {
    const tax = Math.max(0, w.quarterProfit) * 0.21
    if (tax > 0) { w.cash -= tax; pushNews(w, 'info', 'Quarterly taxes paid', `$${(tax / 1e6).toFixed(2)}M to the taxman on $${(w.quarterProfit / 1e6).toFixed(1)}M profit.`) }
    w.quarterProfit = 0
  }
  dailyMarket(w)
  dailySilicon(w)
  dailyCorporate(w)
  dailyStore(w)
  dailyPeople(w)
  checkAchievements(w)
  if (Math.floor(w.tick / 24) % 7 === 0 && w.tick > 0) { const d = weeklyDigest(w); pushNews(w, 'event', d.title, d.lines.slice(0, 2).join(' ')) }
  if (webQuality(w) > 0) w.reputation = clamp(w.reputation + webQuality(w) * 0.01, 0, 100)
  if (Math.floor(w.tick / 24) % 7 === 3 && rnd(w) < 0.35) pushNews(w, 'info', 'Chirper is talking', parodyPost(w))
  rollDailyEvents(w)
  // expire contracts whose runs never started or are late
  for (const c of w.contracts) if (c.accepted && !c.done && w.tick > c.deadlineTick + 24 * 20) {
    c.done = true
    const run = w.runs.find((r) => r.id === c.runId)
    if (run && run.status === 'running') run.status = 'failed'
    w.reputation = clamp(w.reputation - 6, 0, 100)
    pushNews(w, 'bad', `${c.customer} cancels ${c.modelName}`, 'Deadline blown by more than 20 days. They are "exploring alternatives". The alternatives are Amazoon.')
  }
  // solvency
  if (w.cash < 0) {
    w.negCashDays++
    if (w.negCashDays === 1) pushNews(w, 'bad', 'Cash balance negative', 'Borrow, sell servers or cut costs. The bank gives you 30 days.')
    if (w.negCashDays >= 30) { w.gameOver = true; pushNews(w, 'bad', 'Bankruptcy', `${w.company} is liquidated. A rival buys the racks for 11 cents on the dollar.`) }
  } else w.negCashDays = 0
}

/** Advance the simulation by exactly one hour. */
export function step(w: World): void {
  if (w.gameOver) return
  w.tick++
  const busy = runWorkloads(w)
  for (const s of w.sites) {
    // deliveries
    s.orders = s.orders.filter((o) => {
      if (w.tick >= o.arriveTick) { s.stock[o.gpuId] = (s.stock[o.gpuId] ?? 0) + o.servers; pushNews(w, 'info', `Delivery at ${s.name}`, `${o.servers} × ${gpu(w, o.gpuId).name} servers have arrived on pallets. Install them before someone trips on them.`); return false }
      return true
    })
    const r = stepSite(w, s, busy[s.id] ?? {})
    w.cash -= r.cost; w.today.powerCost += r.cost
    w.totalTco2 += r.carbonKg / 1000; w.totalWaterL += r.water
  }
  failures(w)
  if (w.tick % 24 === 0) dailyTick(w)
}

export function stepMany(w: World, hours: number): void { for (let i = 0; i < hours; i++) step(w) }
export function availableGpus(w: World): ReturnType<typeof gpuCatalog> { return gpuCatalog(yearOf(w.tick)) }

export const roman = (n: number): string => { const m: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let r = ''; for (const [v, k] of m) while (n >= v) { r += k; n -= v } return r }

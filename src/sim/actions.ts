import { ADVISORS, AI_NAME_PARTS } from './data/lore'
import { COOLING, FABRICS, GENERATORS, GPUS_PER_SERVER, REGIONS, TECHS, gpuCatalog, region, serverPeakKw, residual, type CoolingType, type FabricType, type GenKind } from './data/hardware'
import { eloFromLoss, referencePrice, serveMemoryGB, trainFlops, trainMemoryGB } from './ai'
import { creditLimit, debt, finishRun, statKey } from './world'
import { EQUIP, HALL_SIZES, RACK_COST, hallShellCost, type EquipKind, type HallSize } from './data/equipment'
import { canPlace, footprint, itemAt, relayout, type Rot } from './layout'
import { leadDays, serverMarketPrice } from './market'
import { pick } from './rng'
import { HOURS_PER_YEAR, type Equip, type Hall, type Rack, type Site, type World } from './types'
import {
  committed, coolingUnlocked, fabricUnlocked, findSite, gpu, hallServers, hasTech, newId, pushNews, siteHealthy, spend, techSum, yearOf
} from './util'

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string }
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const fail = (error: string): Result<never> => ({ ok: false, error })

export function randomModelName(w: World): string { return pick(w, AI_NAME_PARTS.a) + pick(w, AI_NAME_PARTS.b) }

const lockHall = (w: World, hallId: string): { site: Site; hall: Hall } | null => {
  for (const s of w.sites) { const h = s.halls.find((x) => x.id === hallId); if (h) return { site: s, hall: h } }
  void w
  return null
}

// ---------------------------------------------------------------- sites & halls
export function buildSite(w: World, regionId: string, name?: string): Result<Site> {
  const r = REGIONS.find((x) => x.id === regionId)
  if (!r) return fail('Unknown region')
  if (w.cash < r.siteCostUsd) return fail('Not enough cash for land & permits')
  spend(w, r.siteCostUsd)
  const site: Site = {
    id: newId(w, 's'), name: name ?? `${r.name.split(',')[0]} Campus ${w.sites.filter((s) => s.regionId === regionId).length + 1}`, regionId,
    utilityMw: 2, pendingUtility: [], halls: [], gens: [], stock: {}, orders: [],
    ambientC: r.meanC, priceMwh: r.basePriceMwh, windCf: r.windCf, spotNoise: 0, gridUp: true,
    demandMw: 0, supplyMw: 0, gridMw: 0, powerFactor: 1, costPerHour: 0, carbonKgPerHour: 0
  }
  w.sites.push(site)
  pushNews(w, 'info', `Broke ground: ${site.name}`, `${r.blurb} Initial 2 MW utility feed energised.`)
  return ok(site)
}
export const siteGenMw = (s: Site): number => s.gens.filter((g) => g.kind === 'gas' || g.kind === 'nuclear' || g.kind === 'geothermal').reduce((a, g) => a + g.mw, 0)
export const siteProvisionedKw = (s: Site): number => s.halls.reduce((a, h) => a + h.powerKw, 0)
export const siteSupplyCapKw = (s: Site): number => (s.utilityMw + siteGenMw(s)) * 1000

export interface HallSpec { size: HallSize; cooling: CoolingType; fabric: FabricType; name?: string }
export function hallCost(spec: HallSpec): number {
  const z = HALL_SIZES[spec.size]
  return hallShellCost(z.w, z.d) + (spec.cooling === 'air' ? 0 : z.w * z.d * 3_000)
}
export function buildHall(w: World, siteId: string, spec: HallSpec): Result<Hall> {
  const s = findSite(w, siteId)
  if (!coolingUnlocked(w, spec.cooling)) return fail('Cooling technology not researched')
  if (!fabricUnlocked(w, spec.fabric)) return fail('Fabric technology not researched')
  const z = HALL_SIZES[spec.size]
  if (!z) return fail('Unknown hall size')
  const cost = hallCost(spec)
  if (w.cash < cost) return fail(`Need ${(cost / 1e6).toFixed(1)}M`)
  spend(w, cost)
  const build = Math.round((60 + z.w * z.d * 0.08) * (1 - (hasTech(w, 'prefab') ? 0.4 : 0)))
  const h: Hall = {
    id: newId(w, 'h'), name: spec.name ?? `Hall ${String.fromCharCode(65 + s.halls.length)}`, w: z.w, d: z.d, racks: [], equipment: [],
    cooling: spec.cooling, coolKw: 0, powerKw: 0, fabric: spec.fabric, upsKwh: 0, upsSoc: 0, readyTick: w.tick + build * 24,
    tempC: 22, throttle: 1, itKw: 0, coolPowerKw: 0, pue: 0, online: false, waterL: 0
  }
  s.halls.push(h)
  pushNews(w, 'info', `${h.name} under construction`, `${z.name}, ${COOLING[spec.cooling].name}. Concrete cures in ~${build} days.`)
  return ok(h)
}
const liquidOk = (h: Hall): boolean => h.cooling === 'dlc' || h.cooling === 'immersion'
export function placeEquipment(w: World, hallId: string, kind: EquipKind, x: number, y: number, rot: Rot = 0): Result<Equip> {
  const f = lockHall(w, hallId); if (!f) return fail('No such hall')
  const spec = EQUIP[kind]
  if (spec.needsTech && !hasTech(w, spec.needsTech)) return fail(`${spec.name} needs research first`)
  if (kind === 'cdu' && !liquidOk(f.hall)) return fail('CDUs need a liquid-cooled hall (retrofit to DLC or immersion)')
  const err = canPlace(f.hall, kind, x, y, rot); if (err) return fail(err)
  if (kind === 'pdu' && siteProvisionedKw(f.site) + spec.kw > siteSupplyCapKw(f.site)) return fail('Site utility + generation cannot feed another PDU. Buy more utility capacity.')
  if (w.cash < spec.cost) return fail(`Need ${(spec.cost / 1e6).toFixed(2)}M`)
  spend(w, spec.cost)
  const e: Equip = { id: newId(w, 'e'), kind, x, y, rot, load: 0 }
  f.hall.equipment.push(e)
  relayout(f.hall, liquidOk(f.hall))
  return ok(e)
}
export function placeRack(w: World, hallId: string, x: number, y: number, rot: Rot = 0): Result<Rack> {
  const f = lockHall(w, hallId); if (!f) return fail('No such hall')
  const err = canPlace(f.hall, 'rack', x, y, rot); if (err) return fail(err)
  if (w.cash < RACK_COST) return fail('Not enough cash')
  spend(w, RACK_COST)
  const r: Rack = { id: newId(w, 'k'), x, y, rot, gpuId: '', servers: 0, failed: 0, powered: false, cooled: false, throttle: 1, kw: 0 }
  f.hall.racks.push(r)
  relayout(f.hall, liquidOk(f.hall))
  return ok(r)
}
/** Remove whatever sits on a tile. Racks must be empty; equipment refunds 30%. */
export function removeAt(w: World, hallId: string, x: number, y: number): Result {
  const f = lockHall(w, hallId); if (!f) return fail('No such hall')
  const it = itemAt(f.hall, x, y); if (!it) return fail('Nothing here')
  if (it.rack) {
    if (it.rack.servers > 0) return fail('Pull the servers out first')
    f.hall.racks = f.hall.racks.filter((r) => r !== it.rack)
    w.cash += RACK_COST * 0.3
  } else if (it.equip) {
    f.hall.equipment = f.hall.equipment.filter((e) => e !== it.equip)
    w.cash += EQUIP[it.equip.kind].cost * 0.3
  }
  relayout(f.hall, liquidOk(f.hall))
  return ok(undefined)
}
/**
 * Fill a hall with a sensible starter pattern: a service spine every 10 columns (PDU, then cooler, repeating)
 * and rack rows with an aisle between each pair. Stops when cash runs out or the hall is full.
 */
export function autoLayout(w: World, hallId: string, maxRacks = 1e9): Result<{ racks: number; equipment: number }> {
  const f = lockHall(w, hallId); if (!f) return fail('No such hall')
  const h = f.hall
  const cooler: EquipKind = liquidOk(h) && hasTech(w, 'dlc') ? 'cdu' : 'crah'
  let racks = 0, eq = 0
  for (let x = 0; x < h.w; x += 10) {
    for (let y = 0; y < h.d; ) {
      if (canPlace(h, 'pdu', x, y, 0) === null && placeEquipment(w, h.id, 'pdu', x, y, 0).ok) eq++
      y += 1
      const fp = footprint(cooler, 0)
      if (y + fp.d <= h.d && canPlace(h, cooler, x, y, 0) === null && placeEquipment(w, h.id, cooler, x, y, 0).ok) eq++
      y += fp.d
      if (cooler === 'cdu') {
        if (y < h.d && canPlace(h, 'crah', x, y, 0) === null && y + 2 <= h.d && placeEquipment(w, h.id, 'crah', x, y, 0).ok) eq++
        y += 2
      }
    }
  }
  for (let y = 0; y < h.d && racks < maxRacks; y++) {
    if (y % 3 === 2) continue // aisle
    for (let x = 0; x < h.w && racks < maxRacks; x++) {
      if (x % 10 === 0) continue
      if (canPlace(h, 'rack', x, y, 0) !== null) continue
      if (w.cash < RACK_COST) return ok({ racks, equipment: eq })
      if (placeRack(w, h.id, x, y, y % 3 === 0 ? 0 : 2).ok) racks++
    }
  }
  return ok({ racks, equipment: eq })
}
export function retrofitCooling(w: World, hallId: string, to: CoolingType): Result {
  const f = lockHall(w, hallId); if (!f) return fail('No such hall')
  if (!coolingUnlocked(w, to)) return fail('Not researched')
  const cost = f.hall.coolKw * COOLING[to].usdPerKw * 1.4
  if (w.cash < cost) return fail('Not enough cash')
  spend(w, cost); f.hall.cooling = to
  return ok(undefined)
}
export function upgradeFabric(w: World, hallId: string, to: FabricType): Result {
  const f = lockHall(w, hallId); if (!f) return fail('No such hall')
  if (!fabricUnlocked(w, to)) return fail('Not researched')
  const servers = hallServers(f.hall)
  const cost = (servers + f.hall.racks.length) * FABRICS[to].usdPerServer * 0.8
  if (w.cash < cost) return fail('Not enough cash')
  spend(w, cost); f.hall.fabric = to
  return ok(undefined)
}
export function buyUtility(w: World, siteId: string, mw: number): Result {
  const s = findSite(w, siteId); const r = region(s.regionId)
  const pending = s.pendingUtility.reduce((a, p) => a + p.mw, 0)
  if (s.utilityMw + pending + mw > r.gridCapMw) return fail(`Regional grid can only offer ${r.gridCapMw} MW at this site`)
  const cost = mw * 1_300_000
  if (w.cash < cost) return fail('Not enough cash')
  spend(w, cost)
  s.pendingUtility.push({ mw, readyTick: w.tick + Math.round(r.permitDays * (0.5 + mw / 400) * (1 - techSum(w, 'permit'))) * 24 })
  return ok(undefined)
}
export function buildGenerator(w: World, siteId: string, kind: GenKind, mw: number, mwh = 0): Result {
  const s = findSite(w, siteId); const g = GENERATORS[kind]
  if (g.needsTech && !hasTech(w, g.needsTech)) return fail('Technology not researched')
  if (kind === 'geothermal' && !region(s.regionId).geothermal) return fail('No geothermal resource here')
  const cost = mw * g.usdPerMw + mwh * (g.usdPerMwhStored ?? 0)
  if (w.cash < cost) return fail('Not enough cash')
  spend(w, cost)
  s.gens.push({ id: newId(w, 'g'), kind, mw, mwh: kind === 'battery' ? (mwh || mw * 2) : 0, soc: 0, readyTick: w.tick + g.leadDays * 24 })
  return ok(undefined)
}

// ---------------------------------------------------------------- hardware
export function orderServers(w: World, siteId: string, gpuId: string, count: number): Result {
  const s = findSite(w, siteId)
  const g = gpuCatalog(yearOf(w.tick)).find((x) => x.id === gpuId)
  if (!g) return fail('That GPU is not on sale yet')
  if (count < 1) return fail('Order at least one server')
  const price = serverMarketPrice(w, g)
  const discount = count >= 1000 ? 0.88 : count >= 250 ? 0.93 : count >= 50 ? 0.97 : 1
  const cost = Math.round(price * count * discount)
  if (w.cash < cost) return fail(`Need $${(cost / 1e6).toFixed(2)}M`)
  spend(w, cost)
  s.orders.push({ id: newId(w, 'o'), gpuId, servers: count, arriveTick: w.tick + (leadDays(w) + Math.round(Math.log2(1 + count) * 3)) * 24 })
  return ok(undefined)
}
export function maxServersPerRack(w: World, hall: Hall, gpuId: string): number {
  const perServer = serverPeakKw(gpu(w, gpuId))
  return Math.max(0, Math.min(8, Math.floor(COOLING[hall.cooling].maxRackKw / perServer)))
}
/** Install servers from site stock into a hall, filling racks to their thermal density limit. */
export function installServers(w: World, siteId: string, hallId: string, gpuId: string, count: number): Result<number> {
  const s = findSite(w, siteId); const hall = s.halls.find((h) => h.id === hallId)
  if (!hall) return fail('No such hall')
  if (w.tick < hall.readyTick) return fail('Hall still under construction')
  const stock = s.stock[gpuId] ?? 0
  const want = Math.min(count, stock)
  if (want < 1) return fail('No servers of that type in stock')
  const perRack = maxServersPerRack(w, hall, gpuId)
  if (perRack < 1) return fail(`One ${gpu(w, gpuId).name} server draws ${serverPeakKw(gpu(w, gpuId)).toFixed(1)} kW — above the ${COOLING[hall.cooling].maxRackKw} kW rack limit of ${hall.cooling} cooling. Retrofit to liquid.`)
  let left = want
  for (const pass of [0, 1]) {
    for (const r of hall.racks) {
      if (left <= 0) break
      if (pass === 0 ? r.gpuId !== gpuId : r.gpuId !== '') continue
      const add = Math.min(left, perRack - r.servers)
      if (add > 0) { r.gpuId = gpuId; r.servers += add; left -= add }
    }
  }
  if (want - left < 1) return fail(hall.racks.length ? 'No free rack space. Place more racks.' : 'Place racks in the hall first.')
  const installed = want - left
  s.stock[gpuId] = stock - installed
  return ok(installed)
}
export function sellServers(w: World, siteId: string, gpuId: string, count: number): Result<number> {
  const s = findSite(w, siteId); const g = gpu(w, gpuId)
  const have = s.stock[gpuId] ?? 0
  const n = Math.min(count, have)
  if (n < 1) return fail('Nothing in stock to sell')
  s.stock[gpuId] = have - n
  const v = n * serverMarketPrice(w, g) * 0.6 * residual(Math.max(0, yearOf(w.tick) - g.year) * 0.5)
  w.cash += v
  return ok(v)
}
export function uninstallServers(w: World, siteId: string, hallId: string, gpuId: string, count: number): Result<number> {
  const s = findSite(w, siteId); const hall = s.halls.find((h) => h.id === hallId)
  if (!hall) return fail('No such hall')
  const free = hallServers(hall, gpuId) - Math.max(0, committed(w, siteId, gpuId) - (siteHealthy(s, gpuId) - hallServers(hall, gpuId)))
  let n = Math.min(count, Math.max(0, free))
  if (n < 1) return fail('Those servers are committed to workloads')
  const done = n
  for (const r of [...hall.racks].reverse()) {
    if (n <= 0) break
    if (r.gpuId !== gpuId) continue
    const take = Math.min(n, r.servers); r.servers -= take; r.failed = Math.min(r.failed, r.servers); n -= take
    if (r.servers === 0) r.gpuId = ''
  }
  s.stock[gpuId] = (s.stock[gpuId] ?? 0) + done
  return ok(done)
}

// ---------------------------------------------------------------- workloads
export function setRental(w: World, siteId: string, gpuId: string, servers: number, priceMult = 1): Result {
  const have = siteHealthy(findSite(w, siteId), gpuId) + 0
  const existing = w.rentals.find((r) => r.siteId === siteId && r.gpuId === gpuId)
  const room = Math.max(0, hallTotal(w, siteId, gpuId) - committed(w, siteId, gpuId, existing?.id))
  void have
  if (servers > room) return fail(`Only ${room} servers free at that site`)
  if (existing) { existing.servers = servers; existing.priceMult = priceMult; if (servers <= 0) w.rentals = w.rentals.filter((r) => r !== existing) }
  else if (servers > 0) w.rentals.push({ id: newId(w, 'r'), siteId, gpuId, servers, priceMult })
  return ok(undefined)
}
const hallTotal = (w: World, siteId: string, gpuId: string): number => findSite(w, siteId).halls.reduce((a, h) => a + hallServers(h, gpuId), 0)

export interface TrainSpec { name: string; paramsB: number; activeParamsB?: number; tokensT: number; moe?: boolean; dataQuality?: number; siteId: string; gpuId: string; servers: number }
export function validateTraining(w: World, spec: TrainSpec): string | null {
  const s = w.sites.find((x) => x.id === spec.siteId); if (!s) return 'Pick a site'
  const g = gpuCatalog(yearOf(w.tick) + 50).find((x) => x.id === spec.gpuId); if (!g) return 'Pick a GPU'
  if (spec.moe && !hasTech(w, 'moe')) return 'Mixture-of-Experts not researched'
  if (spec.servers < 1) return 'Allocate servers'
  const free = hallTotal(w, spec.siteId, spec.gpuId) - committed(w, spec.siteId, spec.gpuId)
  if (spec.servers > free) return `Only ${free} free servers of that type at the site`
  if (trainMemoryGB(spec.paramsB) > 0.75 * spec.servers * GPUS_PER_SERVER * g.memGB) return `Model doesn't fit: needs ~${Math.ceil(trainMemoryGB(spec.paramsB))} GB of GPU memory for weights + optimizer state`
  return null
}
export function startTraining(w: World, spec: TrainSpec, owner = 'player'): Result<string> {
  const err = validateTraining(w, spec); if (err) return fail(err)
  const moe = !!spec.moe
  const active = moe ? (spec.activeParamsB ?? spec.paramsB / 8) : spec.paramsB
  const dq = Math.min(1.4, (spec.dataQuality ?? 1) + (hasTech(w, 'synth') ? 0.15 : 0))
  const id = newId(w, 't')
  w.runs.push({
    id, name: spec.name, owner, paramsB: spec.paramsB, activeParamsB: active, tokensT: spec.tokensT, moe, dataQuality: dq,
    siteId: spec.siteId, gpuId: spec.gpuId, servers: spec.servers, flopsTotal: trainFlops(active, spec.tokensT), flopsDone: 0,
    status: 'running', startTick: w.tick, mfu: 0, etaH: Infinity, spentUsd: 0, restarts: 0, note: ''
  })
  if (owner === 'player') spend(w, spec.tokensT * 1e6 * 20, 'opex') // dataset licensing: $20/Mtok
  return ok(id)
}
export function setRunStatus(w: World, runId: string, status: 'running' | 'paused' | 'failed'): Result {
  const r = w.runs.find((x) => x.id === runId); if (!r) return fail('No such run')
  if (r.status === 'done') return fail('Already finished')
  if (status === 'running') {
    const free = hallTotal(w, r.siteId, r.gpuId) - committed(w, r.siteId, r.gpuId, r.id)
    if (r.servers > free) return fail('Servers are now in use elsewhere')
  }
  r.status = status
  return ok(undefined)
}
export function acceptContract(w: World, contractId: string, siteId: string, gpuId: string, servers: number): Result {
  const c = w.contracts.find((x) => x.id === contractId); if (!c || c.accepted) return fail('Contract unavailable')
  const g = gpu(w, gpuId)
  if (g.memGB < c.minGpuMemGB) return fail(`Customer requires GPUs with ≥${c.minGpuMemGB} GB memory`)
  const res = startTraining(w, { name: c.modelName, paramsB: c.paramsB, activeParamsB: c.moe ? c.paramsB / 8 : c.paramsB, tokensT: c.tokensT, moe: c.moe, siteId, gpuId, servers }, c.id)
  if (!res.ok) return res
  c.accepted = true; c.runId = res.value
  c.deadlineTick = Math.max(c.deadlineTick, w.tick + 24)
  return ok(undefined)
}
export function finishRunNow(w: World, runId: string): void { finishRun(w, runId) }

export function postTrain(w: World, modelId: string): Result {
  const m = w.models.find((x) => x.id === modelId); if (!m) return fail('No such model')
  if (m.posttrain >= 3) return fail('Already fully post-trained')
  const cost = 400_000 * Math.pow(3, m.posttrain) * Math.max(1, Math.sqrt(m.paramsB / 10))
  if (w.cash < cost) return fail(`Needs $${(cost / 1e6).toFixed(2)}M (human labelers, red teamers, one lawyer)`)
  spend(w, cost, 'opex')
  m.posttrain++; m.elo += 45
  return ok(undefined)
}
export function launchModel(w: World, modelId: string, priceMtok?: number): Result {
  const m = w.models.find((x) => x.id === modelId); if (!m) return fail('No such model')
  m.releasedByPlayer = true
  m.priceMtok = priceMtok ?? +referencePrice(w.tick / HOURS_PER_YEAR, m.elo).toFixed(2)
  pushNews(w, 'good', `${m.name} launches`, `Elo ${Math.round(m.elo)} at $${m.priceMtok.toFixed(2)}/Mtok. Hype Marketson has already posted it with a rocket emoji.`)
  return ok(undefined)
}
export function setModelPrice(w: World, modelId: string, p: number): Result {
  const m = w.models.find((x) => x.id === modelId); if (!m) return fail('No such model')
  m.priceMtok = Math.max(0.01, p); return ok(undefined)
}
export function deployModel(w: World, modelId: string, siteId: string, gpuId: string, servers: number): Result {
  const m = w.models.find((x) => x.id === modelId); if (!m) return fail('No such model')
  const g = gpu(w, gpuId)
  if (serveMemoryGB(m.paramsB) > 0.8 * servers * GPUS_PER_SERVER * g.memGB) return fail(`Weights need ~${Math.ceil(serveMemoryGB(m.paramsB))} GB; allocate more servers`)
  const existing = w.deployments.find((d) => d.modelId === modelId && d.siteId === siteId && d.gpuId === gpuId)
  const room = hallTotal(w, siteId, gpuId) - committed(w, siteId, gpuId, existing?.id)
  if (servers > room) return fail(`Only ${room} free servers there`)
  if (existing) { existing.servers = servers; if (servers <= 0) w.deployments = w.deployments.filter((d) => d !== existing) }
  else if (servers > 0) w.deployments.push({ id: newId(w, 'd'), modelId, siteId, gpuId, servers })
  return ok(undefined)
}

// ---------------------------------------------------------------- company
export function hire(w: World, role: keyof World['staff'], n: number): Result {
  if (n > 0) { const cost = n * 45_000; if (w.cash < cost) return fail('Not enough cash'); spend(w, cost, 'opex') }
  if (w.staff[role] + n < 0) return fail('No one left to fire')
  w.staff[role] += n; return ok(undefined)
}
export function startResearch(w: World, id: string): Result {
  const t = TECHS.find((x) => x.id === id); if (!t) return fail('Unknown tech')
  const lv = w.research.levels[id] ?? 0
  if (lv > 0 && !t.repeatable) return fail('Already researched')
  if (t.repeatable?.max && lv >= t.repeatable.max) return fail('Maxed out')
  if (t.requires?.some((r) => !w.research.done.includes(r))) return fail('Prerequisites missing')
  if (w.research.current && w.research.current !== id) w.research.progressUsd = 0
  w.research.current = id
  return ok(undefined)
}
export function borrow(w: World, amount: number): Result {
  if (amount <= 0) return fail('Amount must be positive')
  if (debt(w) + amount > creditLimit(w)) return fail(`Credit limit is $${(creditLimit(w) / 1e6).toFixed(1)}M`)
  const rate = 0.07 + 0.04 * (debt(w) / creditLimit(w))
  w.loans.push({ id: newId(w, 'l'), principal: amount, rate })
  w.cash += amount; return ok(undefined)
}
export function repay(w: World, loanId: string): Result {
  const l = w.loans.find((x) => x.id === loanId); if (!l) return fail('No such loan')
  if (w.cash < l.principal) return fail('Not enough cash')
  w.cash -= l.principal; w.loans = w.loans.filter((x) => x !== l); return ok(undefined)
}
export function setAdvisor(w: World, id: string): Result {
  if (!ADVISORS.some((a) => a.id === id)) return fail('Unknown advisor')
  w.advisor = id; return ok(undefined)
}
export { statKey, eloFromLoss }

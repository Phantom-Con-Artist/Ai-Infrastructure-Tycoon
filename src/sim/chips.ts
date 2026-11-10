import { HBM, LITHO, PACKAGES, node, type LithoKind } from './data/silicon'
import { canAfford } from './rules'
import { gpuCatalog } from './data/hardware'
import { evaluateChip, exposuresPerWafer, type ChipSpec } from './silicon'
import { HOURS_PER_YEAR, type ChipDesign, type World } from './types'
import { findSite, hasTech, newId, pushNews, spend, techLevel, techSum, yearOf } from './util'

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string }
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const fail = (error: string): Result<never> => ({ ok: false, error })

/** Everything the player is allowed to pick in the designer right now. */
export function siliconOptions(w: World) {
  return {
    canDesign: hasTech(w, 'fabless'),
    nodes: ['n16', 'n7', 'n5', 'n4', 'n3', 'n2', 'a16', 'a14', 'fx1', 'fx2', 'fx3'].filter((id) => { const n = node(id); return n.year <= yearOf(w.tick) + 0.5 && hasTech(w, n.tech) }),
    packages: (Object.keys(PACKAGES) as (keyof typeof PACKAGES)[]).filter((k) => !PACKAGES[k].tech || hasTech(w, PACKAGES[k].tech!)),
    hbm: HBM.filter((h) => (!h.tech || hasTech(w, h.tech)) && h.year <= yearOf(w.tick) + 0.5).map((h) => h.id),
    precisions: (['bf16', 'fp8', 'fp4'] as const).filter((p) => p === 'bf16' || hasTech(w, p)),
    maxArch: 1 + techLevel(w, 'arch-mk'),
    cpu: hasTech(w, 'cpu-design')
  }
}
export function validateDesign(w: World, s: ChipSpec): string | null {
  const o = siliconOptions(w)
  if (!o.canDesign) return 'Research “Chip design team” first'
  if (!o.nodes.includes(s.nodeId)) return 'Process node not unlocked'
  if (!o.packages.includes(s.pkg)) return 'Packaging technology not unlocked'
  if (s.kind === 'gpu' && !o.hbm.includes(s.hbmId)) return 'Memory generation not unlocked'
  if (!o.precisions.includes(s.precision)) return 'Precision format not unlocked'
  if (s.archGen > o.maxArch) return 'Tensor-core generation not researched'
  if (s.kind === 'cpu' && !o.cpu) return 'Research “CPU core team” first'
  const e = evaluateChip(s, yearOf(w.tick))
  return e.ok ? null : e.problems[0]
}

/** Design time after your engineers and silicon architects speed it up. */
export const designMonths = (w: World, base: number): number => base / (1 + Math.sqrt(w.staff.engineers) * 0.04 + Math.sqrt(w.chipStaff ?? 0) * 0.18)
export function startDesign(w: World, s: ChipSpec): Result<ChipDesign> {
  const err = validateDesign(w, s); if (err) return fail(err)
  const e = evaluateChip(s, yearOf(w.tick))
  const upfront = e.nreUsd * 0.3
  if (!canAfford(w, upfront)) return fail(`Need ${(upfront / 1e6).toFixed(0)}M upfront (30% of NRE)`)
  spend(w, upfront, 'opex')
  const months = designMonths(w, e.designMonths)
  const d: ChipDesign = {
    id: newId(w, 'c'), spec: { ...s }, status: 'designing', startTick: w.tick, readyTick: w.tick + Math.round(months * 730),
    nrePaid: upfront, nreTotal: e.nreUsd, wafersPerMonth: 0, source: 'foundry', salePrice: Math.round(e.unitCost * 2.2), sold: 0, revenue: 0, made: 0
  }
  w.silicon.designs.push(d)
  pushNews(w, 'info', `Tape-out begins: ${s.name}`, `${node(s.nodeId).name}, ${e.transistorsB.toFixed(0)}B transistors (~${e.atoms.toExponential(1)} atoms). First silicon in ~${months.toFixed(0)} months.`, 'mine', 1)
  return ok(d)
}

function registerGpu(w: World, d: ChipDesign): void {
  const e = evaluateChip(d.spec, yearOf(w.tick))
  const id = 'pl-' + d.id
  d.gpuId = id
  w.customGpus = w.customGpus.filter((g) => g.id !== id)
  if (d.spec.kind === 'cpu') {
    const cores = d.spec.cpuCores ?? 64
    w.customGpus.push({ id, vendor: 'player', name: d.spec.name, year: Math.floor(yearOf(w.tick)), tflops: 1, memGB: 128, memTBs: 0.08, tdpW: Math.round(e.tdpW / 4), priceUsd: Math.round(e.unitCost / 4), mtbfH: 300000, vcpus: Math.round(cores * 2 * 2 / 8) })
    return
  }
  if (d.spec.kind !== 'gpu') return
  w.customGpus.push({ id, vendor: 'player', name: d.spec.name, year: Math.floor(yearOf(w.tick)), tflops: Math.round(e.tflops), memGB: Math.round(e.memGB), memTBs: +e.memTBs.toFixed(2), tdpW: e.tdpW, priceUsd: Math.round(e.unitCost), mtbfH: 45000 })
}

/** Wafer price and monthly cap for a design given its source. */
export function waferEconomics(w: World, d: ChipDesign): { waferUsd: number; capPerMonth: number; reason?: string } {
  const n = node(d.spec.nodeId)
  if (d.source === 'foundry') return { waferUsd: n.waferUsd * (1 + 0.3 * w.market.supplyTight), capPerMonth: Math.round(4000 * (1 + techLevel(w, 'brand-mk') * 0.05)) }
  const fab = w.silicon.fab
  if (!fab || w.tick < fab.readyTick) return { waferUsd: 0, capPerMonth: 0, reason: 'Fab not built yet' }
  const tools = (Object.keys(fab.tools) as LithoKind[]).filter((k) => fab.tools[k] > 0)
  const layers = exposuresPerWafer(n, tools)
  if (layers === null) return { waferUsd: 0, capPerMonth: 0, reason: `No tool in your fab can print ${n.name}` }
  let exposures = 0
  for (const k of tools) if (n.critLayers[k] !== undefined) exposures += fab.tools[k] * LITHO[k].wph * 24 * 30 * 0.78
  return { waferUsd: n.waferUsd * 0.38 * (1 - Math.min(0.5, techSum(w, 'yield'))), capPerMonth: Math.floor(exposures / layers) }
}

export function setProduction(w: World, designId: string, wafersPerMonth: number, source: 'foundry' | 'fab'): Result {
  const d = w.silicon.designs.find((x) => x.id === designId); if (!d) return fail('No such design')
  if (d.status !== 'ready') return fail('Still in design')
  d.source = source
  const ec = waferEconomics(w, d)
  if (ec.reason) return fail(ec.reason)
  d.wafersPerMonth = Math.max(0, Math.min(Math.round(wafersPerMonth), ec.capPerMonth))
  return ok(undefined)
}
export function setChipPrice(w: World, designId: string, price: number): Result {
  const d = w.silicon.designs.find((x) => x.id === designId); if (!d) return fail('No such design')
  d.salePrice = Math.max(1, Math.round(price)); return ok(undefined)
}
/** Assemble 8-GPU servers from your own chips; they land on the site's loading dock. */
export function buildServersFromChips(w: World, designId: string, siteId: string, servers: number): Result<number> {
  const d = w.silicon.designs.find((x) => x.id === designId); if (!d || !d.gpuId) return fail('No first silicon yet')
  const have = w.silicon.chipStock[d.id] ?? 0
  const per = d.spec.kind === 'cpu' ? 2 : 8 // dual-socket CPU box vs 8-GPU board
  const n = Math.min(servers, Math.floor(have / per))
  if (n < 1) return fail(`Need at least ${per} chips in stock`)
  const cost = n * (hasTech(w, 'cpu-design') && w.silicon.designs.some((x) => x.spec.kind === 'cpu' && x.status === 'ready') ? 14_000 : 26_000)
  if (!canAfford(w, cost)) return fail('Not enough cash for chassis and CPUs')
  spend(w, cost)
  w.silicon.chipStock[d.id] = have - n * per
  const site = findSite(w, siteId)
  site.stock[d.gpuId] = (site.stock[d.gpuId] ?? 0) + n
  return ok(n)
}

export function buildFab(w: World): Result {
  if (!hasTech(w, 'fab')) return fail('Research “Build your own fab” first')
  const cost = 3_000_000_000
  if (w.silicon.fab) {
    if (!canAfford(w, cost)) return fail('A new cleanroom module costs $3.0B')
    spend(w, cost); w.silicon.fab.modules++; return ok(undefined)
  }
  if (!canAfford(w, cost)) return fail('A fab module costs $3.0B')
  spend(w, cost)
  w.silicon.fab = { modules: 1, readyTick: w.tick + 540 * 24, tools: { duv: 0, euv: 0, highna: 0, hyperna: 0 }, toolsPending: [] }
  pushNews(w, 'good', 'Fab construction begins', 'Eighteen months of concrete, ultrapure water and vibration isolation. The neighbours are asking about the cranes.', 'mine', 1)
  return ok(undefined)
}
export function buyLitho(w: World, kind: LithoKind): Result {
  const fab = w.silicon.fab; if (!fab) return fail('Build a fab first')
  const L = LITHO[kind]
  if (kind !== 'duv' && !hasTech(w, L.tech)) return fail(`Research ${L.name} qualification first`)
  const installed = Object.values(fab.tools).reduce((a, b) => a + b, 0) + fab.toolsPending.length
  if (installed >= fab.modules * 20) return fail('Cleanroom full: 20 scanners per module')
  if (!canAfford(w, L.usd)) return fail(`${L.name} costs $${(L.usd / 1e6).toFixed(0)}M`)
  spend(w, L.usd)
  fab.toolsPending.push({ kind, readyTick: w.tick + (kind === 'duv' ? 120 : 270) * 24 })
  return ok(undefined)
}

/**
 * Software-ecosystem moat: buyers trust a new accelerator vendor only once there is an installed
 * base (drivers, kernels, frameworks). Grows with every chip shipped, plus your own fleet using them.
 */
export function ecosystem(w: World): number {
  const shipped = w.silicon.designs.reduce((a, d) => a + d.sold, 0) + w.customGpus.reduce((a, g) => a + w.sites.reduce((b, s) => b + s.halls.reduce((c, h) => c + h.racks.reduce((e, r) => e + (r.gpuId === g.id ? r.servers * 8 : 0), 0), 0), 0), 0)
  return Math.min(1, 0.1 + Math.log10(1 + shipped) / 7.5 + techSum(w, 'eco'))
}
/** Price at which your chip matches the market's best performance per dollar. */
export function parityPrice(w: World, d: ChipDesign): number {
  const e = evaluateChip(d.spec, yearOf(w.tick))
  if (d.spec.kind === 'cpu') return Math.round(e.cpuScore / (900 / 11000))
  const cat = gpuCatalog(yearOf(w.tick)).filter((g) => g.year >= yearOf(w.tick) - 3)
  const best = Math.max(...cat.map((g) => g.tflops / g.priceUsd))
  return Math.round(e.tflops / best / 100) * 100
}
/** Accelerator market: units/day the world would buy from you at your price. */
export function chipDemandPerDay(w: World, d: ChipDesign): number {
  if (!d.gpuId && d.spec.kind !== 'cpu') return 0
  const e = evaluateChip(d.spec, yearOf(w.tick))
  const years = w.tick / HOURS_PER_YEAR
  if (d.spec.kind === 'cpu') {
    const global = 30_000 * Math.pow(1.08, years)
    const ref = 900 / 11000 // a typical 2023 server CPU: score ~900 at ~$11k
    const ratio = (e.cpuScore / d.salePrice) / ref
    return global * Math.min(0.4, 0.08 * Math.pow(ratio, 2.2)) * (0.5 + w.reputation / 100)
  }
  const cat = gpuCatalog(yearOf(w.tick)).filter((g) => g.year >= yearOf(w.tick) - 3)
  const best = Math.max(...cat.map((g) => g.tflops / g.priceUsd))
  const ratio = (e.tflops / d.salePrice) / best
  const memRatio = e.memGB / Math.max(...cat.map((g) => g.memGB))
  const global = 9_000 * Math.pow(1.35, Math.min(years, 8)) * w.market.boom
  const share = Math.min(0.6, 0.12 * Math.pow(ratio, 2) * Math.pow(memRatio, 0.5))
  return global * share * (0.4 + 0.8 * w.reputation / 100) * ecosystem(w) * (1 + (d.hype ?? 0))
}

export function dailySilicon(w: World): void {
  const si = w.silicon
  if (!si) return
  const fab = si.fab
  if (fab) {
    fab.toolsPending = fab.toolsPending.filter((t) => { if (w.tick >= t.readyTick) { fab.tools[t.kind]++; pushNews(w, 'good', `${LITHO[t.kind].name} qualified`, `${LITHO[t.kind].maker} engineers leave. The scanner hums at ${LITHO[t.kind].wavelengthNm} nm.`); return false } return true })
    if (w.tick >= fab.readyTick) { const op = fab.modules * 1_000_000; w.cash -= op; w.today.opex += op }
  }
  for (const d of si.designs) {
    if (d.status === 'designing') {
      const remaining = d.nreTotal - d.nrePaid
      const days = Math.max(1, (d.readyTick - w.tick) / 24)
      const pay = Math.min(remaining, remaining / days)
      w.cash -= pay; w.today.opex += pay; d.nrePaid += pay
      if (w.tick >= d.readyTick) {
        d.status = 'ready'
        registerGpu(w, d)
        d.salePrice = Math.max(Math.round(evaluateChip(d.spec, yearOf(w.tick)).unitCost * 1.3), parityPrice(w, d))
        pushNews(w, 'good', `First silicon: ${d.spec.name}`, 'It boots. Mostly. Set up production and decide: keep the chips, or sell them to the highest bidder.', 'mine', 2)
      }
      continue
    }
    if (d.wafersPerMonth > 0) {
      const ec = waferEconomics(w, d)
      const wafers = Math.min(d.wafersPerMonth, ec.capPerMonth) / 30
      const e = evaluateChip(d.spec, yearOf(w.tick))
      const chips = (wafers * e.goodDiesPerWafer) / Math.max(1, d.spec.dies)
      const memCost = e.hbmCost * (1 - techSum(w, 'hbmCost')) + e.pkgCost
      const cost = wafers * ec.waferUsd + chips * memCost
      w.cash -= cost; w.today.opex += cost
      si.chipStock[d.id] = (si.chipStock[d.id] ?? 0) + chips
      d.made += chips
    }
    const stock = si.chipStock[d.id] ?? 0
    if (stock >= 1 && d.salePrice > 0) {
      const sell = Math.min(Math.floor(stock), chipDemandPerDay(w, d))
      if (sell > 0) {
        const rev = sell * d.salePrice
        si.chipStock[d.id] = stock - sell
        d.sold += sell; d.revenue += rev
        w.cash += rev; w.today.revenue += rev
      }
    }
  }
}

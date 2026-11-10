import { COOLING, GENERATORS, region, serverKw, type GpuSpec } from './data/hardware'
import { EQUIP } from './data/equipment'
import { gauss } from './rng'
import { HOURS_PER_YEAR, type Hall, type Site, type World } from './types'
import { advisorPerk, clamp, gpu, techSum } from './util'

const dayFrac = (tick: number): number => (tick % 24) / 24
const yearFrac = (tick: number): number => (tick % HOURS_PER_YEAR) / HOURS_PER_YEAR

export function ambientAt(w: World, site: Site): number {
  const r = region(site.regionId)
  const seasonal = -Math.cos(2 * Math.PI * (yearFrac(w.tick) - 0.04)) * r.ampC
  const diurnal = -Math.cos(2 * Math.PI * (dayFrac(w.tick) - 0.1)) * 3.5
  let t = r.meanC + seasonal + diurnal
  for (const e of w.events) if (e.kind === 'heatwave' && (!e.siteId || e.siteId === site.id)) t += e.mag
  return t
}

export function coolCapacityKw(h: Hall, ambient: number): number {
  return h.coolKw * derateFactor(h, ambient)
}
export function copAt(w: World, h: Hall, ambient: number): number {
  const c = COOLING[h.cooling]
  let cop = c.cop
  if (h.cooling === 'air') cop *= 1 + techSum(w, 'airCop')
  if (advisorPerk(w, 'cool')) cop *= 1.05
  const free = ambient < 10 ? 1 + (10 - ambient) * 0.06 : 1
  const hot = 1 - Math.max(0, ambient - 15) * 0.012
  return Math.max(0.5 * c.cop, cop * free * hot)
}

export const derateFactor = (h: Hall, ambient: number): number => {
  const c = COOLING[h.cooling]
  return clamp(1 - Math.max(0, ambient - c.derateAbove) * c.derateRate, 0.3, 1)
}

/** Per-rack electrical draw this hour; also accumulates load on each PDU and cooler. */
function hallLoad(w: World, h: Hall, busy: Record<string, number>): number {
  let kw = 0
  const eq = h.equipment
  for (const e of eq) e.load = 0
  let lastId = '', g: GpuSpec | null = null
  for (const r of h.racks) {
    if (!r.gpuId || !r.powered || !h.online || r.servers === 0) { r.kw = 0; continue }
    if (r.gpuId !== lastId) { g = gpu(w, r.gpuId); lastId = r.gpuId }
    r.kw = (r.servers - r.failed) * serverKw(g!, busy[r.gpuId] ?? 0) * (0.6 + 0.4 * h.throttle * r.throttle)
    kw += r.kw
    if (r.pduIdx !== undefined && r.pduIdx >= 0 && eq[r.pduIdx]) eq[r.pduIdx].load += r.kw
    if (r.coolerIdx !== undefined && r.coolerIdx >= 0 && eq[r.coolerIdx]) eq[r.coolerIdx].load += r.kw
  }
  return kw
}

/** Local constraints → per-rack throttle for the next hour (PDU breakers, local cooling starvation). */
function rackThrottles(h: Hall, ambient: number): void {
  const eq = h.equipment
  const der = derateFactor(h, ambient)
  // per-equipment factors once, then a cheap pass over racks
  const factor = eq.map((e) => e.kind === 'pdu' ? (e.load > EQUIP.pdu.kw ? EQUIP.pdu.kw / e.load : 1) : (e.load > EQUIP[e.kind].kw * der ? Math.max(0.3, EQUIP[e.kind].kw * der / e.load) : 1))
  for (const r of h.racks) {
    const pduF = r.pduIdx !== undefined && r.pduIdx >= 0 ? factor[r.pduIdx] ?? 1 : 1
    const coolF = r.coolerIdx !== undefined && r.coolerIdx >= 0 ? factor[r.coolerIdx] ?? 1 : 0.35
    r.throttle = clamp(pduF * coolF, 0, 1)
  }
}

export function energyPrice(w: World, site: Site): number {
  const r = region(site.regionId)
  const diurnal = 1 + 0.18 * Math.sin(2 * Math.PI * (dayFrac(w.tick) - 0.3))
  const seasonal = 1 + 0.1 * Math.cos(2 * Math.PI * (yearFrac(w.tick) - 0.05))
  let ev = 1
  for (const e of w.events) if (e.kind === 'priceSpike' && (!e.siteId || e.siteId === site.id)) ev *= e.mag
  return r.basePriceMwh * diurnal * seasonal * Math.exp(site.spotNoise) * ev * (advisorPerk(w, 'cpo') ? 0.94 : 1) * Math.max(0.4, 1 - techSum(w, 'powerCost'))
}

export interface Dispatch { gridMw: number; powerFactor: number; costPerHour: number; carbonKg: number; flow: NonNullable<Site['flow']> }

export function dispatch(w: World, site: Site, demandMw: number): Dispatch {
  const r = region(site.regionId)
  const tick = w.tick
  const sun = Math.max(0, Math.sin(Math.PI * (dayFrac(tick) * 24 - 6) / 12)) * (0.75 + 0.25 * Math.cos(2 * Math.PI * (yearFrac(tick) - 0.45)))
  const strategy = site.strategy ?? 'cost'
  let solarMw = 0, windMw = 0, batOut = 0, gasMw = 0, drCredit = 0, curtailed = 0
  let free = 0, nuke = 0, nukeFuel = 0, cost = 0, carbon = 0
  let gasCap = 0, batMw = 0, batSoc = 0
  const bats = site.gens.filter((g) => g.kind === 'battery' && tick >= g.readyTick)
  for (const g of site.gens) {
    if (tick < g.readyTick) continue
    cost += (GENERATORS[g.kind].opexPerMwYear * g.mw) / HOURS_PER_YEAR
    if (g.kind === 'solar') { const s = g.mw * r.solarCf * 2.6 * sun; free += s; solarMw += s }
    else if (g.kind === 'wind') { const s = g.mw * clamp(site.windCf, 0, 1); free += s; windMw += s }
    else if (g.kind === 'geothermal') { free += g.mw * 0.92; carbon += g.mw * 0.92 * 20 }
    else if (g.kind === 'nuclear') { nuke += g.mw * 0.92; nukeFuel += g.mw * 0.92 * GENERATORS.nuclear.fuelPerMwh }
    else if (g.kind === 'gas') gasCap += g.mw
    else if (g.kind === 'battery') { batMw += g.mw; batSoc += g.soc }
  }
  let remaining = demandMw
  // Demand response: during price spikes, shed a share of load and get paid by the grid operator.
  const priceNow = site.priceMwh
  if ((site.drPct ?? 0) > 0 && site.gridUp && priceNow > r.basePriceMwh * 2) {
    curtailed = demandMw * (site.drPct ?? 0)
    remaining -= curtailed
    drCredit = curtailed * priceNow * 0.8
    cost -= drCredit
  }
  const baseload = free + nuke
  const used = Math.min(baseload, remaining)
  remaining -= used
  cost += (nuke > 0 ? nukeFuel * Math.min(1, used / Math.max(baseload, 1e-9)) : 0)
  let surplus = baseload - used

  // Battery: charge from surplus, discharge when grid price is high or grid is down.
  const price = site.priceMwh
  const avgPrice = r.basePriceMwh
  if (surplus > 0 && bats.length) {
    let chargeMw = Math.min(surplus, batMw)
    for (const b of bats) {
      const room = (b.mwh - b.soc)
      const c = Math.min(chargeMw, b.mw, room / 0.88)
      b.soc += c * 0.88; chargeMw -= c; surplus -= c
    }
  }
  const reserve = strategy === 'resilient' ? 0.8 : 0
  const dischargeWhen = !site.gridUp || (strategy === 'resilient' ? false : strategy === 'green' ? true : strategy === 'arbitrage' ? price > avgPrice * 1.05 : (price > avgPrice * 1.15 || (gasCap === 0 && price > avgPrice)))
  if (remaining > 0 && bats.length && dischargeWhen) {
    let need = remaining
    for (const b of bats) {
      const floor = site.gridUp ? b.mwh * reserve : 0
      const d = Math.max(0, Math.min(need, b.mw, b.soc - floor))
      b.soc -= d; need -= d; batOut += d
    }
    remaining = need
  } else if (bats.length && site.gridUp && (price < avgPrice * (strategy === 'arbitrage' ? 0.95 : 0.85) || (strategy === 'resilient' && bats.some((b) => b.soc < b.mwh * 0.8))) && remaining >= 0) {
    // cheap grid power: top up batteries
    let extra = 0
    for (const b of bats) {
      const c = Math.min(b.mw, (b.mwh - b.soc) / 0.88, Math.max(0, site.utilityMw - remaining - extra))
      if (c > 0) { b.soc += c * 0.88; extra += c }
    }
    cost += extra * price
    carbon += extra * r.carbon * 1000
  }

  // Gas vs grid merit order.
  let gridMw = 0
  const gasFuelCost = GENERATORS.gas.fuelPerMwh
  const gridCap = site.gridUp ? site.utilityMw : 0
  const preferGas = gasCap > 0 && (!site.gridUp || (strategy !== 'green' && gasFuelCost < price))
  const ppa = site.ppa && site.ppa.untilTick > tick ? site.ppa : null
  const takeGas = (): void => {
    if (strategy === 'green' && site.gridUp) return
    const g = Math.min(gasCap, remaining)
    if (g > 0) { cost += g * gasFuelCost; carbon += g * GENERATORS.gas.carbonT * 1000; remaining -= g; gasMw += g }
  }
  const takeGrid = (): void => {
    const g = Math.min(gridCap, remaining)
    if (g > 0) {
      const hedged = ppa ? Math.min(g, ppa.mw) : 0
      gridMw += g; cost += hedged * (ppa?.price ?? price) + (g - hedged) * price
      carbon += g * r.carbon * 1000 * (strategy === 'green' ? 0.3 : 1) // green buys certificates
      if (strategy === 'green') cost += g * 6 // RECs
      remaining -= g
    }
  }
  if (preferGas) { takeGas(); takeGrid() } else { takeGrid(); takeGas() }
  if (strategy === 'green' && remaining > 0) { const g = Math.min(gasCap, remaining); if (g > 0) { cost += g * gasFuelCost; carbon += g * GENERATORS.gas.carbonT * 1000; remaining -= g; gasMw += g } }

  // Export surplus if the grid is up.
  if (surplus > 0 && site.gridUp) cost -= surplus * price * 0.35
  // Utility capacity charge ($2,500 / MW-month).
  cost += (site.utilityMw * 2500) / 730
  const supplied = demandMw - Math.max(0, remaining) - curtailed
  const powerFactor = demandMw <= 1e-9 ? 1 : clamp(supplied / demandMw, 0, 1)
  return { gridMw, powerFactor, costPerHour: cost, carbonKg: carbon, flow: { solar: solarMw, wind: windMw, firm: nuke + (free - solarMw - windMw), battery: batOut, gas: gasMw, grid: gridMw, it: 0, cooling: 0, other: 0, curtailed, drCredit } }
}

/** Advance one site by one hour. `busy[gpuId]` is the fraction of healthy servers doing work. */
export function stepSite(w: World, site: Site, busy: Record<string, number>): { cost: number; water: number; carbonKg: number } {
  // finish deliveries
  site.pendingUtility = site.pendingUtility.filter((p) => {
    if (w.tick >= p.readyTick) { site.utilityMw += p.mw; return false }
    return true
  })
  const r = region(site.regionId)
  site.ambientC = ambientAt(w, site)
  const vol = site.regionId === 'tx' ? 0.12 : 0.05
  site.spotNoise = clamp(site.spotNoise * 0.93 + vol * gauss(w), -0.6, 1.4)
  site.windCf = clamp(site.windCf * 0.96 + r.windCf * 0.04 + 0.1 * gauss(w), 0, 1)
  site.gridUp = !w.events.some((e) => e.kind === 'outage' && e.siteId === site.id)
  site.priceMwh = energyPrice(w, site)

  let demandKw = 0
  let waterL = 0
  const loads: { h: Hall; heat: number; cap: number; total: number }[] = []
  for (const h of site.halls) {
    if (w.tick < h.readyTick) { h.online = false; h.itKw = 0; h.coolPowerKw = 0; h.pue = 0; continue }
    if (!h.online && h.tempC < 30) h.online = true
    if (h.tempC >= 45) h.online = false
    const heat = h.online ? hallLoad(w, h, busy) : 0
    const cap = coolCapacityKw(h, site.ambientC)
    const coolPower = Math.min(heat, cap) / copAt(w, h, site.ambientC)
    const overhead = h.online ? heat * 0.06 + 6 : 3
    const total = heat + coolPower + overhead
    h.itKw = heat
    h.coolPowerKw = coolPower
    h.pue = heat > 0 ? total / heat : 0
    demandKw += total
    loads.push({ h, heat, cap, total })
  }
  const demandMw = demandKw / 1000
  site.demandMw = demandMw
  const d = dispatch(w, site, demandMw)
  site.gridMw = d.gridMw
  site.powerFactor = d.powerFactor
  site.supplyMw = demandMw * d.powerFactor
  site.costPerHour = d.costPerHour
  site.carbonKgPerHour = d.carbonKg
  const itMw = loads.reduce((a, l) => a + l.heat, 0) / 1000, coolMw = site.halls.reduce((a, h) => a + h.coolPowerKw, 0) / 1000
  site.flow = { ...d.flow, it: itMw * d.powerFactor, cooling: coolMw * d.powerFactor, other: Math.max(0, demandMw - itMw - coolMw) * d.powerFactor }
  ;(site.history ??= []).push({ price: site.priceMwh, mw: site.demandMw, grid: d.gridMw })
  if (site.history.length > 48) site.history.shift()

  for (const { h, heat, cap, total } of loads) {
    let pf = site.powerFactor
    // UPS ride-through: cover the shortfall from batteries, recharge when healthy
    if (pf < 1 && h.upsSoc > 0 && total > 0) {
      const use = Math.min(total * (1 - pf), h.upsSoc)
      h.upsSoc -= use
      pf = Math.min(1, pf + use / total)
    } else if (pf >= 1) h.upsSoc = Math.min(h.upsKwh, h.upsSoc + h.upsKwh * 0.25)
    const breaker = 1
    const effHeat = heat * pf
    // thermal state
    if (effHeat <= cap || cap <= 0 && effHeat <= 0) {
      const target = 22 + 8 * (cap > 0 ? effHeat / cap : 0)
      h.tempC += (target - h.tempC) * 0.25
    } else {
      h.tempC += Math.min(9, ((effHeat - cap) / Math.max(cap, 1)) * 18 + 0.5)
    }
    if (pf < 0.05) h.tempC += 0.5 // no cooling
    h.tempC = clamp(h.tempC, 15, 70)
    const thermalThrottle = h.tempC < 32 ? 1 : h.tempC >= 44 ? 0.15 : 1 - ((h.tempC - 32) / 12) * 0.85
    h.throttle = h.online ? clamp(thermalThrottle * breaker * pf, 0, 1) : 0
    const w2 = effHeat * (0.5 + site.ambientC / 30) * COOLING[h.cooling].waterLPerKwh
    h.waterL = w2
    waterL += w2
    rackThrottles(h, site.ambientC)
  }
  return { cost: site.costPerHour + (waterL * r.waterCost) , water: waterL, carbonKg: site.carbonKgPerHour }
}

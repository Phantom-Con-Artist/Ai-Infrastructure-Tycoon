import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { createWorld, step, stepMany, valuation } from './world'
import { gpuCatalog } from './data/hardware'
import { modelLoss, eloFromLoss } from './ai'

function boot(seed = 7) {
  const w = createWorld(seed)
  const s = A.buildSite(w, 'or')
  if (!s.ok) throw new Error(s.error)
  const site = s.value
  const h = A.buildHall(w, site.id, { size: 'M', cooling: 'air', fabric: 'eth100' })
  if (!h.ok) throw new Error(h.error)
  const lay = A.autoLayout(w, h.value.id)
  if (!lay.ok) throw new Error(lay.error)
  return { w, site, hall: h.value }
}
const ready = (w: ReturnType<typeof createWorld>, site: any, hall: any, gpuId: string, n: number) => {
  expect(A.orderServers(w, site.id, gpuId, n).ok).toBe(true)
  while (w.tick < hall.readyTick + 24 || (site.stock[gpuId] ?? 0) < n) step(w)
  const r = A.installServers(w, site.id, hall.id, gpuId, n)
  expect(r.ok).toBe(true)
}

describe('scaling laws', () => {
  it('Chinchilla-70B is near L≈1.94 and bigger models are better', () => {
    const l = modelLoss(70, 70, 1.4, false, 1)
    expect(l).toBeGreaterThan(1.9); expect(l).toBeLessThan(2.0)
    expect(modelLoss(1000, 1000, 15, false, 1)).toBeLessThan(l)
    expect(eloFromLoss(1.75)).toBeGreaterThan(eloFromLoss(2.0))
  })
})
describe('hardware catalog', () => {
  it('is endless', () => { expect(gpuCatalog(2050).length).toBeGreaterThan(gpuCatalog(2023).length) })
})
describe('layout puzzle', () => {
  it('racks out of PDU reach are dark; overloaded PDUs throttle', () => {
    const w = createWorld(2); w.cash = 1e9
    const site = (A.buildSite(w, 'tx') as any).value
    A.buyUtility(w, site.id, 20); site.utilityMw = 22; site.pendingUtility = []
    w.research.done.push('rdhx', 'dlc')
    const hall = (A.buildHall(w, site.id, { size: 'L', cooling: 'dlc', fabric: 'eth100' }) as any).value
    expect(A.placeEquipment(w, hall.id, 'pdu', 0, 0).ok).toBe(true)
    expect(A.placeEquipment(w, hall.id, 'crah', 1, 0).ok).toBe(true)
    const near = (A.placeRack(w, hall.id, 3, 1) as any).value
    const far = (A.placeRack(w, hall.id, 30, 16) as any).value
    expect(near.powered && near.cooled).toBe(true)
    expect(far.powered || far.cooled).toBe(false)
    for (let x = 2; x < 9; x++) for (let y = 2; y < 8; y++) A.placeRack(w, hall.id, x, y)
    A.orderServers(w, site.id, 'nv-h1000', 400)
    while (w.tick < hall.readyTick + 24 || (site.stock['nv-h1000'] ?? 0) < 400) step(w)
    const n = (A.installServers(w, site.id, hall.id, 'nv-h1000', 400) as any).value
    expect(A.setRental(w, site.id, 'nv-h1000', n, 0.5).ok).toBe(true)
    stepMany(w, 6)
    const pdu = hall.equipment.find((e: any) => e.kind === 'pdu')
    expect(pdu.load).toBeGreaterThan(400)
    expect(near.throttle).toBeLessThan(1)
  })
})
describe('world', () => {
  it('is deterministic and serialisable', () => {
    const a = boot(11), b = boot(11)
    stepMany(a.w, 24 * 40); stepMany(b.w, 24 * 40)
    expect(JSON.stringify(a.w)).toBe(JSON.stringify(b.w))
    const c = JSON.parse(JSON.stringify(a.w)); stepMany(c, 48); stepMany(a.w, 48)
    expect(JSON.stringify(c)).toBe(JSON.stringify(a.w))
  })
  it('rents GPUs for profit and stays finite', () => {
    const { w, site, hall } = boot()
    ready(w, site, hall, 'nv-a800', 60)
    expect(A.setRental(w, site.id, 'nv-a800', 60).ok).toBe(true)
    const cash0 = w.cash
    stepMany(w, 24 * 30)
    expect(Number.isFinite(w.cash)).toBe(true)
    expect(w.ledger.at(-1)!.rentalRev).toBeGreaterThan(0)
    expect(w.cash).not.toBe(cash0)
    expect(hall.pue).toBeGreaterThan(1); expect(hall.pue).toBeLessThan(2)
  })
  it('overheats when cooling is undersized and throttles', () => {
    const { w, site, hall } = boot()
    ready(w, site, hall, 'nv-h1000', 40)
    A.setRental(w, site.id, 'nv-h1000', 40)
    hall.coolKw = 100
    stepMany(w, 48)
    expect(hall.tempC).toBeGreaterThan(32)
    expect(hall.throttle).toBeLessThan(1)
  })
  it('trains a model to completion and can launch it', () => {
    const { w, site, hall } = boot()
    ready(w, site, hall, 'nv-h1000', 40)
    const r = A.startTraining(w, { name: 'TestBot', paramsB: 7, tokensT: 0.2, siteId: site.id, gpuId: 'nv-h1000', servers: 40 })
    expect(r.ok).toBe(true)
    for (let i = 0; i < 24 * 60 && !w.models.length; i++) step(w)
    expect(w.models.length).toBe(1)
    expect(A.launchModel(w, w.models[0].id).ok).toBe(true)
    expect(A.deployModel(w, w.models[0].id, site.id, 'nv-h1000', 10).ok).toBe(true)
    stepMany(w, 24 * 10)
    expect(w.models[0].revenue).toBeGreaterThan(0)
  })
  it('rejects models that do not fit in memory', () => {
    const { w, site, hall } = boot()
    ready(w, site, hall, 'nv-h1000', 8)
    const r = A.startTraining(w, { name: 'Huge', paramsB: 2000, tokensT: 10, siteId: site.id, gpuId: 'nv-h1000', servers: 8 })
    expect(r.ok).toBe(false)
  })
  it('air cooling limits dense servers to one per rack', () => {
    const { w, site, hall } = boot()
    w.cash = 1e10; w.tick = 24 * 365 * 2
    expect(A.orderServers(w, site.id, 'nv-b2000', 4).ok).toBe(true)
    while ((site.stock['nv-b2000'] ?? 0) < 4) step(w)
    expect(A.installServers(w, site.id, hall.id, 'nv-b2000', 4).ok).toBe(true)
    const used = hall.racks.filter((r) => r.gpuId === 'nv-b2000')
    expect(used.length).toBe(4)
    expect(used.every((r) => r.servers === 1)).toBe(true)
  })
  it('survives three years of idle play without NaN and valuation is finite', () => {
    const { w } = boot(3)
    stepMany(w, 24 * 365 * 3)
    expect(Number.isFinite(valuation(w))).toBe(true)
    expect(w.competitors.length).toBeGreaterThan(4)
  })
})

describe('VM cloud', () => {
  it('rents CPU servers as reserved VMs and earns steady revenue; CPUs cannot train', () => {
    const { w, site, hall } = boot(31)
    w.tick = 24 * 365 * 1.2 // Turin-era
    w.cash = 1e9
    expect(A.orderServers(w, site.id, 'cpu-turin', 20).ok).toBe(true)
    while ((site.stock['cpu-turin'] ?? 0) < 20) step(w)
    while (w.tick < hall.readyTick + 24) step(w)
    expect(A.installServers(w, site.id, hall.id, 'cpu-turin', 20).ok).toBe(true)
    expect(A.setRental(w, site.id, 'cpu-turin', 20, 1, 'reserved').ok).toBe(true)
    expect(A.setRental(w, site.id, 'cpu-turin', 20, 1, 'spot').ok).toBe(false) // locked for a year
    stepMany(w, 24 * 10)
    expect(w.ledger.at(-1)!.rentalRev).toBeGreaterThan(0)
    expect(A.validateTraining(w, { name: 'x', paramsB: 1, tokensT: 0.01, siteId: site.id, gpuId: 'cpu-turin', servers: 1 })).toMatch(/CPU/)
  })
})

describe('rival releases', () => {
  it('each scripted release is announced exactly once', () => {
    const w = createWorld(5)
    stepMany(w, 24 * 365 * 2)
    const titles = w.news.filter((n) => n.title.includes(' launches ')).map((n) => n.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

import { datasetById, datasetCatalog, genDataset } from './models'
import { jobs, trainingOutlook } from './progress'
import { dailyPeople } from './people'
import { yearOf } from './util'
describe('fix & clarify round', () => {
  const withSite = (): { w: ReturnType<typeof createWorld>; siteId: string } => {
    const w = createWorld(7); w.cash = 1e12
    const r = A.buildSite(w, 'or'); if (!r.ok) throw new Error(r.error)
    return { w, siteId: r.value.id }
  }
  it('same-day orders of one server stack into a single line with a start time', () => {
    const { w, siteId } = withSite()
    const id = gpuCatalog(yearOf(w.tick))[0].id
    expect(A.orderServers(w, siteId, id, 4).ok).toBe(true)
    expect(A.orderServers(w, siteId, id, 6).ok).toBe(true)
    const s = w.sites[0]
    expect(s.orders).toHaveLength(1)
    expect(s.orders[0].servers).toBe(10)
    const j = jobs(w).find((x) => x.kind === 'delivery')!
    expect(j.frac).toBe(0)
    for (let i = 0; i < 48; i++) step(w)
    expect(jobs(w).find((x) => x.kind === 'delivery')!.frac).toBeGreaterThan(0)
    A.orderServers(w, siteId, id, 1)
    expect(s.orders).toHaveLength(2) // a later day is a separate shipment
  })
  it('the hiring board is fully replaced every week', () => {
    const w = createWorld(7)
    const before = new Set(w.candidates.map((c) => c.id))
    w.tick = 7 * 24; dailyPeople(w)
    expect(w.candidates).toHaveLength(8)
    expect(w.candidates.some((c) => before.has(c.id))).toBe(false)
  })
  it('the dataset market keeps restocking with bigger editions', () => {
    expect(datasetCatalog(2040).length).toBeGreaterThan(datasetCatalog(2030).length)
    expect(genDataset(40).tokensT).toBeGreaterThan(genDataset(0).tokensT)
    expect(datasetById('gen-12')!.id).toBe('gen-12')
    expect(datasetById('gen-x')).toBeUndefined()
    const w = createWorld(7); w.cash = 1e12; w.tick = 3 * 8766
    expect(A.buyDataset(w, 'gen-0').ok).toBe(true)
    expect(A.buyDataset(w, 'gen-0').ok).toBe(false)
  })
  it('training outlook names the bottleneck', () => {
    const elo = (p: number, t: number): number => eloFromLoss(modelLoss(p, p, t, false, 1))
    expect(trainingOutlook((s, d) => elo(0.05 * s, 50 * d)).lever).toBe('size')
    expect(trainingOutlook((s, d) => elo(500 * s, 0.01 * d)).lever).toBe('data')
  })
})

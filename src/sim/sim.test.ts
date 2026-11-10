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
  const h = A.buildHall(w, site.id, { slots: 24, cooling: 'air', powerKw: 1500, coolKw: 1600, fabric: 'eth100' })
  if (!h.ok) throw new Error(h.error)
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
    expect(hall.racks.length).toBe(4)
    expect(hall.racks.every((r) => r.servers === 1)).toBe(true)
  })
  it('survives three years of idle play without NaN and valuation is finite', () => {
    const { w } = boot(3)
    stepMany(w, 24 * 365 * 3)
    expect(Number.isFinite(valuation(w))).toBe(true)
    expect(w.competitors.length).toBeGreaterThan(4)
  })
})

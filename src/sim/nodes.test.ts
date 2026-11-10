import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { DESIGN_FEE, designNode, nodeSpec } from './nodes'
import { gpuById } from './data/hardware'
import { boot, firstGpu } from './testkit'
import { gpu } from './util'

describe('node designer', () => {
  const base = gpuById('nv-h1000')
  it('balanced air node equals the reference GPU apart from host RAM and parts', () => {
    const s = nodeSpec(base, { cooling: 'air', power: 'balanced', ramTB: 2, parts: 'standard' })
    expect(s.tflops).toBe(base.tflops)
    expect(s.tdpW).toBe(base.tdpW)
    expect(s.mtbfH).toBe(base.mtbfH)
  })
  it('liquid cooling trades cold-plate cost for sustained clocks and less power', () => {
    const air = nodeSpec(base, { cooling: 'air', power: 'balanced', ramTB: 2, parts: 'standard' })
    const liq = nodeSpec(base, { cooling: 'liquid', power: 'balanced', ramTB: 2, parts: 'standard' })
    expect(liq.tflops).toBeCloseTo(base.tflops * 1.06, 0)
    expect(liq.tdpW).toBeLessThan(air.tdpW)
    expect(liq.priceUsd).toBeGreaterThan(air.priceUsd)
    expect(liq.node?.cooling).toBe('liquid')
  })
  it('power profiles bend perf-per-watt: eco is more efficient, max is faster', () => {
    const eco = nodeSpec(base, { cooling: 'air', power: 'eco', ramTB: 2, parts: 'standard' })
    const max = nodeSpec(base, { cooling: 'air', power: 'max', ramTB: 2, parts: 'standard' })
    expect(eco.tflops / eco.tdpW).toBeGreaterThan(base.tflops / base.tdpW)
    expect(max.tflops).toBeGreaterThan(base.tflops)
  })
  it('premium parts raise MTBF and price; more RAM costs more', () => {
    const std = nodeSpec(base, { cooling: 'air', power: 'balanced', ramTB: 2, parts: 'standard' })
    const pre = nodeSpec(base, { cooling: 'air', power: 'balanced', ramTB: 4, parts: 'premium' })
    expect(pre.mtbfH).toBeGreaterThan(std.mtbfH)
    expect(pre.priceUsd).toBeGreaterThan(std.priceUsd)
  })
  it('designing charges the fee, registers the SKU, and it can be ordered like any server', () => {
    const { w, site } = boot(4)
    const cash = w.cash
    const r = designNode(w, 'Northwind N8', firstGpu(w), { cooling: 'air', power: 'eco', ramTB: 2, parts: 'premium' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(w.cash).toBeCloseTo(cash - DESIGN_FEE, 0)
    expect(gpu(w, r.value.id).name).toBe('Northwind N8')
    expect(A.orderServers(w, site.id, r.value.id, 2).ok).toBe(true)
  })
  it('liquid nodes refuse air-cooled halls', () => {
    const { w, site, hall } = boot(4)
    const r = designNode(w, 'Wet One', firstGpu(w), { cooling: 'liquid', power: 'balanced', ramTB: 2, parts: 'standard' })
    if (!r.ok) throw new Error(r.error)
    site.stock[r.value.id] = 4
    while (w.tick < hall.readyTick) w.tick++
    const res = A.installServers(w, site.id, hall.id, r.value.id, 4)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/liquid/i)
  })
  it('rejects unknown or CPU bases and blank names', () => {
    const { w } = boot(4)
    expect(designNode(w, 'X', 'nope', { cooling: 'air', power: 'balanced', ramTB: 2, parts: 'standard' }).ok).toBe(false)
    expect(designNode(w, '  ', firstGpu(w), { cooling: 'air', power: 'balanced', ramTB: 2, parts: 'standard' }).ok).toBe(false)
  })
})

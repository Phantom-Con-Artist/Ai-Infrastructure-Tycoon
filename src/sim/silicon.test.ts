import { describe, expect, it } from 'vitest'
import { evaluateChip, diesPerWafer } from './silicon'

describe('chip physics calibration', () => {
  it('an H100-like design lands near H100 specs', () => {
    const e = evaluateChip({ kind: 'gpu', name: 'H', nodeId: 'n4', dieMm2: 814, dies: 1, pkg: 'cowos-s', computeFrac: 0.5, sramFrac: 0.2, clockGHz: 1.83, archGen: 1, precision: 'fp8', redundancy: true, hbmId: 'hbm3', hbmStacks: 5, hbmHeight: 8 }, 2023)
    console.log(JSON.stringify({ T: e.transistorsB, tf: e.tflops, w: e.tdpW, gb: e.memGB, tbs: e.memTBs, y: e.dieYield, dpw: e.dpw, cost: e.unitCost, nre: e.nreUsd, sram: e.sramMB, p: e.problems }))
    expect(e.transistorsB).toBeGreaterThan(70); expect(e.transistorsB).toBeLessThan(110)
    expect(e.tflops).toBeGreaterThan(800); expect(e.tflops).toBeLessThan(1300)
    expect(e.tdpW).toBeGreaterThan(550); expect(e.tdpW).toBeLessThan(900)
    expect(e.memGB).toBe(80)
    expect(diesPerWafer(814)).toBeGreaterThan(55); expect(diesPerWafer(814)).toBeLessThan(70)
  })
})

import { createWorld, stepMany } from './world'
import * as C from './chips'
import * as A from './actions'
describe('chip business', () => {
  it('design → tape-out → production → servers → sales', () => {
    const w = createWorld(4); w.cash = 5e9
    w.research.done.push('fabless', 'chiplets', 'hbm3'); w.research.levels = { fabless: 1, chiplets: 1, hbm3: 1 }
    const site = (A.buildSite(w, 'or') as any).value
    const spec = { kind: 'gpu' as const, name: 'Dreamchip 1', nodeId: 'n7', dieMm2: 600, dies: 1, pkg: 'cowos-s' as const, computeFrac: 0.5, sramFrac: 0.2, clockGHz: 1.6, archGen: 1, precision: 'bf16' as const, redundancy: true, hbmId: 'hbm3', hbmStacks: 4, hbmHeight: 8 }
    const r = C.startDesign(w, spec); expect(r.ok).toBe(true)
    const d = (r as any).value
    stepMany(w, d.readyTick - w.tick + 48)
    expect(d.status).toBe('ready')
    expect(w.customGpus.length).toBe(1)
    expect(C.setProduction(w, d.id, 500, 'foundry').ok).toBe(true)
    stepMany(w, 24 * 30)
    expect(w.silicon.chipStock[d.id] + d.sold).toBeGreaterThan(100)
    d.salePrice = 1e9 // stop sales so we can build servers
    stepMany(w, 24 * 5)
    expect(C.buildServersFromChips(w, d.id, site.id, 10).ok).toBe(true)
    expect(site.stock[d.gpuId]).toBe(10)
  })
})

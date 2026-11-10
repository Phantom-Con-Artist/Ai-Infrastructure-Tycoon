import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { createWorld, step, stepMany } from './world'
import { energyPrice } from './facility'
import { marketDemandTokensPerDay } from './market'
import { boot, firstGpu, ready } from './testkit'
import type { RuleKey } from './rules'

const withMult = (k: RuleKey, v: number) => ({ mode: 'sandbox' as const, mult: { [k]: v } as Record<RuleKey, number> })

describe('difficulty multipliers', () => {
  it('hardwarePrice scales server cost', () => {
    const a = boot(3), b = boot(3, withMult('hardwarePrice', 2))
    const g = firstGpu(a.w)
    const ca = a.w.cash; A.orderServers(a.w, a.site.id, g, 4); const da = ca - a.w.cash
    const cb = b.w.cash; A.orderServers(b.w, b.site.id, g, 4); const db = cb - b.w.cash
    expect(db / da).toBeCloseTo(2, 2)
  })
  it('powerPrice scales energy price', () => {
    const a = boot(3), b = boot(3, withMult('powerPrice', 2))
    expect(energyPrice(b.w, b.site) / energyPrice(a.w, a.site)).toBeCloseTo(2, 5)
  })
  it('demand scales market token demand', () => {
    const a = createWorld(3), b = createWorld(3, 'x', 'y', 'cfo', undefined, withMult('demand', 2))
    expect(marketDemandTokensPerDay(b) / marketDemandTokensPerDay(a)).toBeCloseTo(2, 5)
  })
  it('researchSpeed scales research progress per day', () => {
    const a = createWorld(3), b = createWorld(3, 'x', 'y', 'cfo', undefined, withMult('researchSpeed', 2))
    for (const w of [a, b]) { expect(A.startResearch(w, 'hotaisle').ok).toBe(true); stepMany(w, 24) }
    expect(b.research.progressUsd / a.research.progressUsd).toBeCloseTo(2, 2)
  })
  it('failureRate changes how many servers break', () => {
    const run = (m: number): number => {
      const { w, site, hall } = boot(5, withMult('failureRate', m)); w.cash = 1e10
      ready(w, site, hall, firstGpu(w), 64)
      let failed = 0
      for (let i = 0; i < 1500; i++) { step(w); for (const r of hall.racks) failed += r.failed }
      return failed
    }
    expect(run(4)).toBeGreaterThan(run(0.25) * 2)
  })
  it('rivalAggression brings procedural rival releases sooner', () => {
    const a = createWorld(3), b = createWorld(3, 'x', 'y', 'cfo', undefined, withMult('rivalAggression', 4))
    stepMany(a, 24 * 365 * 4); stepMany(b, 24 * 365 * 4)
    const elo = (w: typeof a): number => w.competitors.reduce((s, c) => s + c.elo, 0)
    expect(elo(b)).toBeGreaterThan(elo(a) + 100)
  })
})
describe('money rules', () => {
  it('noBankruptcy prevents game over', () => {
    const a = createWorld(3), b = createWorld(3, 'x', 'y', 'cfo', undefined, { mode: 'sandbox', noBankruptcy: true })
    a.cash = -1e9; b.cash = -1e9
    stepMany(a, 24 * 40); stepMany(b, 24 * 40)
    expect(a.gameOver).toBe(true)
    expect(b.gameOver).toBe(false)
  })
  it('infiniteCash lets you buy anything and never go bankrupt', () => {
    const { w, site } = boot(3, { mode: 'sandbox', infiniteCash: true })
    w.cash = 0
    expect(A.orderServers(w, site.id, firstGpu(w), 10_000).ok).toBe(true)
    stepMany(w, 24 * 40)
    expect(w.gameOver).toBe(false)
  })
})

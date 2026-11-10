import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { createWorld, step, valuation } from './world'
import { makeCandidate } from './people'
import { setAutopilot } from './managers'
import { SYSTEMS } from './types'

describe('scale', () => {
  for (const managed of [false, true]) it(`a 20k-GPU company simulates a year fast and stays finite${managed ? ' (all managers on)' : ''}`, () => {
    const w = createWorld(77); w.cash = 5e10
    w.research.done.push('rdhx', 'dlc'); w.research.levels.rdhx = 1; w.research.levels.dlc = 1
    const site = (A.buildSite(w, 'tx') as any).value
    site.utilityMw = 500
    for (let i = 0; i < 3; i++) {
      const h = (A.buildHall(w, site.id, { size: 'XL', cooling: 'dlc', fabric: 'eth100' }) as any).value
      A.autoLayout(w, h.id)
    }
    A.orderServers(w, site.id, 'nv-h1000', 2500)
    while ((site.stock['nv-h1000'] ?? 0) < 2500 || site.halls.some((h: any) => w.tick < h.readyTick)) step(w)
    for (const h of site.halls) A.installServers(w, site.id, h.id, 'nv-h1000', 2500)
    A.setRental(w, site.id, 'nv-h1000', 2000, 1, 'reserved')
    if (managed) for (const sys of SYSTEMS) { w.people.push({ ...makeCandidate(w), role: `mgr-${sys}` as const, skill: 7, hiredTick: w.tick }); expect(setAutopilot(w, sys, true).ok).toBe(true) }
    const t0 = performance.now()
    for (let i = 0; i < 24 * 365; i++) step(w)
    const ms = performance.now() - t0
    console.log(`1 game-year at 20k GPUs${managed ? ' (managed)' : ''}: ${ms.toFixed(0)} ms, valuation ${valuation(w).toExponential(2)}`)
    expect(Number.isFinite(valuation(w))).toBe(true)
    expect(ms).toBeLessThan(20000)
  }, 120_000)
})

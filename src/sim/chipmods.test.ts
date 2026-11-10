import { describe, expect, it } from 'vitest'
import { CHIP_MODS } from './data/silicon'
import { evaluateChip, type ChipSpec } from './silicon'

const base: ChipSpec = {
  kind: 'gpu', name: 'T', nodeId: 'n4', dieMm2: 600, dies: 1, pkg: 'mono', computeFrac: 0.5, sramFrac: 0.2, clockGHz: 1.8,
  archGen: 1, precision: 'bf16', redundancy: true, hbmId: 'hbm2e', hbmStacks: 2, hbmHeight: 8
}

describe('absurd chip mods', () => {
  it('ships at least 10 mods with names, blurbs and at least one real effect each', () => {
    expect(CHIP_MODS.length).toBeGreaterThanOrEqual(10)
    for (const m of CHIP_MODS) {
      expect(m.name && m.blurb).toBeTruthy()
      const effects = ['tflops', 'tdp', 'tdpAdd', 'cost', 'nre', 'months', 'appeal', 'yield'].filter((k) => (m as unknown as Record<string, unknown>)[k] !== undefined)
      expect(effects.length).toBeGreaterThan(0)
    }
  })
  it('no mods = unchanged evaluation, appeal 1', () => {
    const a = evaluateChip(base, 2023), b = evaluateChip({ ...base, mods: [] }, 2023)
    expect(b.tflops).toBe(a.tflops); expect(b.tdpW).toBe(a.tdpW); expect(b.unitCost).toBe(a.unitCost)
    expect(a.appeal).toBe(1)
  })
  it('a gold heat spreader costs a fortune, runs a touch cooler and sells on looks', () => {
    const a = evaluateChip(base, 2023), g = evaluateChip({ ...base, mods: ['gold'] }, 2023)
    expect(g.unitCost).toBeGreaterThan(a.unitCost + 5000)
    expect(g.tdpW).toBeLessThan(a.tdpW)
    expect(g.appeal).toBeGreaterThan(1)
  })
  it('ludicrous binning trades power for speed; quantum garnish adds NRE and hype but no FLOPS', () => {
    const a = evaluateChip(base, 2023)
    const l = evaluateChip({ ...base, mods: ['ludicrous'] }, 2023)
    expect(l.tflops).toBeGreaterThan(a.tflops); expect(l.tdpW).toBeGreaterThan(a.tdpW)
    const q = evaluateChip({ ...base, mods: ['quantum'] }, 2023)
    expect(q.tflops).toBe(a.tflops); expect(q.nreUsd).toBeGreaterThan(a.nreUsd); expect(q.appeal).toBeGreaterThan(1.2)
  })
  it('mods stack multiplicatively and unknown ids are ignored', () => {
    const a = evaluateChip({ ...base, mods: ['rgb'] }, 2023).appeal
    const b = evaluateChip({ ...base, mods: ['rgb', 'quantum', 'bogus'] }, 2023).appeal
    expect(b).toBeGreaterThan(a)
  })
})

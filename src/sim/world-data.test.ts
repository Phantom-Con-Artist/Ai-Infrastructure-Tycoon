import { describe, expect, it } from 'vitest'
import { REGIONS } from './data/hardware'
import { CORPS, RIVAL_HUBS } from './data/lore'

describe('world content', () => {
  it('has 15 regions with unique ids and real coordinates', () => {
    expect(REGIONS).toHaveLength(15)
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(15)
    for (const r of REGIONS) {
      expect(Math.abs(r.ll[0])).toBeLessThanOrEqual(180)
      expect(Math.abs(r.ll[1])).toBeLessThanOrEqual(90)
    }
    for (const id of ['de', 'jp', 'au', 'br', 'in', 'ae']) expect(REGIONS.some((r) => r.id === id)).toBe(true)
  })
  it('has at least 30 parody corps, each with a CEO, unique ids and a brand mark', () => {
    expect(CORPS.length).toBeGreaterThanOrEqual(30)
    expect(new Set(CORPS.map((c) => c.id)).size).toBe(CORPS.length)
    for (const c of CORPS) {
      expect(c.ceo.length).toBeGreaterThan(2)
      expect(c.mark).toBeTruthy()
    }
  })
  it('places rival datacenter hubs for known corps on the globe', () => {
    expect(RIVAL_HUBS.length).toBeGreaterThanOrEqual(16)
    for (const h of RIVAL_HUBS) {
      expect(CORPS.some((c) => c.id === h.corp)).toBe(true)
      expect(Math.abs(h.ll[1])).toBeLessThanOrEqual(90)
    }
  })
})

describe('save backfill', () => {
  it('adds rivals missing from an older save without touching existing ones', async () => {
    const { createWorld } = await import('./world')
    const { backfillRivals } = await import('./corporate')
    const w = createWorld(3)
    w.rivals = w.rivals.slice(0, 14)
    w.rivals[0].valuation = 123
    backfillRivals(w)
    expect(w.rivals).toHaveLength(CORPS.length)
    expect(w.rivals[0].valuation).toBe(123)
  })
})

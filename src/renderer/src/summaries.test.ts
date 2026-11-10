import { describe, expect, it } from 'vitest'
import { createWorld, stepMany } from '@sim/world'
import * as A from '@sim/actions'
import * as Sum from './summaries'

const fresh = () => createWorld(4)
const running = () => {
  const w = createWorld(4); w.cash = 3e8
  const s = (A.buildSite(w, 'or') as { ok: true; value: { id: string } }).value
  const h = (A.buildHall(w, s.id, { size: 'M', cooling: 'air', fabric: 'eth100' }) as { ok: true; value: { id: string } }).value
  A.autoLayout(w, h.id)
  stepMany(w, 24 * 40)
  return w
}
const fns = { fleet: Sum.fleetSummary, lab: Sum.labSummary, silicon: Sum.siliconSummary, store: Sum.storeSummary, contracts: Sum.contractsSummary, research: Sum.researchSummary, finance: Sum.financeSummary, team: Sum.teamSummary, rankings: Sum.rankingsSummary }

describe('screen summaries', () => {
  for (const [name, f] of Object.entries(fns)) {
    it(`${name}: 3–4 readable stats on an empty and a running company`, () => {
      for (const w of [fresh(), running()]) {
        const items = f(w)
        expect(items.length).toBeGreaterThanOrEqual(3)
        expect(items.length).toBeLessThanOrEqual(4)
        for (const it of items) {
          expect(it.label.length).toBeGreaterThan(0)
          expect(String(it.value)).not.toMatch(/NaN|undefined|Infinity/)
          if (it.hint) expect(it.hint).not.toMatch(/NaN|undefined|Infinity/)
        }
      }
    })
  }
  it('fleet counts GPUs (8 per server) and shows rented servers as busy', () => {
    const w = createWorld(4); w.cash = 1e10
    const s = (A.buildSite(w, 'or') as { ok: true; value: { id: string; stock: Record<string, number> } }).value
    const h = (A.buildHall(w, s.id, { size: 'M', cooling: 'air', fabric: 'eth100' }) as { ok: true; value: { id: string; readyTick: number } }).value
    A.autoLayout(w, h.id)
    const g = 'nv-v100x'
    A.orderServers(w, s.id, g, 10)
    while (w.tick < h.readyTick + 24 || (s.stock[g] ?? 0) < 10) stepMany(w, 1)
    A.installServers(w, s.id, h.id, g, 10)
    A.setRental(w, s.id, g, 5, 1)
    const items = Sum.fleetSummary(w)
    expect(items[0].value).toBe('80')
    expect(items[1].value).toBe('50%')
  }, 30_000)
  it('finance caps a very long runway at a readable value', () => {
    const w = running()
    w.cash = 1e15
    w.ledger.forEach((d) => { d.revenue = 0; d.opex = 1000 })
    expect(Sum.financeSummary(w).find((i) => i.label === 'Runway')!.value).toBe('Over 3 years')
  })
  it('finance flags a short runway as negative', () => {
    const w = running()
    w.cash = 1
    const runway = Sum.financeSummary(w).find((i) => i.label === 'Runway')!
    expect(runway.tone).toBe('neg')
  })
})

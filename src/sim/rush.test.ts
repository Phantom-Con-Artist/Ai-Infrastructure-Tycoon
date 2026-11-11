import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { jobs, rushCost } from './progress'
import { rushJob } from './rush'
import { createWorld, stepMany } from './world'

describe('sandbox rush', () => {
  it('refuses in career mode', () => {
    const w = createWorld(3)
    const s = A.buildSite(w, 'or'); if (!s.ok) throw new Error(s.error)
    const h = A.buildHall(w, s.value.id, { size: 'S', cooling: 'air', fabric: 'eth100' }); if (!h.ok) throw new Error(h.error)
    const r = rushJob(w, h.value.id)
    expect(r.ok).toBe(false)
    expect(h.value.readyTick).toBeGreaterThan(w.tick)
  })
  it('finishes a hall build at once in sandbox, for an absurd fee', () => {
    const w = createWorld(3, 'Sand', 'You', 'cfo', undefined, { mode: 'sandbox', infiniteCash: true })
    const s = A.buildSite(w, 'or'); if (!s.ok) throw new Error(s.error)
    const h = A.buildHall(w, s.value.id, { size: 'S', cooling: 'air', fabric: 'eth100' }); if (!h.ok) throw new Error(h.error)
    const job = jobs(w).find((j) => j.id === h.value.id)!
    expect(rushCost(job)).toBeGreaterThanOrEqual(5e6)
    expect(rushJob(w, h.value.id).ok).toBe(true)
    stepMany(w, 2)
    expect(jobs(w).some((j) => j.id === h.value.id)).toBe(false)
  })
})

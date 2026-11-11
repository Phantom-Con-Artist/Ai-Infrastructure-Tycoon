import { TECHS, techCost } from './data/tech'
import { jobs, rushCost } from './progress'
import { canAfford } from './rules'
import type { World } from './types'
import { spend } from './util'
import { finishRun } from './world'

export type RushResult = { ok: true; value: undefined } | { ok: false; error: string }

/** Sandbox only: pay an absurd price to finish a timed job this instant. */
export function rushJob(w: World, jobId: string): RushResult {
  if (w.rules?.mode !== 'sandbox') return { ok: false, error: 'Rushing is a sandbox-only cheat' }
  const job = jobs(w).find((j) => j.id === jobId)
  if (!job) return { ok: false, error: 'That job already finished' }
  const cost = rushCost(job)
  if (!canAfford(w, cost)) return { ok: false, error: `Need $${(cost / 1e6).toFixed(0)}M to rush this` }
  const now = w.tick
  for (const s of w.sites) {
    const o = s.orders.find((x) => x.id === jobId); if (o) o.arriveTick = now
    const h = s.halls.find((x) => x.id === jobId); if (h) h.readyTick = now
    const g = s.gens.find((x) => x.id === jobId); if (g) g.readyTick = now
    s.pendingUtility.forEach((p, i) => { if (`${s.id}-u${i}` === jobId) p.readyTick = now })
  }
  if (w.runs.some((r) => r.id === jobId)) finishRun(w, jobId)
  const d = w.silicon.designs.find((x) => x.id === jobId); if (d) d.readyTick = now
  if (jobId === 'fab' && w.silicon.fab) w.silicon.fab.readyTick = now
  const dp = w.data?.projects.find((x) => x.id === jobId); if (dp) dp.doneT = dp.targetT
  for (const p of w.products) {
    if (p.id + 'b' === jobId && p.building) p.building.readyTick = now
    if (p.id + 't' === jobId && p.test) p.test.endTick = now
  }
  if (jobId === 'research' && w.research.current) {
    const t = TECHS.find((x) => x.id === w.research.current)
    if (t) w.research.progressUsd = techCost(t, w.research.levels[t.id] ?? 0)
  }
  spend(w, cost)
  return { ok: true, value: undefined }
}

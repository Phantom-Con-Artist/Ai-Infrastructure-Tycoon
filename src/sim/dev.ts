/** Developer / sandbox tools. Every function refuses unless the world was created with `rules.devTools`. */
import { TECHS } from './data/tech'
import { clamp, findSite, gpu } from './util'
import { recomputeStaff } from './people'
import { step } from './world'
import type { World } from './types'

type R = { ok: true; value: undefined } | { ok: false; error: string }
const OFF: R = { ok: false, error: 'Dev tools are off' }
const ok: R = { ok: true, value: undefined }
const on = (w: World): boolean => !!w.rules?.devTools

export function devAddCash(w: World, usd: number): R { if (!on(w)) return OFF; w.cash += usd; return ok }
export function devSetReputation(w: World, n: number): R { if (!on(w)) return OFF; w.reputation = clamp(n, 0, 100); return ok }
export function devFastResearch(w: World, fast: boolean): R { if (!on(w)) return OFF; w.rules.mult.researchSpeed = fast ? 4 : 1; return ok }
export function devUnlockTech(w: World, id: string | 'all'): R {
  if (!on(w)) return OFF
  const list = id === 'all' ? TECHS : TECHS.filter((t) => t.id === id)
  if (!list.length) return { ok: false, error: `Unknown tech “${id}”` }
  for (const t of list) {
    if (!w.research.done.includes(t.id)) w.research.done.push(t.id)
    w.research.levels[t.id] = Math.max(1, w.research.levels[t.id] ?? 0)
  }
  const got = new Set(list.map((t) => t.id))
  w.research.queue = (w.research.queue ?? []).filter((q) => !got.has(q) || !!TECHS.find((t) => t.id === q)?.repeatable)
  for (const q of got) if (w.research.partial) delete w.research.partial[q]
  if (w.research.current && got.has(w.research.current)) {
    const next = w.research.queue.shift()
    w.research.current = next; w.research.progressUsd = next ? w.research.partial?.[next] ?? 0 : 0
    if (next && w.research.partial) delete w.research.partial[next]
  }
  recomputeStaff(w)
  return ok
}
export function devSkipDays(w: World, days: number): R {
  if (!on(w)) return OFF
  for (let i = 0; i < Math.round(days * 24); i++) step(w)
  return ok
}
export function devSpawnServers(w: World, siteId: string, gpuId: string, count: number): R {
  if (!on(w)) return OFF
  const s = findSite(w, siteId); gpu(w, gpuId)
  s.stock[gpuId] = (s.stock[gpuId] ?? 0) + Math.max(0, Math.round(count))
  return ok
}

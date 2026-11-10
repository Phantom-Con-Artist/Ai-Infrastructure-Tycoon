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
  if (w.research.current && list.some((t) => t.id === w.research.current)) { w.research.current = undefined; w.research.progressUsd = 0 }
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

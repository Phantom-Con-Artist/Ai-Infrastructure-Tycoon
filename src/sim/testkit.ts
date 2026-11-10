/** Test-only helpers shared by sim tests (not imported by game code). */
import * as A from './actions'
import { createWorld, step } from './world'
import type { Rules } from './rules'
import type { Hall, Site, World } from './types'
import { gpuCatalog } from './data/hardware'
import { yearOf } from './util'

export function boot(seed = 7, rules: Partial<Rules> = {}): { w: World; site: Site; hall: Hall } {
  const w = createWorld(seed, 'Test Co', 'You', 'cfo', undefined, rules)
  const s = A.buildSite(w, 'or'); if (!s.ok) throw new Error(s.error)
  const h = A.buildHall(w, s.value.id, { size: 'M', cooling: 'air', fabric: 'eth100' }); if (!h.ok) throw new Error(h.error)
  const lay = A.autoLayout(w, h.value.id); if (!lay.ok) throw new Error(lay.error)
  return { w, site: s.value, hall: h.value }
}
export const firstGpu = (w: World): string => gpuCatalog(yearOf(w.tick)).filter((g) => !g.vcpus)[0].id
/** Order n servers, wait for the hall and delivery, install them. */
export function ready(w: World, site: Site, hall: Hall, gpuId: string, n: number): void {
  const o = A.orderServers(w, site.id, gpuId, n); if (!o.ok) throw new Error(o.error)
  while (w.tick < hall.readyTick + 24 || (site.stock[gpuId] ?? 0) < n) step(w)
  const r = A.installServers(w, site.id, hall.id, gpuId, n); if (!r.ok) throw new Error(r.error)
}
/** FNV-1a 32-bit hash for determinism fingerprints. */
export function fnv(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16)
}

import { COOLING, FABRICS, type CoolingType, type FabricType, type GpuSpec, gpuById } from './data/hardware'
import { TECHS } from './data/tech'
import { HOURS_PER_YEAR, START_YEAR, type Hall, type Site, type World } from './types'

export const newId = (w: World, p: string): string => `${p}${(w.nextId++).toString(36)}`
export const yearOf = (tick: number): number => START_YEAR + tick / HOURS_PER_YEAR
export const dayOf = (tick: number): number => Math.floor(tick / 24)
export const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x))
export const hasTech = (w: World, id: string): boolean => w.research.done.includes(id)
export const techLevel = (w: World, id: string): number => w.research.levels?.[id] ?? (w.research.done.includes(id) ? 1 : 0)
/** Sum of numeric effect values for effects like "mfu:0.08". */
const techMemo = new WeakMap<World, { stamp: string; cache: Map<string, number> }>()
export function techSum(w: World, key: string): number {
  const stamp = w.research.done.length + ':' + Object.values(w.research.levels ?? {}).reduce((a, b) => a + b, 0)
  let memo = techMemo.get(w)
  if (!memo || memo.stamp !== stamp) { memo = { stamp, cache: new Map() }; techMemo.set(w, memo) }
  const hit = memo.cache.get(key)
  if (hit !== undefined) return hit
  const v = techSumRaw(w, key)
  memo.cache.set(key, v)
  return v
}
function techSumRaw(w: World, key: string): number {
  let s = 0
  for (const t of TECHS) {
    if (!t.effect.startsWith(key + ':')) continue
    const lv = w.research.levels?.[t.id] ?? (w.research.done.includes(t.id) ? 1 : 0)
    s += parseFloat(t.effect.split(':')[1]) * lv
  }
  return s
}
export const coolingUnlocked = (w: World, c: CoolingType): boolean => !COOLING[c].needsTech || hasTech(w, COOLING[c].needsTech!)
export const fabricUnlocked = (w: World, f: FabricType): boolean => !FABRICS[f].needsTech || hasTech(w, FABRICS[f].needsTech!)
export const gpu = (w: World, id: string): GpuSpec => w.customGpus?.find((g) => g.id === id) ?? gpuById(id, yearOf(w.tick) + 50)
export const advisorPerk = (w: World, id: string): boolean => w.advisor === id

export const hallServers = (h: Hall, gpuId?: string): number => h.racks.reduce((a, r) => a + (gpuId && r.gpuId !== gpuId ? 0 : r.servers), 0)
export const hallHealthy = (h: Hall, gpuId?: string): number => h.racks.reduce((a, r) => a + (gpuId && r.gpuId !== gpuId ? 0 : r.powered ? r.servers - r.failed : 0), 0)
export const siteServers = (s: Site, gpuId?: string): number => s.halls.reduce((a, h) => a + hallServers(h, gpuId), 0)
export const siteHealthy = (s: Site, gpuId?: string): number => s.halls.reduce((a, h) => a + (h.online ? hallHealthy(h, gpuId) : 0), 0)
export const totalGpus = (w: World): number => w.sites.reduce((a, s) => a + siteServers(s) * 8, 0)
export const findSite = (w: World, id: string): Site => {
  const s = w.sites.find((x) => x.id === id)
  if (!s) throw new Error('no such site ' + id)
  return s
}

/** Servers at (site,gpu) already promised to rentals, serving deployments and running training. */
export function committed(w: World, siteId: string, gpuId: string, except?: string): number {
  let n = 0
  for (const r of w.rentals) if (r.siteId === siteId && r.gpuId === gpuId && r.id !== except) n += r.servers
  for (const d of w.deployments) if (d.siteId === siteId && d.gpuId === gpuId && d.id !== except) n += d.servers
  for (const t of w.runs) if (t.status === 'running' && t.siteId === siteId && t.gpuId === gpuId && t.id !== except) n += t.servers
  return n
}
export const worstFabric = (s: Site, gpuId: string): FabricType => {
  const order: FabricType[] = ['eth100', 'ib400', 'ib800', 'ib1600']
  let worst = 3
  for (const h of s.halls) if (hallServers(h, gpuId) > 0) worst = Math.min(worst, order.indexOf(h.fabric))
  return order[worst]
}
export function pushNews(w: World, kind: 'info' | 'good' | 'bad' | 'event', title: string, body: string): void {
  w.news.unshift({ tick: w.tick, kind, title, body })
  if (w.news.length > 80) w.news.length = 80
}
export function spend(w: World, usd: number, bucket: 'capex' | 'opex' = 'capex'): void {
  w.cash -= usd
  w.today[bucket] += usd
}

import { gpuCatalog, type GpuSpec } from './data/hardware'
import { rentalPrice } from './market'
import type { World } from './types'
import { committed, yearOf } from './util'

/** Pseudo-site id for compute rented from third-party clouds (Amazoon & co). */
export const CLOUD = 'cloud'
/** $/GPU-hour you pay to rent: market rate plus the hyperscaler's margin. */
export const cloudRate = (w: World, g: GpuSpec): number => rentalPrice(w, g) * 1.35
/** Rentable GPU types: only third-party silicon from the last few years. */
export const cloudGpus = (w: World): GpuSpec[] => gpuCatalog(yearOf(w.tick)).filter((g) => g.year >= yearOf(w.tick) - 4)
/** Servers you can rent right now: grows with the market, shrinks in a supply crunch. */
export function cloudCapacity(w: World, gpuId: string): number {
  const years = w.tick / 8766
  const cap = Math.round(256 * Math.pow(1.9, Math.min(years, 8)) / Math.max(0.5, w.market.supplyTight + 0.5))
  return Math.max(0, cap - committed(w, CLOUD, gpuId))
}

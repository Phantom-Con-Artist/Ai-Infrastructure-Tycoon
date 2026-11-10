/** Deterministic, serializable RNG (mulberry32). State lives in the world so saves replay identically. */
export interface Seeded { rng: number }

export function rnd(w: Seeded): number {
  w.rng = (w.rng + 0x6d2b79f5) | 0
  let t = w.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
export const range = (w: Seeded, a: number, b: number): number => a + (b - a) * rnd(w)
export function gauss(w: Seeded): number {
  const u = Math.max(1e-12, rnd(w))
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd(w))
}
export function poisson(w: Seeded, lambda: number): number {
  if (lambda <= 0) return 0
  if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(w)))
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do { k++; p *= rnd(w) } while (p > L)
  return k - 1
}
export const pick = <T,>(w: Seeded, a: readonly T[]): T => a[Math.floor(rnd(w) * a.length)]

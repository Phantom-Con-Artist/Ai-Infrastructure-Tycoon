import { GPUS_PER_SERVER, fabricEfficiency, type FabricType, type GpuSpec } from './data/hardware'
import { hasTech, techSum, advisorPerk, clamp } from './util'
import type { World } from './types'

/** Chinchilla-style parametric loss: L = E + A/N^a + B/D^b. */
export function modelLoss(paramsB: number, activeParamsB: number, tokensT: number, moe: boolean, dataQuality: number): number {
  const nEff = moe ? activeParamsB * Math.pow(Math.max(1, paramsB / activeParamsB), 0.45) : paramsB
  const dEff = tokensT * 1e12 * Math.max(0.2, dataQuality)
  return 1.69 + 406.4 / Math.pow(nEff * 1e9, 0.34) + 410.7 / Math.pow(dEff, 0.28)
}
export const eloFromLoss = (loss: number): number => 1000 + 1500 * (2.3 - loss)
export const trainFlops = (activeParamsB: number, tokensT: number): number => 6 * activeParamsB * 1e9 * tokensT * 1e12

/** GB needed to hold weights + grads + Adam state in mixed precision (~16 B/param). */
export const trainMemoryGB = (paramsB: number): number => paramsB * 16
export const serveMemoryGB = (paramsB: number): number => paramsB * 2

export function trainingMfu(w: World, fabricServers: number, fabric: FabricType): number {
  const base = 0.4 * fabricEfficiency(fabric, fabricServers)
  let m = base * (1 + techSum(w, 'mfu'))
  if (advisorPerk(w, 'cto')) m *= 1.04
  m *= 1 + Math.min(0.06, Math.log10(1 + w.staff.engineers) * 0.03)
  return clamp(m, 0.02, 0.62)
}
/** Fraction of wall-clock not lost to GPU failures and restarts. */
export function goodput(w: World, servers: number, g: GpuSpec, hazard = 1): number {
  const failsPerHour = (servers * GPUS_PER_SERVER * hazard) / g.mtbfH
  const restartH = 0.45 * (hasTech(w, 'ckpt') ? 0.5 : 1) * (1 - Math.min(0.3, w.staff.engineers * 0.01))
  return 1 / (1 + failsPerHour * restartH)
}
export function serveTokPerSecPerServer(w: World, g: GpuSpec, activeParamsB: number): number {
  const util = 0.06 * (1 + techSum(w, 'infer'))
  return (GPUS_PER_SERVER * g.tflops * 1e12 * util) / (2 * activeParamsB * 1e9)
}
export const referencePrice = (years: number, elo: number): number =>
  Math.max(0.08, 12 * Math.pow(0.55, years) * Math.exp((elo - 1500) / 320))

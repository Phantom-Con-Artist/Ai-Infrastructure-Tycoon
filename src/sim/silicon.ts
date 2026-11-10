import { HBM, PACKAGES, WAFER_DIAMETER_MM, WAFER_SCALE_MM2, node, nodeCatalog, type NodeSpec, type PackageKind } from './data/silicon'

/**
 * Chip physics. Calibrated so an H100-like design (N4, 814 mm², 50% compute area, 1.83 GHz, 5×HBM3)
 * lands near 80 B transistors, ~990 dense BF16 TFLOPS and ~700 W.
 */
export type ChipKind = 'gpu' | 'cpu' | 'hbm'
export interface ChipSpec {
  kind: ChipKind; name: string; nodeId: string
  dieMm2: number; dies: number; pkg: PackageKind
  computeFrac: number; sramFrac: number; clockGHz: number
  archGen: number            // tensor-core / core micro-architecture generation from R&D
  precision: 'bf16' | 'fp8' | 'fp4'
  redundancy: boolean        // harvest partially defective dies by fusing off units
  hbmId: string; hbmStacks: number; hbmHeight: number
  cpuCores?: number          // cpu only
}
export interface ChipEval {
  ok: boolean; problems: string[]
  transistorsB: number; atoms: number
  tflops: number; tflopsFp8: number; memGB: number; memTBs: number; sramMB: number
  tdpW: number; wPerMm2: number; coolingNeeded: 'air' | 'liquid' | 'immersion'
  dpw: number; dieYield: number; goodDiesPerWafer: number
  dieCost: number; hbmCost: number; pkgCost: number; unitCost: number
  nreUsd: number; designMonths: number
  perfPerWatt: number; perfPerDollar: number
  cpuScore: number           // SPECint-rate-ish for CPUs
}

const D = WAFER_DIAMETER_MM
/** Standard gross-die-per-wafer approximation, edge loss included. */
export function diesPerWafer(areaMm2: number): number {
  if (areaMm2 >= WAFER_SCALE_MM2 * 0.95) return 1
  return Math.max(0, Math.floor((Math.PI * (D / 2) ** 2) / areaMm2 - (Math.PI * D) / Math.sqrt(2 * areaMm2)))
}
/** Poisson yield with optional harvesting; defect density matures over time. */
export function dieYield(areaMm2: number, n: NodeSpec, year: number, redundancy: boolean, waferScale = false): number {
  const age = Math.max(0, year - n.year)
  const d0 = n.d0 * Math.max(0.35, Math.exp(-0.35 * age))
  if (waferScale) return redundancy ? 0.85 : Math.exp(-(areaMm2 / 100) * d0) // only viable with spare-core routing
  const y = Math.exp(-(areaMm2 / 100) * d0)
  return redundancy ? y + (1 - y) * 0.55 : y
}
const ARCH_FLOP_PER_CYCLE_PER_TR = 1.35e-5 // dense BF16 FLOP / cycle / compute transistor at arch gen 1
const ATOMS_PER_TRANSISTOR = 1e6           // order of magnitude of silicon atoms in one modern FinFET/GAA device incl. local wiring

export function evaluateChip(c: ChipSpec, year: number): ChipEval {
  const n = node(c.nodeId)
  const pkg = PACKAGES[c.pkg]
  const problems: string[] = []
  const waferScale = c.pkg === 'wafer'
  const area = waferScale ? WAFER_SCALE_MM2 : c.dieMm2
  const dies = waferScale ? 1 : Math.max(1, Math.round(c.dies))
  if (!waferScale && area > n.reticleMm2) problems.push(`Die exceeds the ${n.reticleMm2} mm² reticle field of ${n.name}`)
  if (dies > pkg.maxDies) problems.push(`${pkg.name} holds at most ${pkg.maxDies} compute dies`)
  if (c.computeFrac + c.sramFrac > 0.92) problems.push('Compute + SRAM leave no room for I/O, NoC and memory PHYs')
  const hbm = HBM.find((h) => h.id === c.hbmId) ?? HBM[0]
  if (c.kind === 'gpu') {
    const perimeter = 2 * (Math.sqrt(area) * 1.25 + Math.sqrt(area) / 1.25) * dies
    const shoreline = Math.floor(perimeter / 11)
    const pkgStacks = c.pkg === 'mono' ? 2 : waferScale ? 0 : 12 * Math.min(1, pkg.maxInterposerReticles / 3.3) + dies * 2
    if (c.hbmStacks > Math.min(shoreline, pkgStacks)) problems.push(`Only room for ${Math.min(shoreline, Math.floor(pkgStacks))} HBM stacks along the die edge / interposer`)
    if (c.hbmHeight > hbm.maxStack) problems.push(`${hbm.name} stacks top out at ${hbm.maxStack}-high`)
  }
  const totalArea = area * dies
  const transistorsB = (n.densityMTr * totalArea * 0.68) / 1000 // large GPUs pack below peak logic density
  const computeT = transistorsB * 1e9 * c.computeFrac
  const archMult = Math.pow(1.35, c.archGen - 1)
  const tflops = c.kind === 'gpu' ? (computeT * ARCH_FLOP_PER_CYCLE_PER_TR * archMult * c.clockGHz * 1e9) / 1e12 : 0
  const precMult = c.precision === 'fp4' ? 4 : c.precision === 'fp8' ? 2 : 1
  // power: dynamic ∝ switched transistors · f · V², V rises with f above nominal
  const fRatio = c.clockGHz / n.fNomGHz
  const v = 0.62 + 0.24 * fRatio
  const activity = c.kind === 'cpu' ? 0.55 : 1
  const dyn = 5.97 * (transistorsB * (c.computeFrac + 0.35 * c.sramFrac + 0.15)) * c.clockGHz * v * v * n.powerFactor * activity
  const leak = transistorsB * n.leakWPerB * (v / 0.85) ** 2
  const memGB = c.kind === 'gpu' ? (c.hbmStacks * c.hbmHeight * hbm.dieGb) / 8 : 0
  const memTBs = c.kind === 'gpu' ? (c.hbmStacks * hbm.busBits * hbm.gbpsPerPin) / 8 / 1000 : 0
  const hbmW = memTBs * 1e12 * 8 * hbm.pjPerBit * 1e-12
  const tdpW = Math.round(dyn + leak + hbmW + 25 * dies)
  const wPerMm2 = tdpW / totalArea
  const coolingNeeded = wPerMm2 > 1.6 || tdpW > 1500 ? 'immersion' : wPerMm2 > 0.75 || tdpW > 800 ? 'liquid' : 'air'
  if (fRatio > 1.3) problems.push('Clock is beyond what this node can close timing at')
  // economics
  const dpw = diesPerWafer(area)
  const y = dieYield(area, n, year, c.redundancy, waferScale)
  const good = dpw * y
  if (good < 0.05) problems.push('Effectively zero yield: shrink the die or add redundancy')
  const dieCost = good > 0 ? (n.waferUsd / good) * dies : Infinity
  const hbmCost = memGB * hbm.usdPerGB
  const pkgCost = pkg.usd + (c.kind === 'gpu' ? c.hbmStacks * 25 : 0)
  const unitCost = (dieCost + hbmCost + pkgCost) / (1 - pkg.yieldLoss) + 120 // test, burn-in, margin of error
  const nreUsd = n.maskUsd * (waferScale ? 1.5 : 1) + n.designUsd * Math.min(2.2, 0.5 + totalArea / 900) * (c.kind === 'cpu' ? 0.8 : c.kind === 'hbm' ? 0.4 : 1)
  const designMonths = Math.round(8 + nodeCatalog().indexOf(n) * 1.5 + totalArea / 600)
  const sramMB = (transistorsB * 1e9 * c.sramFrac) / 6 / 8 / 1e6 * 0.22 // 6T cells + tags, periphery, register files
  const cores = c.cpuCores ?? 0
  const cpuScore = c.kind === 'cpu' ? cores * c.clockGHz * archMult * 2.4 : 0
  if (c.kind === 'cpu' && cores * 2.2 > transistorsB * 1000 * 0.012) problems.push('Not enough transistors for that many cores at this node')
  const tfl = tflops * precMult
  return {
    ok: problems.length === 0, problems, transistorsB, atoms: transistorsB * 1e9 * ATOMS_PER_TRANSISTOR,
    tflops, tflopsFp8: tfl, memGB, memTBs, sramMB, tdpW, wPerMm2, coolingNeeded,
    dpw, dieYield: y, goodDiesPerWafer: good, dieCost, hbmCost, pkgCost, unitCost, nreUsd, designMonths,
    perfPerWatt: c.kind === 'cpu' ? cpuScore / tdpW : tflops / tdpW, perfPerDollar: c.kind === 'cpu' ? cpuScore / unitCost : tflops / unitCost, cpuScore
  }
}

/** Lithography exposures per wafer for a node using the best tool in the fab. */
export function exposuresPerWafer(n: NodeSpec, tools: string[]): number | null {
  const order = ['hyperna', 'highna', 'euv', 'duv']
  for (const t of order) if (tools.includes(t) && n.critLayers[t] !== undefined) return n.critLayers[t]
  return null
}

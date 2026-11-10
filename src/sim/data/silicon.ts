/**
 * Semiconductor reference data. Numbers are real-world approximations (public estimates) for
 * transistor density, wafer prices, defect densities, mask costs and lithography tools,
 * extended procedurally into the future so the game never runs out of nodes.
 */
export type LithoKind = 'duv' | 'euv' | 'highna' | 'hyperna'

export interface NodeSpec {
  id: string; name: string; year: number
  densityMTr: number        // logic transistor density, million transistors / mm²
  waferUsd: number          // foundry price per 300 mm wafer
  d0: number                // launch defect density, defects / cm²
  maskUsd: number           // full mask set
  designUsd: number         // design + verification + IP for a large die
  powerFactor: number       // dynamic energy per transistor-switch relative to N4 (lower is better)
  leakWPerB: number         // static leakage, W per billion transistors at nominal V
  fNomGHz: number           // nominal clock at nominal voltage
  litho: LithoKind          // cheapest tool that prints the critical layers single-patterned
  critLayers: Record<string, number> // exposures of critical layers by tool (multi-patterning on older tools)
  reticleMm2: number        // max die (field) size
  tech: string              // R&D needed
}

const BASE_NODES: NodeSpec[] = [
  { id: 'n16', name: '16 nm FinFET', year: 2015, densityMTr: 28,  waferUsd: 6_000,  d0: 0.06, maskUsd: 5e6,   designUsd: 20e6,  powerFactor: 2.3,  leakWPerB: 1.6, fNomGHz: 1.5,  litho: 'duv',    critLayers: { duv: 30 }, reticleMm2: 858, tech: 'fabless' },
  { id: 'n7',  name: '7 nm',          year: 2018, densityMTr: 91,  waferUsd: 9_300,  d0: 0.08, maskUsd: 15e6,  designUsd: 80e6,  powerFactor: 1.4,  leakWPerB: 1.2, fNomGHz: 1.7,  litho: 'duv',    critLayers: { duv: 60, euv: 12 }, reticleMm2: 858, tech: 'fabless' },
  { id: 'n5',  name: '5 nm',          year: 2020, densityMTr: 138, waferUsd: 16_000, d0: 0.1,  maskUsd: 30e6,  designUsd: 150e6, powerFactor: 1.08, leakWPerB: 1.0, fNomGHz: 1.8,  litho: 'euv',    critLayers: { duv: 90, euv: 15 }, reticleMm2: 858, tech: 'node-n5' },
  { id: 'n4',  name: '4 nm (N5 refined)', year: 2022, densityMTr: 145, waferUsd: 17_000, d0: 0.09, maskUsd: 32e6, designUsd: 160e6, powerFactor: 1.0, leakWPerB: 0.9, fNomGHz: 1.85, litho: 'euv', critLayers: { euv: 16 }, reticleMm2: 858, tech: 'node-n5' },
  { id: 'n3',  name: '3 nm',          year: 2023, densityMTr: 197, waferUsd: 20_000, d0: 0.13, maskUsd: 45e6,  designUsd: 250e6, powerFactor: 0.82, leakWPerB: 0.8, fNomGHz: 2.0,  litho: 'euv',    critLayers: { euv: 22 }, reticleMm2: 858, tech: 'node-n3' },
  { id: 'n2',  name: '2 nm GAA nanosheet', year: 2025, densityMTr: 250, waferUsd: 30_000, d0: 0.18, maskUsd: 70e6, designUsd: 400e6, powerFactor: 0.68, leakWPerB: 0.6, fNomGHz: 2.15, litho: 'euv', critLayers: { euv: 28, highna: 14 }, reticleMm2: 858, tech: 'node-n2' },
  { id: 'a16', name: 'A16 backside power', year: 2026, densityMTr: 300, waferUsd: 35_000, d0: 0.2, maskUsd: 90e6, designUsd: 520e6, powerFactor: 0.6, leakWPerB: 0.55, fNomGHz: 2.25, litho: 'highna', critLayers: { euv: 34, highna: 18 }, reticleMm2: 429, tech: 'node-a16' },
  { id: 'a14', name: 'A14 forksheet', year: 2028, densityMTr: 380, waferUsd: 45_000, d0: 0.22, maskUsd: 120e6, designUsd: 700e6, powerFactor: 0.52, leakWPerB: 0.5, fNomGHz: 2.35, litho: 'highna', critLayers: { highna: 22 }, reticleMm2: 429, tech: 'node-a14' }
]
const FUTURE = ['A10 CFET', 'A7 2D-channel', 'A5 molecular', 'A3 atomic-wire', 'A2 single-atom gate', 'Sub-Å whatever-FET']
/** All nodes, endless: every two years after A14 another ~1.25× density at ~1.25× wafer cost. */
export function nodeCatalog(): NodeSpec[] {
  const out = [...BASE_NODES]
  for (let i = 1; i <= 12; i++) {
    const p = out[out.length - 1]
    out.push({
      id: `fx${i}`, name: FUTURE[i - 1] ?? `Node X${i}`, year: 2028 + i * 2, densityMTr: Math.round(p.densityMTr * 1.25), waferUsd: Math.round(p.waferUsd * 1.25),
      d0: p.d0 * 1.05, maskUsd: p.maskUsd * 1.25, designUsd: p.designUsd * 1.2, powerFactor: p.powerFactor * 0.86, leakWPerB: p.leakWPerB * 0.92, fNomGHz: p.fNomGHz + 0.08,
      litho: i < 3 ? 'highna' : 'hyperna', critLayers: i < 3 ? { highna: 26 + i * 2, hyperna: 16 } : { hyperna: 18 + i }, reticleMm2: 429, tech: `node-fx${i}`
    })
  }
  return out
}
export const node = (id: string): NodeSpec => nodeCatalog().find((n) => n.id === id) ?? BASE_NODES[0]

export interface LithoSpec { kind: LithoKind; name: string; maker: string; usd: number; wph: number; wavelengthNm: number; na: number; tech: string; blurb: string }
export const LITHO: Record<LithoKind, LithoSpec> = {
  duv:     { kind: 'duv',     name: 'TwinSkan NXT:2100i', maker: 'ASM-Hell', usd: 75e6,  wph: 295, wavelengthNm: 193,  na: 1.35, tech: 'fab',     blurb: 'ArF immersion. Prints anything ≥ 7 nm if you multi-pattern until it hurts.' },
  euv:     { kind: 'euv',     name: 'NXE:3800 Low-NA',    maker: 'ASM-Hell', usd: 190e6, wph: 220, wavelengthNm: 13.5, na: 0.33, tech: 'euv',     blurb: 'Tin droplets vaporised 50,000 times a second. Ships in 40 containers.' },
  highna:  { kind: 'highna',  name: 'EXE:5200 High-NA',   maker: 'ASM-Hell', usd: 380e6, wph: 185, wavelengthNm: 13.5, na: 0.55, tech: 'high-na', blurb: 'Anamorphic optics: finer lines, but half the exposure field.' },
  hyperna: { kind: 'hyperna', name: 'HXE Hyper-NA',       maker: 'ASM-Hell', usd: 720e6, wph: 160, wavelengthNm: 13.5, na: 0.75, tech: 'hyper-na', blurb: 'The machine that makes the machines that think. Needs its own substation.' }
}

export interface HbmGen { id: string; name: string; year: number; gbpsPerPin: number; busBits: number; maxStack: number; dieGb: number; pjPerBit: number; usdPerGB: number; tech?: string }
export const HBM: HbmGen[] = [
  { id: 'hbm2e', name: 'HBM2e', year: 2020, gbpsPerPin: 3.6, busBits: 1024, maxStack: 8,  dieGb: 16, pjPerBit: 4.5, usdPerGB: 8 },
  { id: 'hbm3',  name: 'HBM3',  year: 2022, gbpsPerPin: 6.4, busBits: 1024, maxStack: 12, dieGb: 16, pjPerBit: 3.9, usdPerGB: 12, tech: 'hbm3' },
  { id: 'hbm3e', name: 'HBM3e', year: 2024, gbpsPerPin: 9.6, busBits: 1024, maxStack: 12, dieGb: 24, pjPerBit: 3.5, usdPerGB: 15, tech: 'hbm3e' },
  { id: 'hbm4',  name: 'HBM4',  year: 2026, gbpsPerPin: 8,   busBits: 2048, maxStack: 16, dieGb: 32, pjPerBit: 3.0, usdPerGB: 18, tech: 'hbm4' },
  { id: 'hbm4e', name: 'HBM4e', year: 2028, gbpsPerPin: 12,  busBits: 2048, maxStack: 16, dieGb: 48, pjPerBit: 2.6, usdPerGB: 20, tech: 'hbm4e' },
  { id: 'hbm5',  name: 'HBM5 (hybrid-bonded)', year: 2030, gbpsPerPin: 16, busBits: 4096, maxStack: 24, dieGb: 64, pjPerBit: 2.0, usdPerGB: 22, tech: 'hbm5' }
]

export type PackageKind = 'mono' | 'cowos-s' | 'cowos-l' | 'soic' | 'wafer'
export interface PackageSpec { id: PackageKind; name: string; maxDies: number; maxInterposerReticles: number; usd: number; yieldLoss: number; tech?: string; blurb: string }
export const PACKAGES: Record<PackageKind, PackageSpec> = {
  'mono':    { id: 'mono',    name: 'Monolithic + organic substrate', maxDies: 1,  maxInterposerReticles: 0,  usd: 150,    yieldLoss: 0.01, blurb: 'One die. HBM limited to 2 stacks without an interposer.' },
  'cowos-s': { id: 'cowos-s', name: 'CoWoS-S silicon interposer',    maxDies: 2,  maxInterposerReticles: 3.3, usd: 900,  yieldLoss: 0.03, tech: 'chiplets', blurb: 'Silicon interposer up to 3.3 reticles. The H100 recipe.' },
  'cowos-l': { id: 'cowos-l', name: 'CoWoS-L LSI bridges',           maxDies: 4,  maxInterposerReticles: 6,  usd: 1800,   yieldLoss: 0.04, tech: 'cowos-l', blurb: 'Local silicon bridges stitch giant packages together.' },
  'soic':    { id: 'soic',    name: 'SoIC 3D hybrid bonding',        maxDies: 8,  maxInterposerReticles: 8,  usd: 3200,   yieldLoss: 0.06, tech: 'soic', blurb: 'Stack logic on logic. Cache dies under compute dies.' },
  'wafer':   { id: 'wafer',   name: 'Wafer-scale engine',            maxDies: 1,  maxInterposerReticles: 0,  usd: 60_000, yieldLoss: 0.0,  tech: 'waferscale', blurb: 'Use the whole 300 mm wafer as one chip. Route around the defects.' }
}
export const WAFER_SCALE_MM2 = 46_225
export const WAFER_DIAMETER_MM = 300

/**
 * Absurd-but-real chip mods. Every one moves a real number: FLOPS, power, unit cost, NRE, schedule, yield or market
 * appeal (a demand multiplier for chips you sell). Multipliers stack multiplicatively.
 */
export interface ChipMod {
  id: string; name: string; blurb: string
  tflops?: number; tdp?: number; tdpAdd?: number; cost?: number; nre?: number; months?: number; appeal?: number; yield?: number
}
export const CHIP_MODS: ChipMod[] = [
  { id: 'rgb',        name: 'RGB gamer lighting',        blurb: 'Every HBM stack pulses to the loss curve. Adds 6 W and a 40% markup in spirit.', tdpAdd: 6, cost: 40, appeal: 1.08 },
  { id: 'gold',       name: 'Solid-gold heat spreader',  blurb: 'Better than copper? Marginally. Better than copper at parties? Vastly.', tdp: 0.97, cost: 9_000, appeal: 1.15 },
  { id: 'espresso',   name: 'Waste-heat espresso boiler', blurb: 'A 700 W chip should at least make coffee. Ops teams adore it.', tdp: 0.98, cost: 320, appeal: 1.06 },
  { id: 'quantum',    name: 'Quantum-ish garnish',       blurb: 'One qubit, glued on, decoherent within a microsecond. Investors weep with joy.', cost: 25_000, nre: 50e6, appeal: 1.4 },
  { id: 'vibes',      name: 'Vibes co-processor',        blurb: 'A tiny on-die LLM negotiates its own clock with the scheduler. It usually wins.', tflops: 1.04, tdp: 1.06, nre: 20e6, months: 2 },
  { id: 'ludicrous',  name: 'Ludicrous-speed bin',       blurb: 'Top 1% of dies, factory overvolted. Comes with a fire extinguisher.', tflops: 1.12, tdp: 1.3, yield: 0.7, appeal: 1.05 },
  { id: 'aquarium',   name: 'Integrated aquarium loop',  blurb: 'Coolant runs through a tiny reef. The fish are fine. Probably.', tdp: 0.9, cost: 1_200, appeal: 1.1 },
  { id: 'blockchain', name: 'On-die blockchain',         blurb: 'Every FLOP is notarised. Nobody asked. Some people paid.', tflops: 0.95, appeal: 1.2 },
  { id: 'haiku',      name: 'Haiku error firmware',      blurb: '“Uncorrectable— / the ECC weeps softly / your job has died now”', appeal: 1.03 },
  { id: 'round',      name: 'Round die',                 blurb: 'Circles are friendlier. Wastes the wafer corners, wins design awards.', yield: 1.04, tflops: 0.93, appeal: 1.12 },
  { id: 'duck',       name: 'Rubber-duck debug die',     blurb: 'A 1 mm² die that silently listens to your verification engineers. Tape-out ships sooner.', months: -2, cost: 15 },
  { id: 'tinfoil',    name: 'Tinfoil EMI hat',           blurb: 'Blocks interference, 5G, and at least three conspiracy theories.', tdpAdd: -2, cost: 4, appeal: 1.02 }
]
export const chipMod = (id: string): ChipMod | undefined => CHIP_MODS.find((m) => m.id === id)

/** Cosmetic finish of the package in the 3D viewer. No effect on the numbers. */
export interface ChipLook { substrate: string; lid: 'nickel' | 'black' | 'clear' | 'copper'; accent: string; label: string }

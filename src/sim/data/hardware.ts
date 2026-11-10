export interface GpuSpec {
  id: string; vendor: string; name: string; year: number
  tflops: number      // dense BF16/FP16 TFLOPS per GPU
  memGB: number; memTBs: number; tdpW: number
  priceUsd: number    // new price per GPU
  mtbfH: number       // mean time between failures, per GPU, nominal
}

const BASE: GpuSpec[] = [
  { id: 'nv-v100x', vendor: 'nvidious', name: 'Vulture V100x',        year: 2017, tflops: 125,  memGB: 32,  memTBs: 0.9, tdpW: 300,  priceUsd: 9000,   mtbfH: 70000 },
  { id: 'nv-a800',  vendor: 'nvidious', name: 'Amphibian A800',       year: 2020, tflops: 312,  memGB: 80,  memTBs: 2.0, tdpW: 400,  priceUsd: 14000,  mtbfH: 65000 },
  { id: 'amd-mi250',vendor: 'amdude',   name: 'MI-Dude 250',          year: 2021, tflops: 383,  memGB: 128, memTBs: 3.2, tdpW: 560,  priceUsd: 10000,  mtbfH: 55000 },
  { id: 'nv-h1000', vendor: 'nvidious', name: 'Hopper-ish H1000',     year: 2022, tflops: 989,  memGB: 80,  memTBs: 3.35,tdpW: 700,  priceUsd: 30000,  mtbfH: 55000 },
  { id: 'amd-mi300',vendor: 'amdude',   name: 'MI3000X Instinctual',  year: 2023, tflops: 1307, memGB: 192, memTBs: 5.3, tdpW: 750,  priceUsd: 17000,  mtbfH: 50000 },
  { id: 'int-gaudy',vendor: 'intellect',name: 'Gaudy 3',              year: 2024, tflops: 1835, memGB: 128, memTBs: 3.7, tdpW: 900,  priceUsd: 15000,  mtbfH: 45000 },
  { id: 'nv-b2000', vendor: 'nvidious', name: 'Blackwall B2000',      year: 2024, tflops: 2250, memGB: 192, memTBs: 8.0, tdpW: 1000, priceUsd: 40000,  mtbfH: 45000 },
  { id: 'amd-mi350',vendor: 'amdude',   name: 'MI3500 Instinctive',   year: 2025, tflops: 2300, memGB: 288, memTBs: 8.0, tdpW: 1000, priceUsd: 25000,  mtbfH: 45000 },
  { id: 'nv-r3000', vendor: 'nvidious', name: 'Rubbin R3000',         year: 2026, tflops: 5000, memGB: 288, memTBs: 13,  tdpW: 1800, priceUsd: 60000,  mtbfH: 40000 }
]
const PHYSICISTS = ['Feynmann', 'Planckton', 'Curious-ie', 'Tesla-ish', 'Faradayne', 'Noetherium', 'Diracula', 'Heisenburger', 'Bohrderline', 'Maxwellness']

/** Endless progression: a new Nvidious flagship every 2 years, AMDude a year behind and cheaper. */
export function gpuCatalog(year: number): GpuSpec[] {
  const out = BASE.filter((g) => g.year <= year)
  for (let gen = 1; 2026 + gen * 2 <= year && gen <= 40; gen++) {
    const y = 2026 + gen * 2
    const s = Math.pow(1.85, gen)
    out.push({
      id: `nv-g${gen}`, vendor: 'nvidious', name: `${PHYSICISTS[(gen - 1) % PHYSICISTS.length]} ${y % 100}K`, year: y,
      tflops: Math.round(5000 * s), memGB: Math.round(288 * Math.pow(1.5, gen)), memTBs: +(13 * Math.pow(1.55, gen)).toFixed(1),
      tdpW: Math.round(1800 * Math.pow(1.22, gen)), priceUsd: Math.round(60000 * Math.pow(1.12, gen) / 1000) * 1000, mtbfH: 40000
    })
    if (y + 1 <= year) out.push({
      id: `amd-g${gen}`, vendor: 'amdude', name: `MI${y - 2000 + 1}00 Instinct-${gen}`, year: y + 1,
      tflops: Math.round(4800 * s), memGB: Math.round(320 * Math.pow(1.5, gen)), memTBs: +(13 * Math.pow(1.55, gen)).toFixed(1),
      tdpW: Math.round(1700 * Math.pow(1.22, gen)), priceUsd: Math.round(36000 * Math.pow(1.12, gen) / 1000) * 1000, mtbfH: 38000
    })
  }
  return out
}
export const gpuById = (id: string, year = 2100): GpuSpec => {
  const g = gpuCatalog(year).find((x) => x.id === id)
  if (!g) throw new Error('unknown gpu ' + id)
  return g
}

export const GPUS_PER_SERVER = 8
export const serverPriceUsd = (g: GpuSpec): number => Math.round(GPUS_PER_SERVER * g.priceUsd * 1.2 + 20000)
export const serverPeakKw = (g: GpuSpec): number => (GPUS_PER_SERVER * g.tdpW + 2200) / 1000
/** Power at utilisation u in [0,1]: idle ~25% GPU draw, plus CPUs/NICs/fans. */
export const serverKw = (g: GpuSpec, u: number): number => (GPUS_PER_SERVER * g.tdpW * (0.25 + 0.75 * u) + 2200) / 1000
/** Second-hand value fraction after `ageYears`. */
export const residual = (ageYears: number): number => Math.max(0.12, Math.pow(0.78, ageYears))

export type CoolingType = 'air' | 'rdhx' | 'dlc' | 'immersion'
export interface CoolingSpec { id: CoolingType; name: string; maxRackKw: number; usdPerKw: number; cop: number; derateAbove: number; derateRate: number; waterLPerKwh: number; needsTech?: string }
export const COOLING: Record<CoolingType, CoolingSpec> = {
  air:       { id: 'air',       name: 'Air (CRAH + chillers)',       maxRackKw: 20,  usdPerKw: 700,  cop: 3.2, derateAbove: 27, derateRate: 0.03,  waterLPerKwh: 1.8 },
  rdhx:      { id: 'rdhx',      name: 'Rear-door heat exchangers',   maxRackKw: 45,  usdPerKw: 1000, cop: 5.0, derateAbove: 30, derateRate: 0.03,  waterLPerKwh: 1.4, needsTech: 'rdhx' },
  dlc:       { id: 'dlc',       name: 'Direct-to-chip liquid (CDU)', maxRackKw: 130, usdPerKw: 1500, cop: 9.0, derateAbove: 33, derateRate: 0.025, waterLPerKwh: 0.6, needsTech: 'dlc' },
  immersion: { id: 'immersion', name: 'Two-phase immersion tanks',   maxRackKw: 220, usdPerKw: 1900, cop: 12,  derateAbove: 35, derateRate: 0.02,  waterLPerKwh: 0.2, needsTech: 'immersion' }
}

export type FabricType = 'eth100' | 'ib400' | 'ib800' | 'ib1600'
export interface FabricSpec { id: FabricType; name: string; usdPerServer: number; k: number; needsTech?: string }
export const FABRICS: Record<FabricType, FabricSpec> = {
  eth100: { id: 'eth100', name: '100GbE Ethernet',     usdPerServer: 8000,   k: 0.09 },
  ib400:  { id: 'ib400',  name: 'InfiniBand NDR 400G', usdPerServer: 40000,  k: 0.035, needsTech: 'ib400' },
  ib800:  { id: 'ib800',  name: 'InfiniBand XDR 800G', usdPerServer: 70000,  k: 0.022, needsTech: 'ib800' },
  ib1600: { id: 'ib1600', name: 'Photonic 1.6T fabric',usdPerServer: 110000, k: 0.014, needsTech: 'ib1600' }
}
/** Scaling efficiency of a training job across `servers` servers on a given fabric. */
export const fabricEfficiency = (f: FabricType, servers: number): number => 1 / (1 + FABRICS[f].k * Math.log2(Math.max(1, servers)))

export type GenKind = 'solar' | 'wind' | 'gas' | 'nuclear' | 'geothermal' | 'battery'
export interface GenSpec { kind: GenKind; name: string; usdPerMw: number; usdPerMwhStored?: number; opexPerMwYear: number; fuelPerMwh: number; carbonT: number; leadDays: number; needsTech?: string }
export const GENERATORS: Record<GenKind, GenSpec> = {
  solar:      { kind: 'solar',      name: 'Solar farm',            usdPerMw: 1_100_000, opexPerMwYear: 18_000,  fuelPerMwh: 0,  carbonT: 0,    leadDays: 120 },
  wind:       { kind: 'wind',       name: 'Wind farm',             usdPerMw: 1_500_000, opexPerMwYear: 35_000,  fuelPerMwh: 0,  carbonT: 0,    leadDays: 200 },
  gas:        { kind: 'gas',        name: 'Gas turbine (on-site)', usdPerMw: 1_200_000, opexPerMwYear: 25_000,  fuelPerMwh: 48, carbonT: 0.45, leadDays: 300 },
  geothermal: { kind: 'geothermal', name: 'Geothermal plant',      usdPerMw: 4_500_000, opexPerMwYear: 120_000, fuelPerMwh: 0,  carbonT: 0.02, leadDays: 540 },
  nuclear:    { kind: 'nuclear',    name: 'Small modular reactor', usdPerMw: 9_000_000, opexPerMwYear: 130_000, fuelPerMwh: 9,  carbonT: 0,    leadDays: 1100, needsTech: 'smr' },
  battery:    { kind: 'battery',    name: 'Battery storage',       usdPerMw: 350_000, usdPerMwhStored: 280_000, opexPerMwYear: 6_000, fuelPerMwh: 0, carbonT: 0, leadDays: 90 }
}

export interface RegionSpec {
  id: string; name: string; country: string; basePriceMwh: number; meanC: number; ampC: number
  carbon: number; reliability: number; solarCf: number; windCf: number; siteCostUsd: number; permitDays: number
  demandMult: number; waterCost: number; gridCapMw: number; blurb: string; geothermal?: boolean
}
export const REGIONS: RegionSpec[] = [
  { id: 'va',  name: 'Loudoun County, Virginia', country: 'USA', basePriceMwh: 72,  meanC: 13, ampC: 12, carbon: 0.38, reliability: 0.9995, solarCf: 0.17, windCf: 0.25, siteCostUsd: 9_000_000, permitDays: 420, demandMult: 1.25, waterCost: 0.0012, gridCapMw: 300, blurb: 'Data center alley. Best latency, tightest grid.' },
  { id: 'or',  name: 'Hillsboro, Oregon',        country: 'USA', basePriceMwh: 55,  meanC: 12, ampC: 8,  carbon: 0.12, reliability: 0.9996, solarCf: 0.16, windCf: 0.3,  siteCostUsd: 6_000_000, permitDays: 300, demandMult: 1.05, waterCost: 0.0010, gridCapMw: 400, blurb: 'Cheap hydro, mild climate, solid fiber.' },
  { id: 'tx',  name: 'Abilene, Texas',           country: 'USA', basePriceMwh: 44,  meanC: 19, ampC: 12, carbon: 0.42, reliability: 0.998,  solarCf: 0.25, windCf: 0.4,  siteCostUsd: 3_500_000, permitDays: 180, demandMult: 1.0,  waterCost: 0.0015, gridCapMw: 900, blurb: 'Cheap and fast. ERCOT price spikes will eat you alive.' },
  { id: 'az',  name: 'Mesa, Arizona',            country: 'USA', basePriceMwh: 62,  meanC: 24, ampC: 11, carbon: 0.36, reliability: 0.9993, solarCf: 0.3,  windCf: 0.12, siteCostUsd: 4_500_000, permitDays: 240, demandMult: 1.0,  waterCost: 0.0035, gridCapMw: 500, blurb: 'Sun-drenched. Hot. Water is the real constraint.' },
  { id: 'ie',  name: 'Dublin, Ireland',          country: 'IRL', basePriceMwh: 135, meanC: 10, ampC: 5,  carbon: 0.30, reliability: 0.9994, solarCf: 0.1,  windCf: 0.35, siteCostUsd: 8_000_000, permitDays: 720, demandMult: 1.1,  waterCost: 0.0014, gridCapMw: 120, blurb: 'Free cooling year-round. Regulators hate you.' },
  { id: 'is',  name: 'Reykjavik, Iceland',       country: 'ISL', basePriceMwh: 34,  meanC: 5,  ampC: 6,  carbon: 0.02, reliability: 0.9992, solarCf: 0.08, windCf: 0.4,  siteCostUsd: 5_000_000, permitDays: 270, demandMult: 0.7,  waterCost: 0.0005, gridCapMw: 150, geothermal: true, blurb: 'Geothermal and glacier air. A long way from customers.' },
  { id: 'se',  name: 'Luleå, Sweden',            country: 'SWE', basePriceMwh: 42,  meanC: 2,  ampC: 11, carbon: 0.03, reliability: 0.9997, solarCf: 0.1,  windCf: 0.38, siteCostUsd: 5_500_000, permitDays: 330, demandMult: 0.85, waterCost: 0.0006, gridCapMw: 350, blurb: 'Arctic free cooling, clean hydro, rival famously did it first.' },
  { id: 'qc',  name: 'Quebec, Canada',           country: 'CAN', basePriceMwh: 38,  meanC: 5,  ampC: 14, carbon: 0.002,reliability: 0.9996, solarCf: 0.13, windCf: 0.33, siteCostUsd: 5_000_000, permitDays: 300, demandMult: 0.9,  waterCost: 0.0005, gridCapMw: 600, blurb: 'Nearly pure hydro. Cold. Cheap. Polite.' },
  { id: 'sg',  name: 'Jurong, Singapore',        country: 'SGP', basePriceMwh: 155, meanC: 28, ampC: 1.5,carbon: 0.41, reliability: 0.9999, solarCf: 0.15, windCf: 0.05, siteCostUsd: 22_000_000,permitDays: 600, demandMult: 1.3,  waterCost: 0.0020, gridCapMw: 60,  blurb: 'Hot, wet, expensive, and every customer wants to be here.' }
]
export const region = (id: string): RegionSpec => REGIONS.find((r) => r.id === id) ?? REGIONS[0]

export interface TechSpec { id: string; name: string; blurb: string; costUsd: number; days: number; requires?: string[]; effect: string }
export const TECHS: TechSpec[] = [
  { id: 'rdhx',      name: 'Rear-door heat exchangers', blurb: 'Take the edge off 45 kW racks.',               costUsd: 1_500_000,   days: 45,  effect: 'unlock:rdhx' },
  { id: 'dlc',       name: 'Direct-to-chip liquid cooling', blurb: 'Cold plates and CDUs. Mandatory for Blackwall.', costUsd: 8_000_000, days: 120, requires: ['rdhx'], effect: 'unlock:dlc' },
  { id: 'immersion', name: 'Two-phase immersion',        blurb: 'Dunk it. 200 kW racks.',                       costUsd: 25_000_000,  days: 240, requires: ['dlc'], effect: 'unlock:immersion' },
  { id: 'ib400',     name: 'InfiniBand NDR 400G',        blurb: 'Training that scales past a few hundred GPUs.',costUsd: 3_000_000,   days: 60,  effect: 'unlock:ib400' },
  { id: 'ib800',     name: 'InfiniBand XDR 800G',        blurb: 'Rail-optimised 800G fabrics.',                 costUsd: 20_000_000,  days: 180, requires: ['ib400'], effect: 'unlock:ib800' },
  { id: 'ib1600',    name: 'Co-packaged optics 1.6T',    blurb: 'Light instead of copper.',                     costUsd: 80_000_000,  days: 360, requires: ['ib800'], effect: 'unlock:ib1600' },
  { id: 'flash',     name: 'FlashAttention-ish kernels', blurb: '+8% MFU. Free lunch, billed as research.',      costUsd: 4_000_000,   days: 60,  effect: 'mfu:0.08' },
  { id: 'fp8',       name: 'FP8 mixed-precision training', blurb: '+15% MFU on supported silicon.',             costUsd: 12_000_000,  days: 120, requires: ['flash'], effect: 'mfu:0.15' },
  { id: 'ckpt',      name: 'Async checkpointing',        blurb: 'Fewer minutes lost per GPU failure.',          costUsd: 2_500_000,   days: 45,  effect: 'restart:0.5' },
  { id: 'moe',       name: 'Mixture-of-Experts',         blurb: 'Active params ≪ total params. Cheaper serving.',costUsd: 15_000_000, days: 150, effect: 'unlock:moe' },
  { id: 'distill',   name: 'Distillation pipeline',      blurb: 'Small models punch above their weight (+60 Elo for ≤70B).', costUsd: 10_000_000, days: 120, effect: 'distill:60' },
  { id: 'synth',     name: 'Synthetic data engine',      blurb: '+0.15 data quality on new runs.',               costUsd: 18_000_000,  days: 180, requires: ['flash'], effect: 'dq:0.15' },
  { id: 'speculative',name:'Speculative decoding',       blurb: '+40% inference throughput.',                    costUsd: 6_000_000,   days: 90,  effect: 'infer:0.4' },
  { id: 'smr',       name: 'SMR licensing',              blurb: 'Allows small modular reactors on site.',        costUsd: 60_000_000,  days: 540, effect: 'unlock:smr' },
  { id: 'hotaisle',  name: 'Hot-aisle containment',      blurb: '+15% COP for air-cooled halls.',                costUsd: 1_000_000,   days: 30,  effect: 'airCop:0.15' },
  { id: 'prefab',    name: 'Modular prefab halls',       blurb: 'Hall build time -40%.',                         costUsd: 7_000_000,   days: 90,  effect: 'build:0.4' }
]

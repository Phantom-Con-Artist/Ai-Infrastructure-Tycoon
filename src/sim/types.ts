import type { CoolingType, FabricType, GenKind } from './data/hardware'
import type { EquipKind } from './data/equipment'
import type { GpuSpec } from './data/hardware'
import type { LithoKind } from './data/silicon'
import type { ChipSpec } from './silicon'
import type { ArchSpec, Domain } from './models'
import type { Rules } from './rules'
import type { Branch } from './data/tech'

export const HOURS_PER_YEAR = 8766
export const START_YEAR = 2023

export interface Rack {
  id: string; x: number; y: number; rot: 0 | 1 | 2 | 3
  gpuId: string; servers: number; failed: number
  // derived by layout / live
  pduId?: string; coolerId?: string; pduIdx?: number; coolerIdx?: number; powered: boolean; cooled: boolean; throttle: number; kw: number
}
export interface Equip { id: string; kind: EquipKind; x: number; y: number; rot: 0 | 1 | 2 | 3; load: number }
export interface Hall {
  id: string; name: string; w: number; d: number; racks: Rack[]; equipment: Equip[]
  cooling: CoolingType; coolKw: number; powerKw: number; fabric: FabricType; upsKwh: number; upsSoc: number
  readyTick: number; startTick?: number
  // live state
  tempC: number; throttle: number; itKw: number; coolPowerKw: number; pue: number; online: boolean; waterL: number
}
export interface Generator { id: string; kind: GenKind; mw: number; mwh: number; soc: number; readyTick: number; startTick?: number }
export interface Order { id: string; gpuId: string; servers: number; arriveTick: number; placedTick?: number }
export interface Site {
  id: string; name: string; regionId: string
  utilityMw: number; pendingUtility: { mw: number; readyTick: number; startTick?: number }[]
  halls: Hall[]; gens: Generator[]
  stock: Record<string, number>; orders: Order[]
  // live
  ambientC: number; priceMwh: number; windCf: number; spotNoise: number; gridUp: boolean
  demandMw: number; supplyMw: number; gridMw: number; powerFactor: number; costPerHour: number; carbonKgPerHour: number
  strategy?: 'cost' | 'green' | 'resilient' | 'arbitrage'; drPct?: number; ppa?: { mw: number; price: number; untilTick: number }
  flow?: { solar: number; wind: number; firm: number; battery: number; gas: number; grid: number; it: number; cooling: number; other: number; curtailed: number; drCredit: number }
  history?: { price: number; mw: number; grid: number }[]
}

export type RentalKind = 'ondemand' | 'reserved' | 'spot'
export interface Rental { id: string; siteId: string; gpuId: string; servers: number; priceMult: number; kind?: RentalKind; reservedUntil?: number }
export interface Deployment { id: string; modelId: string; siteId: string; gpuId: string; servers: number }

export type RunStatus = 'running' | 'paused' | 'done' | 'failed'
export interface TrainingRun {
  id: string; name: string; owner: 'player' | string /* contract id */
  paramsB: number; activeParamsB: number; tokensT: number; moe: boolean; dataQuality: number
  siteId: string; gpuId: string; servers: number
  flopsTotal: number; flopsDone: number; status: RunStatus
  startTick: number; mfu: number; etaH: number; spentUsd: number; restarts: number; note: string
  arch?: ArchSpec; mix?: Partial<Record<Domain, number>>
  modality?: import('./foundry').Modality; method?: import('./foundry').Method; baseId?: string; baseElo?: number; baseTokensT?: number
}
export interface AiModel {
  id: string; name: string; owner: string; paramsB: number; activeParamsB: number; tokensT: number
  loss: number; elo: number; releaseTick: number; priceMtok: number; posttrain: number
  tokensServed: number; revenue: number; share: number; demandTokPerDay: number; capacityTokPerDay: number; releasedByPlayer: boolean
  arch?: ArchSpec; evals?: Record<string, number>; mix?: Partial<Record<Domain, number>>; subsidiary?: string; hype?: number; reservedTokPerDay?: number
  modality?: import('./foundry').Modality; method?: import('./foundry').Method; baseName?: string
}
export interface Competitor { corp: string; name: string; elo: number; priceMtok: number }

export interface Contract {
  id: string; customer: string; modelName: string; paramsB: number; tokensT: number; moe: boolean
  deadlineTick: number; payUsd: number; expiresTick: number; minGpuMemGB: number; accepted: boolean; runId?: string; done?: boolean
}
export interface Loan { id: string; principal: number; rate: number }
export type NewsCategory = 'mine' | 'market' | 'rivals' | 'incident' | 'world'
export interface NewsItem { tick: number; kind: 'info' | 'good' | 'bad' | 'event'; title: string; body: string; category: NewsCategory; importance: 0 | 1 | 2 }
export interface Edition {
  day: number; lead: NewsItem; stories: NewsItem[]; slowNews: boolean
  market: { gpuSpot: number; playerVal: number; playerValChange: number; rivals: { name: string; val: number }[] }
}
export type System = 'facilities' | 'sales' | 'people' | 'finance' | 'research'
export const SYSTEMS: System[] = ['facilities', 'sales', 'people', 'finance', 'research']
export interface Autopilot { on: boolean; policy: Record<string, number>; handsOffUntil: number }
export interface InboxItem { id: string; system: System; tick: number; title: string; lines: string[]; action: { fn: string; args: unknown[] } }
export interface ActiveEvent { id: string; kind: string; title: string; endTick: number; siteId?: string; mag: number }
export interface ResearchState { done: string[]; levels: Record<string, number>; current?: string; progressUsd: number; budgetPerDay: number
  /** Up next, in order. Optional for older saves. */
  queue?: string[]
  /** Money already sunk into techs you paused, by id. */
  partial?: Record<string, number>
}
export interface Staff { engineers: number; researchers: number; ops: number; sales: number }
export interface DayLedger { day: number; revenue: number; powerCost: number; staffCost: number; interest: number; opex: number; capex: number; cash: number; itMw: number; gpus: number; rentalRev: number; inferRev: number; contractRev: number }
export interface MarketState {
  boom: number; supplyTight: number; tokensPerDay: number; priceDrift: number; vmPressure?: number
  gpuPressure: Record<string, number>
}

export interface ChipDesign {
  id: string; spec: ChipSpec; status: 'designing' | 'ready'; startTick: number; readyTick: number
  nrePaid: number; nreTotal: number; wafersPerMonth: number; source: 'foundry' | 'fab'
  salePrice: number; sold: number; revenue: number; made: number; gpuId?: string; hype?: number
}
export interface Fab { modules: number; readyTick: number; tools: Record<LithoKind, number>; toolsPending: { kind: LithoKind; readyTick: number }[] }
export interface Silicon { designs: ChipDesign[]; fab: Fab | null; chipStock: Record<string, number> }

export interface World {
  version: number; tick: number; rng: number; nextId: number
  company: string; ceo: string; advisor: string; logo: { glyph: string; color: string }
  cash: number; loans: Loan[]; reputation: number; esg: number; gameOver: boolean; negCashDays: number
  sites: Site[]; rentals: Rental[]; deployments: Deployment[]
  runs: TrainingRun[]; models: AiModel[]; contracts: Contract[]
  market: MarketState; competitors: Competitor[]
  research: ResearchState; staff: Staff
  events: ActiveEvent[]; news: NewsItem[]; ledger: DayLedger[]
  today: DayLedger; quarterProfit: number; totalTco2: number; totalWaterL: number
  achievements: string[]
  silicon: Silicon; customGpus: GpuSpec[]
  datasets: Record<string, number>
  /** Optional so older saves load: Data Foundry, the society loop and organisation deals. */
  data?: import('./datafoundry').DataState; society?: import('./society').Society; orgDeals?: import('./orgs').OrgDeal[]
  rivals: import('./corporate').Rival[]; founderStake: number; public?: boolean; keynotes?: number; releasedNames?: string[]; rivalNext?: Record<string, number>
  web: import('./web').WebPresence
  products: import('./store').Product[]
  people: import('./people').Person[]; candidates: import('./people').Person[]; labs: import('./people').ResearchLab[]; chipStaff?: number
  rules: Rules; editions: Edition[]; inbox: InboxItem[]; autopilot: Record<System, Autopilot>; managerLog: Record<System, string[]>; goalsDone: string[]; managerFocus?: Branch
}

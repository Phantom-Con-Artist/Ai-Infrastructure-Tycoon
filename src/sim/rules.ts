import type { World } from './types'

/** Difficulty knobs. 1 = career default; sandbox lets the player set 0.25–4. */
export type RuleKey = 'hardwarePrice' | 'powerPrice' | 'demand' | 'failureRate' | 'rivalAggression' | 'researchSpeed'
export const RULE_KEYS: RuleKey[] = ['hardwarePrice', 'powerPrice', 'demand', 'failureRate', 'rivalAggression', 'researchSpeed']
export interface Rules {
  mode: 'career' | 'sandbox'
  startCash: number
  infiniteCash: boolean
  noBankruptcy: boolean
  devTools: boolean
  mult: Record<RuleKey, number>
}
export const DEFAULT_RULES: Rules = {
  mode: 'career', startCash: 40_000_000, infiniteCash: false, noBankruptcy: false, devTools: false,
  mult: { hardwarePrice: 1, powerPrice: 1, demand: 1, failureRate: 1, rivalAggression: 1, researchSpeed: 1 }
}
export function makeRules(o: Partial<Rules> = {}): Rules {
  return { ...DEFAULT_RULES, ...o, mult: { ...DEFAULT_RULES.mult, ...(o.mult ?? {}) } }
}
/** Difficulty multiplier, clamped to 0.25–4. */
export function mult(w: World, k: RuleKey): number {
  const v = w.rules?.mult[k] ?? 1
  return Math.min(4, Math.max(0.25, v))
}
/** Every affordability check in the sim goes through here so sandbox infinite cash works everywhere. */
export function canAfford(w: World, usd: number): boolean {
  return !!w.rules?.infiniteCash || w.cash >= usd
}

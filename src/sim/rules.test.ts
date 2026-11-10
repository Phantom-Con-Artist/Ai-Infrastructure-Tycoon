import { describe, expect, it } from 'vitest'
import { createWorld } from './world'
import { DEFAULT_RULES, canAfford, mult } from './rules'
import { pushNews } from './util'

describe('world v9 + rules', () => {
  it('creates a career world with default rules and new fields', () => {
    const w = createWorld(1)
    expect(w.version).toBe(9)
    expect(w.rules).toEqual(DEFAULT_RULES)
    expect(w.cash).toBe(40_000_000)
    expect(w.editions).toEqual([])
    expect(w.inbox).toEqual([])
    expect(w.goalsDone).toEqual([])
    expect(Object.keys(w.autopilot).sort()).toEqual(['facilities', 'finance', 'people', 'research', 'sales'])
    expect(Object.values(w.autopilot).every((a) => a.on === false)).toBe(true)
  })
  it('accepts sandbox rules overrides', () => {
    const w = createWorld(1, 'X', 'Y', 'cfo', undefined, { mode: 'sandbox', startCash: 5e9 })
    expect(w.cash).toBe(5e9)
    expect(w.rules.mode).toBe('sandbox')
    expect(w.rules.infiniteCash).toBe(false)
    expect(w.rules.mult).toEqual(DEFAULT_RULES.mult)
  })
  it('canAfford honours cash and infiniteCash', () => {
    const w = createWorld(1)
    w.cash = 100
    expect(canAfford(w, 101)).toBe(false)
    expect(canAfford(w, 100)).toBe(true)
    w.rules.infiniteCash = true
    expect(canAfford(w, 1e18)).toBe(true)
  })
  it('mult clamps to 0.25..4', () => {
    const w = createWorld(1)
    w.rules.mult.demand = 10
    expect(mult(w, 'demand')).toBe(4)
    w.rules.mult.demand = 0.01
    expect(mult(w, 'demand')).toBe(0.25)
  })
  it('pushNews defaults category/importance from kind', () => {
    const w = createWorld(1)
    pushNews(w, 'bad', 't', 'b')
    expect(w.news[0].category).toBe('incident')
    expect(w.news[0].importance).toBe(1)
    pushNews(w, 'good', 't', 'b', 'rivals', 2)
    expect(w.news[0].category).toBe('rivals')
    expect(w.news[0].importance).toBe(2)
  })
})

describe('sandbox fairness', () => {
  it('never awards achievements in a sandbox game', async () => {
    const { checkAchievements } = await import('./corporate')
    const { devUnlockTech } = await import('./dev')
    const { stepMany } = await import('./world')
    const w = createWorld(1, 'S', 'Y', 'cfo', undefined, { mode: 'sandbox', devTools: true, startCash: 1e12 })
    devUnlockTech(w, 'all')
    stepMany(w, 24 * 30)
    expect(checkAchievements(w)).toEqual([])
    expect(w.achievements).toEqual([])
  })
})

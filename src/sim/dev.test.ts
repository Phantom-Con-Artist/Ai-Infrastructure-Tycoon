import { describe, expect, it } from 'vitest'
import * as A from './actions'
import * as D from './dev'
import { EVENTS, triggerEvent } from './events'
import { TECHS } from './data/tech'
import { createWorld, stepMany } from './world'
import { boot, firstGpu, fnv } from './testkit'

const sandbox = () => createWorld(5, 'Dev Co', 'You', 'cfo', undefined, { mode: 'sandbox', devTools: true })

describe('dev tools', () => {
  it('are off in career games', () => {
    const w = createWorld(5)
    const r = D.devAddCash(w, 1e9)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Dev tools are off')
  })
  it('add cash, set reputation and fast research', () => {
    const w = sandbox(); const c = w.cash
    expect(D.devAddCash(w, 1e9).ok).toBe(true)
    expect(w.cash).toBe(c + 1e9)
    D.devSetReputation(w, 140); expect(w.reputation).toBe(100)
    D.devFastResearch(w, true); expect(w.rules.mult.researchSpeed).toBe(4)
    D.devFastResearch(w, false); expect(w.rules.mult.researchSpeed).toBe(1)
  })
  it('unlocks all tech', () => {
    const w = sandbox()
    expect(D.devUnlockTech(w, 'all').ok).toBe(true)
    expect(w.research.done.length).toBe(TECHS.length)
    expect(D.devUnlockTech(w, 'nope').ok).toBe(false)
  })
  it('skips days and spawns servers for free', () => {
    const w = sandbox()
    D.devSkipDays(w, 3); expect(w.tick).toBe(72)
    const site = (A.buildSite(w, 'or') as { ok: true; value: { id: string; stock: Record<string, number> } }).value
    const cash = w.cash
    expect(D.devSpawnServers(w, site.id, firstGpu(w), 50).ok).toBe(true)
    expect(site.stock[firstGpu(w)]).toBe(50)
    expect(w.cash).toBe(cash)
  })
})

describe('event registry', () => {
  it('can trigger any event by id', () => {
    const { w, site } = boot(3)
    expect(Object.keys(EVENTS)).toEqual(expect.arrayContaining(['outage', 'heatwave', 'priceSpike', 'disaster', 'hype', 'winter', 'supplyCrunch', 'lawsuit']))
    expect(triggerEvent(w, 'heatwave', site.id).ok).toBe(true)
    expect(w.events.some((e) => e.kind === 'heatwave' && e.siteId === site.id)).toBe(true)
    expect(triggerEvent(w, 'heatwave').ok).toBe(false) // needs a site
    expect(triggerEvent(w, 'bogus').ok).toBe(false)
    const boom = w.market.boom
    expect(triggerEvent(w, 'hype').ok).toBe(true)
    expect(w.market.boom).toBeGreaterThan(boom)
  })
  it('random daily events behave exactly as before the refactor', () => {
    const { w } = boot(42)
    stepMany(w, 24 * 200)
    expect(fnv(JSON.stringify(w.news) + JSON.stringify(w.events) + w.rng)).toBe('528c6af4')
  })
})

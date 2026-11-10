import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { createWorld } from './world'
import { GOALS, checkGoals, nextSteps } from './advisor'
import { boot, firstGpu, ready } from './testkit'
import { MILESTONES } from './objectives'

describe('advisor next steps', () => {
  it('tells a brand-new company to buy land', () => {
    expect(nextSteps(createWorld(1))[0].id).toBe('no-site')
  })
  it('puts a cash runway warning first', () => {
    const { w } = boot(2)
    w.cash = -5
    expect(nextSteps(w)[0].id).toBe('runway')
    expect(nextSteps(w)[0].severity).toBe(2)
  })
  it('flags racks without power or cooling and links to the hall', () => {
    const { w, hall } = boot(2)
    hall.racks[0].powered = false
    const s = nextSteps(w).find((x) => x.id === 'uncovered-rack')
    expect(s).toBeDefined()
    expect(s!.focus).toBe(hall.id)
    expect(s!.screen).toBe('sites')
  })
  it('surfaces manager inbox items', () => {
    const { w } = boot(2)
    w.inbox.push({ id: 'i1', system: 'finance', tick: 0, title: 'Sign a PPA?', lines: [], action: { fn: 'signPpa', args: [] } })
    expect(nextSteps(w).some((s) => s.id === 'inbox')).toBe(true)
  })
  it('never returns more than 3 and sorts by severity', () => {
    const { w, hall } = boot(2)
    w.cash = -5; hall.racks[0].powered = false
    w.inbox.push({ id: 'i1', system: 'finance', tick: 0, title: 'x', lines: [], action: { fn: 'signPpa', args: [] } })
    const s = nextSteps(w)
    expect(s.length).toBeLessThanOrEqual(3)
    for (let i = 1; i < s.length; i++) expect(s[i - 1].severity).toBeGreaterThanOrEqual(s[i].severity)
  })
})

describe('idle GPUs', () => {
  it('does not nag when every server is rented, and does when none are', () => {
    const { w, site, hall } = boot(2); w.cash = 1e10
    const g = firstGpu(w)
    ready(w, site, hall, g, 16)
    expect(nextSteps(w).some((s) => s.id === 'idle-gpus')).toBe(true)
    expect(A.setRental(w, site.id, g, 16, 1).ok).toBe(true)
    expect(nextSteps(w).some((s) => s.id === 'idle-gpus')).toBe(false)
  }, 30_000)
})

describe('goals', () => {
  it('awards a goal once, with news and a little reputation', () => {
    const w = createWorld(1)
    const rep = w.reputation
    expect(A.buildSite(w, 'or').ok).toBe(true)
    checkGoals(w)
    expect(w.goalsDone).toContain('land')
    expect(w.reputation).toBe(rep + 1)
    expect(w.news[0].title).toMatch(/Goal reached/)
    const n = w.goalsDone.length
    checkGoals(w)
    expect(w.goalsDone.length).toBe(n)
  })
  it('builds on the guided path milestones, plus later goals', () => {
    expect(GOALS.map((g) => g.id)).toEqual([...MILESTONES.map((m) => m.id), 'profit-week', 'first-product', 'first-manager'])
  })
})

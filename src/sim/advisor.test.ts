import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { createWorld } from './world'
import { GOALS, checkGoals, nextSteps } from './advisor'
import { boot } from './testkit'

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

describe('goals', () => {
  it('awards a goal once, with news and a little reputation', () => {
    const w = createWorld(1)
    const rep = w.reputation
    expect(A.buildSite(w, 'or').ok).toBe(true)
    checkGoals(w)
    expect(w.goalsDone).toContain('first-site')
    expect(w.reputation).toBe(rep + 1)
    expect(w.news[0].title).toMatch(/Goal reached/)
    const n = w.goalsDone.length
    checkGoals(w)
    expect(w.goalsDone.length).toBe(n)
  })
  it('has the milestone chain from the spec', () => {
    expect(GOALS.map((g) => g.id)).toEqual(['first-site', 'first-hall', 'first-servers', 'first-rental', 'profit-week', 'first-model', 'first-product', 'first-manager'])
  })
})

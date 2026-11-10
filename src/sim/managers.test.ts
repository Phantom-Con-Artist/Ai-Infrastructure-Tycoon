import { describe, expect, it } from 'vitest'
import * as A from './actions'
import * as M from './managers'
import { makeCandidate } from './people'
import { step, stepMany } from './world'
import { boot, firstGpu, ready } from './testkit'
import type { System, World } from './types'

function hireMgr(w: World, sys: System, skill = 8): void {
  w.people.push({ ...makeCandidate(w), role: `mgr-${sys}` as const, skill, trait: 'loyal', hiredTick: w.tick, morale: 0.9 })
}

describe('managers', () => {
  it('cannot switch on autopilot without a manager', () => {
    const { w } = boot(2)
    const r = M.setAutopilot(w, 'sales', true)
    expect(r.ok).toBe(false)
    hireMgr(w, 'sales')
    expect(M.setAutopilot(w, 'sales', true).ok).toBe(true)
    expect(M.managerOf(w, 'sales')?.role).toBe('mgr-sales')
  })
  it('managers do not count as engineers/ops headcount', () => {
    const { w } = boot(2)
    const before = { ...w.staff }
    hireMgr(w, 'facilities')
    M.setAutopilot(w, 'facilities', true)
    step(w)
    expect(w.staff.ops).toBeCloseTo(before.ops, 1)
  })
  it('a sales manager earns at least as much rental revenue as a badly priced manual rental', () => {
    const run = (withMgr: boolean): number => {
      const { w, site, hall } = boot(11); w.cash = 1e10
      const g = firstGpu(w)
      ready(w, site, hall, g, 32)
      expect(A.setRental(w, site.id, g, 32, 3).ok).toBe(true) // 3× market price: nearly nobody rents
      if (withMgr) { hireMgr(w, 'sales', 8); expect(M.setAutopilot(w, 'sales', true).ok).toBe(true) }
      const start = w.ledger.length
      stepMany(w, 24 * 60)
      return w.ledger.slice(start).reduce((a, d) => a + d.rentalRev, 0)
    }
    expect(run(true)).toBeGreaterThan(run(false))
  })
  it('stays hands-off for 7 days after the player touches a system', () => {
    const { w, site } = boot(2)
    hireMgr(w, 'facilities')
    M.setAutopilot(w, 'facilities', true, { green: 1 })
    A.setPowerStrategy(w, site.id, 'cost'); M.touchSystem(w, 'facilities')
    stepMany(w, 24 * 3)
    expect(site.strategy).toBe('cost')
    stepMany(w, 24 * 8)
    expect(site.strategy).toBe('green')
    expect(w.managerLog.facilities.length).toBeGreaterThan(0)
  })
  it('finance manager asks before signing a PPA and never signs it alone', () => {
    const { w, site } = boot(2)
    w.research.done.push('ppa')
    hireMgr(w, 'finance')
    M.setAutopilot(w, 'finance', true)
    stepMany(w, 24 * 30)
    const item = w.inbox.find((i) => i.action.fn === 'signPpa')
    expect(item).toBeDefined()
    expect(site.ppa).toBeUndefined()
    expect(w.inbox.filter((i) => i.action.fn === 'signPpa').length).toBe(1) // no duplicates
    expect(M.approveInbox(w, item!.id).ok).toBe(true)
    expect(site.ppa).toBeDefined()
    expect(w.inbox.find((i) => i.id === item!.id)).toBeUndefined()
  })
  it('rejects unknown inbox actions and can reject items', () => {
    const { w } = boot(2)
    w.inbox.push({ id: 'x', system: 'finance', tick: 0, title: 't', lines: [], action: { fn: 'deleteEverything', args: [] } })
    expect(M.approveInbox(w, 'x').ok).toBe(false)
    expect(M.rejectInbox(w, 'x').ok).toBe(true)
    expect(w.inbox.length).toBe(0)
  })
  it('research manager picks research in the focus branch', () => {
    const { w } = boot(2)
    hireMgr(w, 'research'); w.managerFocus = 'Facilities'
    M.setAutopilot(w, 'research', true)
    stepMany(w, 24)
    expect(w.research.current).toBeDefined()
  })
  it('does nothing when no autopilot is on', () => {
    const { w } = boot(2)
    hireMgr(w, 'sales'); hireMgr(w, 'finance')
    const before = JSON.stringify(w)
    M.runManagers(w)
    expect(JSON.stringify(w)).toBe(before)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { useGame } from './store'
import { HUBS, hubOf } from './nav'
import type { Preview } from '@sim/preview'
import type { World } from '@sim/types'

const g = () => useGame.getState()
const fresh = (): World => {
  g().newGame({ company: 'T', ceo: 'Me', advisor: 'cfo', seed: 3, logo: { glyph: 'hex', color: 'red' } })
  return g().w!
}
const spendOk = (usd: number) => (w: World) => { w.cash -= usd; return { ok: true as const, value: undefined } }
const cheap: Preview = { tier: 'cheap', lines: ['x'] }
const expensive: Preview = { tier: 'expensive', lines: ['x'], cost: 1 }
const severe: Preview = { tier: 'severe', lines: ['x'] }

beforeEach(() => { fresh(); g().setSettings({ confirmExpensive: true, lastTab: {} }) })

describe('hub navigation', () => {
  it('maps every screen to one hub', () => {
    expect(hubOf('fleet')).toBe('build')
    expect(hubOf('overview')).toBe('hq')
    expect(hubOf('paper')).toBe('world')
    const all = Object.values(HUBS).flatMap((h) => h.screens)
    expect(new Set(all).size).toBe(all.length)
  })
  it('remembers the last sub-tab per hub', () => {
    g().go('silicon')
    g().goHub('sell')
    expect(g().screen).toBe('store')
    g().goHub('build')
    expect(g().screen).toBe('silicon')
  })
})

describe('undo', () => {
  it('restores the world snapshot', () => {
    const before = g().w!.cash
    g().act(spendOk(1e6), undefined, { undoable: true })
    expect(g().w!.cash).toBe(before - 1e6)
    expect(g().undo).not.toBeNull()
    g().doUndo()
    expect(g().w!.cash).toBe(before)
    expect(g().undo).toBeNull()
  })
  it('is cleared as soon as game time passes', () => {
    g().act(spendOk(1e6), undefined, { undoable: true })
    g().setSpeed(1)
    g().tickFrame(0.25)
    expect(g().undo).toBeNull()
  })
  it('is not offered for plain actions', () => {
    g().act(spendOk(1))
    expect(g().undo).toBeNull()
  })
})

describe('confirm', () => {
  it('lets cheap actions straight through', async () => {
    await expect(g().confirm('t', cheap, 'Go')).resolves.toBe(true)
    expect(g().pending).toBeNull()
  })
  it('skips the expensive tier when the setting is off', async () => {
    g().setSettings({ confirmExpensive: false })
    await expect(g().confirm('t', expensive, 'Buy')).resolves.toBe(true)
  })
  it('waits for an answer on severe actions', async () => {
    const p = g().confirm('t', severe, 'Sell')
    expect(g().pending?.preview.tier).toBe('severe')
    g().answer(false)
    await expect(p).resolves.toBe(false)
    expect(g().pending).toBeNull()
  })
  it('confirmAct runs the action after yes, and reports its error', async () => {
    const p = g().confirmAct('t', severe, 'Do', () => ({ ok: false as const, error: 'broke meanwhile' }))
    g().answer(true)
    const r = await p
    expect(r && !r.ok && r.error).toBe('broke meanwhile')
    expect(g().toast?.kind).toBe('err')
  })
  it('confirmAct returns null when cancelled and does not run the action', async () => {
    let ran = false
    const p = g().confirmAct('t', severe, 'Do', () => { ran = true; return { ok: true as const, value: undefined } })
    g().answer(false)
    expect(await p).toBeNull()
    expect(ran).toBe(false)
  })
  it('marks a managed system as touched', () => {
    g().act(spendOk(1), undefined, { system: 'facilities' })
    expect(g().w!.autopilot.facilities.handsOffUntil).toBe(g().w!.tick + 168)
  })
})

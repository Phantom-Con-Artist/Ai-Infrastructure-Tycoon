import { describe, expect, it } from 'vitest'
import * as A from './actions'
import * as P from './preview'
import { createWorld } from './world'
import { boot, firstGpu } from './testkit'
import type { ChipSpec } from './silicon'
const CHIP: ChipSpec = { kind: 'gpu', name: 'Dreamchip 1', nodeId: 'n7', dieMm2: 600, dies: 1, pkg: 'cowos-s', computeFrac: 0.5, sramFrac: 0.2, clockGHz: 1.6, archGen: 1, precision: 'bf16', redundancy: true, hbmId: 'hbm3', hbmStacks: 4, hbmHeight: 8 }

const frozen = (w: object, f: () => P.Preview): P.Preview => {
  const before = JSON.stringify(w)
  const p = f()
  expect(JSON.stringify(w)).toBe(before)
  expect(p.lines.length).toBeGreaterThan(0)
  return p
}

describe('previews never mutate and always explain', () => {
  it('sell servers mentions spares and refund', () => {
    const { w, site } = boot(3)
    site.stock[firstGpu(w)] = 8
    const p = frozen(w, () => P.previewSellServers(w, site.id, firstGpu(w), 8))
    expect(p.tier).toBe('severe')
    expect(p.lines.join(' ')).toMatch(/spare/i)
    expect(p.lines.join(' ')).toMatch(/\$/)
  })
  it('removing the only PDU near racks is severe and names the racks', () => {
    const w = createWorld(4); w.cash = 1e9
    const site = (A.buildSite(w, 'or') as { ok: true; value: { id: string } }).value
    const hall = (A.buildHall(w, site.id, { size: 'M', cooling: 'air', fabric: 'eth100' }) as { ok: true; value: { id: string } }).value
    const pdu = A.placeEquipment(w, hall.id, 'pdu', 0, 0); expect(pdu.ok).toBe(true)
    expect(A.placeRack(w, hall.id, 3, 0).ok).toBe(true)
    const p = frozen(w, () => P.previewRemove(w, hall.id, 0, 0))
    expect(p.tier).toBe('severe')
    expect(p.lines.join(' ')).toMatch(/rack/i)
  })
  it('fire, ipo, acquire, ppa, loan, tapeout, training all explain themselves', () => {
    const { w, site } = boot(3)
    frozen(w, () => P.previewFire(w, w.people[0].id))
    frozen(w, () => P.previewIpo(w))
    frozen(w, () => P.previewAcquire(w, w.rivals[0].id))
    frozen(w, () => P.previewPpa(w, site.id, 5))
    frozen(w, () => P.previewLoan(w, 10e6))
    frozen(w, () => P.previewTapeout(w, CHIP))
    expect(frozen(w, () => P.previewTraining(w, w.cash * 0.5)).tier).toBe('severe')
    expect(frozen(w, () => P.previewTraining(w, w.cash * 0.05)).tier).toBe('cheap')
  })
  it('previewSpend tiers by 25% of cash, and infinite cash is never expensive', () => {
    const w = createWorld(3)
    expect(P.previewSpend(w, w.cash * 0.3).tier).toBe('expensive')
    expect(P.previewSpend(w, w.cash * 0.1).tier).toBe('cheap')
    expect(P.previewSpend(w, w.cash * 3).lines.join(' ')).toMatch(/short/i)
    w.rules.infiniteCash = true
    expect(P.previewSpend(w, w.cash * 10).tier).toBe('cheap')
  })
})

import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { itemAt } from './layout'
import { boot, firstGpu, ready } from './testkit'

describe('moving placed items', () => {
  it('moves a populated rack to an empty tile, keeping its servers and charging nothing', () => {
    const { w, site, hall } = boot(5)
    ready(w, site, hall, firstGpu(w), 4)
    const rack = hall.racks.find((r) => r.servers > 0)!
    // free a tile first
    const empty = hall.racks.find((r) => r.servers === 0)!
    const [tx, ty] = [empty.x, empty.y]
    expect(A.removeAt(w, hall.id, tx, ty).ok).toBe(true)
    const cash = w.cash, from = [rack.x, rack.y]
    const r = A.moveItem(w, hall.id, from[0], from[1], tx, ty)
    expect(r.ok).toBe(true)
    expect(itemAt(hall, tx, ty)?.rack?.id).toBe(rack.id)
    expect(itemAt(hall, from[0], from[1])).toBeNull()
    expect(rack.servers).toBeGreaterThan(0)
    expect(w.cash).toBe(cash)
  })
  it('refuses an occupied or out-of-bounds target and leaves the item where it was', () => {
    const { w, hall } = boot(5)
    const [a, b] = hall.racks
    expect(A.moveItem(w, hall.id, a.x, a.y, b.x, b.y).ok).toBe(false)
    expect(A.moveItem(w, hall.id, a.x, a.y, -1, 0).ok).toBe(false)
    expect(itemAt(hall, a.x, a.y)?.rack?.id).toBe(a.id)
  })
  it('lets equipment move onto tiles it already partly covers, and rotate in place', () => {
    const { w, hall } = boot(5)
    const pdu = hall.equipment.find((e) => e.kind === 'pdu')!
    const id = pdu.id, x0 = pdu.x
    // clear the column to the right so a one-tile nudge has room
    for (const r of hall.racks.filter((r) => r.x === pdu.x + 2 || r.x === pdu.x + 1)) A.removeAt(w, hall.id, r.x, r.y)
    const res = A.moveItem(w, hall.id, pdu.x, pdu.y, pdu.x + 1, pdu.y)
    expect(res.ok).toBe(true)
    expect(hall.equipment.find((e) => e.id === id)!.x).toBe(x0 + 1)
    expect(A.moveItem(w, hall.id, x0 + 1, pdu.y, x0 + 1, pdu.y, 1).ok).toBe(true)
    expect(hall.equipment.find((e) => e.id === id)!.rot).toBe(1)
  })
  it('re-wires power and cooling after a move', () => {
    const { w, hall } = boot(5)
    const pdu = hall.equipment.find((e) => e.kind === 'pdu')!
    const fed = (): number => hall.racks.filter((r) => r.pduId === pdu.id).length
    const before = fed()
    expect(before).toBeGreaterThan(0)
    // move the PDU far into a freed corner, away from its racks
    const far = hall.racks.filter((r) => r.x >= hall.w - 2 && r.y >= hall.d - 2)
    for (const r of far) A.removeAt(w, hall.id, r.x, r.y)
    const moved = A.moveItem(w, hall.id, pdu.x, pdu.y, hall.w - 2, hall.d - 2)
    expect(moved.ok).toBe(true)
    expect(fed()).not.toBe(before)
  })
})

import { EQUIP, type EquipKind } from './data/equipment'
import type { Equip, Hall, Rack } from './types'

export type Rot = 0 | 1 | 2 | 3
export const footprint = (kind: EquipKind | 'rack', rot: Rot): { w: number; d: number } => {
  if (kind === 'rack') return { w: 1, d: 1 }
  const s = EQUIP[kind]
  return rot % 2 === 0 ? { w: s.w, d: s.d } : { w: s.d, d: s.w }
}
const centre = (x: number, y: number, kind: EquipKind | 'rack', rot: Rot): [number, number] => {
  const f = footprint(kind, rot)
  return [x + f.w / 2, y + f.d / 2]
}

/** Map of occupied tiles → occupant id. */
export function occupancy(h: Hall): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of h.racks) m.set(`${r.x},${r.y}`, r.id)
  for (const e of h.equipment) {
    const f = footprint(e.kind, e.rot)
    for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) m.set(`${e.x + i},${e.y + j}`, e.id)
  }
  return m
}
export function canPlace(h: Hall, kind: EquipKind | 'rack', x: number, y: number, rot: Rot): string | null {
  const f = footprint(kind, rot)
  if (x < 0 || y < 0 || x + f.w > h.w || y + f.d > h.d) return 'Out of bounds'
  const occ = occupancy(h)
  for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) if (occ.has(`${x + i},${y + j}`)) return 'Tile occupied'
  return null
}
export function itemAt(h: Hall, x: number, y: number): { rack?: Rack; equip?: Equip } | null {
  const id = occupancy(h).get(`${x},${y}`)
  if (!id) return null
  const rack = h.racks.find((r) => r.id === id)
  if (rack) return { rack }
  const equip = h.equipment.find((e) => e.id === id)
  return equip ? { equip } : null
}

/** Why the item on (fx, fy) can't be set down at (tx, ty) with rotation `rot` — null if it can. Ignores its own tiles. */
export function moveError(h: Hall, fx: number, fy: number, tx: number, ty: number, rot?: Rot): string | null {
  const it = itemAt(h, fx, fy); if (!it) return 'Nothing here'
  if (it.rack) {
    const racks = h.racks; h.racks = racks.filter((x) => x !== it.rack)
    try { return canPlace(h, 'rack', tx, ty, rot ?? it.rack.rot) } finally { h.racks = racks }
  }
  const e = it.equip!, eq = h.equipment; h.equipment = eq.filter((x) => x !== e)
  try { return canPlace(h, e.kind, tx, ty, rot ?? e.rot) } finally { h.equipment = eq }
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by)

/** Recompute rack → PDU and rack → cooler assignments, plus hall capacity totals. Call after any layout change. */
export function relayout(h: Hall, liquidOk: boolean): void {
  const pdus = h.equipment.filter((e) => e.kind === 'pdu').map((e) => ({ e, c: centre(e.x, e.y, e.kind, e.rot) }))
  const coolers = h.equipment.filter((e) => e.kind === 'crah' || (e.kind === 'cdu' && liquidOk)).map((e) => ({ e, c: centre(e.x, e.y, e.kind, e.rot), r: EQUIP[e.kind].radius }))
  for (const r of h.racks) {
    const [rx, ry] = [r.x + 0.5, r.y + 0.5]
    let best: Equip | undefined, bd = Infinity
    for (const { e: p, c: [cx, cy] } of pdus) { const d = dist(rx, ry, cx, cy); if (d <= EQUIP.pdu.radius && d < bd) { bd = d; best = p } }
    r.pduId = best?.id
    r.pduIdx = best ? h.equipment.indexOf(best) : -1
    r.powered = !!best
    let bc: Equip | undefined, bcd = Infinity
    for (const { e: c, c: [cx, cy], r: rad } of coolers) { const d = dist(rx, ry, cx, cy); if (d <= rad && d < bcd) { bcd = d; bc = c } }
    r.coolerId = bc?.id
    r.coolerIdx = bc ? h.equipment.indexOf(bc) : -1
    r.cooled = !!bc
  }
  h.powerKw = pdus.length * EQUIP.pdu.kw
  h.coolKw = coolers.reduce((a, c) => a + EQUIP[c.e.kind].kw, 0)
  h.upsKwh = h.equipment.filter((e) => e.kind === 'ups').length * EQUIP.ups.kw
  h.upsSoc = Math.min(h.upsSoc, h.upsKwh)
}
export const rackCapacity = (h: Hall): number => h.racks.length
export const freeTiles = (h: Hall): number => h.w * h.d - occupancy(h).size

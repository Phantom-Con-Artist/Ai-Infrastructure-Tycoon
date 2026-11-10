export type EquipKind = 'pdu' | 'crah' | 'cdu' | 'ups'

export interface EquipSpec {
  kind: EquipKind; name: string; blurb: string
  w: number; d: number          // footprint in tiles (before rotation)
  kw: number                    // power (pdu) or heat-removal (crah/cdu) capacity; ups = kWh
  radius: number                // reach in tiles
  cost: number; needsTech?: string; model: string
}

export const EQUIP: Record<EquipKind, EquipSpec> = {
  pdu:  { kind: 'pdu',  name: 'PDU + switchgear',      blurb: 'Feeds racks within reach. Overload it and breakers throttle everything on it.', w: 1, d: 1, kw: 400, radius: 6, cost: 1_200_000, model: 'pdu' },
  crah: { kind: 'crah', name: 'CRAH air handler',      blurb: 'Pushes chilled air to nearby racks. Derates in hot weather.',                   w: 1, d: 2, kw: 180, radius: 7, cost: 150_000,   model: 'crah' },
  cdu:  { kind: 'cdu',  name: 'Coolant distribution unit', blurb: 'Liquid loop for dense racks. Short pipe runs only.',                        w: 1, d: 1, kw: 900, radius: 3, cost: 1_100_000, model: 'cdu', needsTech: 'dlc' },
  ups:  { kind: 'ups',  name: 'UPS battery string',    blurb: 'Rides the hall through grid hiccups until generators spin up.',               w: 1, d: 1, kw: 500, radius: 99, cost: 400_000,  model: 'ups' }
}
export const RACK_COST = 30_000
export const TILE = 1.2 // metres per tile

export type HallSize = 'S' | 'M' | 'L' | 'XL'
export const HALL_SIZES: Record<HallSize, { w: number; d: number; name: string }> = {
  S:  { w: 12, d: 8,  name: 'Pod (12×8)' },
  M:  { w: 20, d: 12, name: 'Data hall (20×12)' },
  L:  { w: 32, d: 18, name: 'Mega hall (32×18)' },
  XL: { w: 48, d: 28, name: 'Hyperscale hall (48×28)' }
}
export const hallShellCost = (w: number, d: number): number => 1_200_000 + w * d * 9_000

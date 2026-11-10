import type { World } from './types'

export interface Milestone { id: string; title: string; hint: string; done: (w: World) => boolean; screen: string }
/** The guided path from an empty field to a running AI company. Order matters: first unmet = current goal. */
export const MILESTONES: Milestone[] = [
  { id: 'land', title: 'Acquire land', hint: 'Pick a region with cheap power and cool air.', screen: 'sites', done: (w) => w.sites.length > 0 },
  { id: 'hall', title: 'Break ground on a hall', hint: 'A pod is enough to start.', screen: 'sites', done: (w) => w.sites.some((s) => s.halls.length > 0) },
  { id: 'power', title: 'Place a PDU and a cooler', hint: 'Racks need power and cooling in reach.', screen: 'sites', done: (w) => w.sites.some((s) => s.halls.some((h) => h.equipment.some((e) => e.kind === 'pdu') && h.coolKw > 0)) },
  { id: 'racks', title: 'Place racks', hint: 'Drag across the floor to paint a row.', screen: 'sites', done: (w) => w.sites.some((s) => s.halls.some((h) => h.racks.length > 0)) },
  { id: 'order', title: 'Order GPU servers', hint: 'Start with older, cheaper silicon.', screen: 'fleet', done: (w) => w.sites.some((s) => s.orders.length > 0 || Object.values(s.stock).some((n) => n > 0) || s.halls.some((h) => h.racks.some((r) => r.servers > 0))) },
  { id: 'install', title: 'Install servers', hint: 'Once delivered, install from the loading dock.', screen: 'sites', done: (w) => w.sites.some((s) => s.halls.some((h) => h.racks.some((r) => r.servers > 0))) },
  { id: 'revenue', title: 'Earn your first dollar', hint: 'Rent GPUs in Fleet, or sign a training deal.', screen: 'fleet', done: (w) => w.ledger.some((d) => d.revenue > 0) || w.today.revenue > 0 },
  { id: 'model', title: 'Train your own model', hint: 'Lab → pick a size, burn FLOPs.', screen: 'lab', done: (w) => w.models.length > 0 },
  { id: 'launch', title: 'Launch it to the world', hint: 'Price it, deploy it, hold a keynote.', screen: 'lab', done: (w) => w.models.some((m) => m.releasedByPlayer) },
  { id: 'unicorn', title: 'Become a unicorn', hint: '$1B valuation.', screen: 'overview', done: (w) => w.ledger.length > 0 && (w.ledger.at(-1)!.revenue * 365 * 8 + w.cash) > 1e9 }
]
export const currentMilestone = (w: World): Milestone | undefined => MILESTONES.find((m) => !m.done(w))

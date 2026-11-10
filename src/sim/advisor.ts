/** HQ advisor: the next few things worth doing, worked out from the world, plus a gentle milestone chain. */
import { EQUIP } from './data/equipment'
import { fleetStats } from './world'
import { clamp, committed, pushNews } from './util'
import type { World } from './types'
import { MILESTONES } from './objectives'

export interface Step { id: string; title: string; body: string; screen: string; focus?: string; severity: 0 | 1 | 2 }

const MAX_STEPS = 3

/** Installed, working and committed servers across all sites (servers, not GPUs; ×8 for GPUs). */
export function fleetUse(w: World): { servers: number; healthy: number; committed: number } {
  let servers = 0, healthy = 0, used = 0
  for (const s of w.sites) {
    const ids = new Set<string>()
    for (const h of s.halls) for (const r of h.racks) if (r.gpuId && r.servers > 0) ids.add(r.gpuId)
    for (const id of ids) used += committed(w, s.id, id)
  }
  for (const st of fleetStats(w).values()) { servers += st.total; healthy += st.healthy }
  return { servers, healthy, committed: Math.min(used, healthy) }
}

/** Average net cash flow per day over the last 14 ledger days (negative = burning). */
function netPerDay(w: World): number {
  const l = w.ledger.slice(-14)
  if (!l.length) return 0
  return l.reduce((a, d) => a + d.revenue - d.powerCost - d.staffCost - d.opex - d.interest, 0) / l.length
}

type Rule = (w: World) => Step | null

const RULES: Rule[] = [
  (w) => {
    const net = netPerDay(w)
    const days = net < 0 ? w.cash / -net : Infinity
    if (w.rules?.infiniteCash || (w.cash >= 0 && days >= 14)) return null
    return {
      id: 'runway', severity: 2, screen: 'finance',
      title: w.cash < 0 ? 'Cash is negative' : `About ${Math.max(0, Math.floor(days))} days of cash left`,
      body: 'Borrow, sell spare servers, raise prices or slow hiring before the bank does it for you.'
    }
  },
  (w) => w.inbox.length ? { id: 'inbox', severity: 2, screen: 'overview', title: `${w.inbox.length} request${w.inbox.length === 1 ? '' : 's'} from your managers`, body: 'They need your sign-off before they can act.' } : null,
  (w) => w.sites.length ? null : { id: 'no-site', severity: 1, screen: 'sites', title: 'Buy land for your first data center', body: 'Cheap, clean power and a cool climate make everything after this easier.' },
  (w) => w.sites.length && !w.sites.some((s) => s.halls.length) ? { id: 'no-hall', severity: 1, screen: 'sites', focus: w.sites[0].id, title: 'Build a hall', body: 'A hall is the room your racks live in. Start with a medium air-cooled one.' } : null,
  (w) => {
    for (const s of w.sites) for (const h of s.halls) for (const r of h.racks) {
      if (!r.powered || !r.cooled) return { id: 'uncovered-rack', severity: 2, screen: 'sites', focus: h.id, title: `A rack in ${h.name} has no ${!r.powered ? 'power' : 'cooling'}`, body: 'Move it closer to a PDU and an air handler, or add one nearby.' }
    }
    return null
  },
  (w) => {
    for (const s of w.sites) for (const h of s.halls) for (const e of h.equipment) {
      if (e.kind === 'pdu' && e.load > EQUIP.pdu.kw) return { id: 'pdu-overload', severity: 2, screen: 'sites', focus: h.id, title: `A PDU in ${h.name} is overloaded`, body: 'Its racks are being throttled. Add another PDU or spread the racks out.' }
    }
    return null
  },
  (w) => {
    const ready = w.sites.some((s) => s.halls.some((h) => w.tick >= h.readyTick))
    const installed = w.sites.some((s) => s.halls.some((h) => h.racks.some((r) => r.servers > 0)))
    return ready && !installed ? { id: 'no-servers', severity: 1, screen: 'fleet', title: 'Your hall is ready — fill it with servers', body: 'Order GPU servers, then install them into racks.' } : null
  },
  (w) => {
    const u = fleetUse(w)
    const busy = u.healthy > 0 ? u.committed / u.healthy : 1
    return u.healthy > 0 && busy < 0.75 ? { id: 'idle-gpus', severity: 1, screen: 'fleet', title: `${Math.round(100 * (1 - busy))}% of your GPUs are idle`, body: 'Rent them out, take a training contract, or serve a model.' } : null
  },
  (w) => w.models.some((m) => m.owner === 'player' && m.releasedByPlayer) && !w.products.length ? { id: 'no-product', severity: 0, screen: 'store', title: 'Turn your model into a product', body: 'A chat app or an API earns far more than raw tokens.' } : null,
  (w) => w.sites.length && !w.research.current ? { id: 'research-idle', severity: 0, screen: 'research', title: 'Your researchers are idle', body: 'Pick something to research. Cooling and power techs pay off first.' } : null
]

/** Up to three suggestions, most urgent first (rule order breaks ties). */
export function nextSteps(w: World): Step[] {
  const out: Step[] = []
  for (const r of RULES) { const s = r(w); if (s) out.push(s) }
  return out.map((s, i) => ({ s, i })).sort((a, b) => b.s.severity - a.s.severity || a.i - b.i).slice(0, MAX_STEPS).map((x) => x.s)
}

export interface Goal { id: string; title: string; check: (w: World) => boolean }
const positiveStreak = (w: World): number => { let n = 0; for (let i = w.ledger.length - 1; i >= 0; i--) { const d = w.ledger[i]; if (d.revenue - d.powerCost - d.staffCost - d.opex - d.interest > 0) n++; else break } return n }
/** The guided path from objectives.ts, then a few longer-term goals. One chain, shown on HQ. */
export const GOALS: Goal[] = [
  ...MILESTONES.map((m) => ({ id: m.id, title: m.title, check: m.done })),
  { id: 'profit-week', title: 'Make a profit seven days in a row', check: (w) => positiveStreak(w) >= 7 },
  { id: 'first-product', title: 'Launch a product', check: (w) => w.products.length > 0 },
  { id: 'first-manager', title: 'Hire a manager', check: (w) => w.people.some((p) => p.role.startsWith('mgr-')) }
]

export function checkGoals(w: World): void {
  for (const g of GOALS) {
    if (w.goalsDone.includes(g.id) || !g.check(w)) continue
    w.goalsDone.push(g.id)
    w.reputation = clamp(w.reputation + 1, 0, 100)
    pushNews(w, 'good', `Goal reached: ${g.title}`, `${w.goalsDone.length} of ${GOALS.length} milestones done.`, 'mine', 1)
  }
}

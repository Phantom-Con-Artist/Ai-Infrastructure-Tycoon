/** The three or four numbers each screen opens with, in plain English. Pure: world in, items out. */
import { valuation, debt, creditLimit } from '@sim/world'
import { fleetUse } from '@sim/advisor'
import { GPUS_PER_SERVER } from '@sim/data/hardware'
import { leadDays } from '@sim/market'
import { payrollPerDay, isManager } from '@sim/people'
import { TECHS } from '@sim/data/tech'
import { domination } from '@sim/corporate'
import type { World } from '@sim/types'
import type { SummaryItem } from './ui'
import { money, num } from './format'

const plural = (n: number, one: string, many = one + 's'): string => `${num(n)} ${n === 1 ? one : many}`
const netPerDay = (w: World): number => {
  const l = w.ledger.slice(-14)
  return l.length ? l.reduce((a, d) => a + d.revenue - d.powerCost - d.staffCost - d.opex - d.interest, 0) / l.length : 0
}

export function fleetSummary(w: World): SummaryItem[] {
  const u = fleetUse(w)
  const spares = w.sites.reduce((a, s) => a + Object.values(s.stock).reduce((b, n) => b + n, 0), 0)
  const rent = w.ledger.at(-1)?.rentalRev ?? 0
  const util = u.healthy > 0 ? u.committed / u.healthy : 0
  const total = u.servers
  return [
    { label: 'GPUs installed', value: num(u.servers * GPUS_PER_SERVER), hint: total ? `${plural(total, 'server')} · ${num(total - u.healthy)} down` : 'none yet' },
    { label: 'Busy', value: `${Math.round(util * 100)}%`, tone: total && util < 0.5 ? 'warn' : total ? 'pos' : undefined, hint: 'rented, training or serving' },
    { label: 'Rental income', value: `${money(rent)}/day`, tone: rent > 0 ? 'pos' : undefined },
    { label: 'Delivery time', value: `${leadDays(w)} days`, hint: `${plural(spares, 'spare server')} on the dock` }
  ]
}

export function labSummary(w: World): SummaryItem[] {
  const mine = w.models.filter((m) => m.owner === 'player')
  const best = mine.reduce((a, m) => Math.max(a, m.elo), 0)
  const top = Math.max(...w.competitors.map((c) => c.elo), 0)
  const running = w.runs.filter((r) => r.status === 'running').length
  return [
    { label: 'Training now', value: plural(running, 'run'), tone: running ? 'pos' : undefined },
    { label: 'Your models', value: num(mine.length), hint: `${mine.filter((m) => m.releasedByPlayer).length} launched` },
    { label: 'Best score', value: best ? `${Math.round(best)} Elo` : '—', hint: `leader: ${Math.round(top)}`, tone: best && best >= top ? 'pos' : undefined },
    { label: 'Datasets', value: num(Object.keys(w.datasets ?? {}).length), hint: 'owned' }
  ]
}

export function siliconSummary(w: World): SummaryItem[] {
  const d = w.silicon.designs
  const stock = Object.values(w.silicon.chipStock).reduce((a, n) => a + n, 0)
  const rev = d.reduce((a, x) => a + x.revenue, 0)
  return [
    { label: 'Chip designs', value: num(d.length), hint: `${d.filter((x) => x.status === 'designing').length} still in design` },
    { label: 'Chips in stock', value: num(stock) },
    { label: 'Chip sales', value: money(rev), hint: 'all time', tone: rev > 0 ? 'pos' : undefined }
  ]
}

export function storeSummary(w: World): SummaryItem[] {
  let users = 0, paid = 0, rev = 0
  for (const p of w.products) { const h = p.history.at(-1); users += h?.users ?? 0; paid += h?.paid ?? 0; rev += h?.revenue ?? 0 }
  return [
    { label: 'Products', value: num(w.products.length) },
    { label: 'Users', value: num(users), hint: `${num(paid)} paying` },
    { label: 'Product revenue', value: `${money(rev)}/day`, tone: rev > 0 ? 'pos' : undefined }
  ]
}

export function contractsSummary(w: World): SummaryItem[] {
  const open = w.contracts.filter((c) => !c.accepted).length
  const active = w.contracts.filter((c) => c.accepted && !c.done)
  const late = active.filter((c) => w.tick > c.deadlineTick).length
  return [
    { label: 'Offers waiting', value: num(open) },
    { label: 'In progress', value: num(active.length), tone: late ? 'neg' : active.length ? 'pos' : undefined, hint: late ? `${late} past deadline` : undefined },
    { label: 'Delivered', value: num(w.contracts.filter((c) => c.done).length) }
  ]
}

export function researchSummary(w: World): SummaryItem[] {
  const cur = TECHS.find((t) => t.id === w.research.current)
  const done = Object.values(w.research.levels).reduce((a, b) => a + b, 0) || w.research.done.length
  return [
    { label: 'Researching', value: cur ? cur.name : 'Nothing', tone: cur ? undefined : 'warn', hint: cur ? `${money(w.research.progressUsd)} spent so far` : 'pick something below' },
    { label: 'Upgrades done', value: num(done), hint: `of ${TECHS.length} in the tree` },
    { label: 'Researchers', value: num(w.staff.researchers, 1), hint: `${w.labs.length} lab${w.labs.length === 1 ? '' : 's'}` }
  ]
}

export function financeSummary(w: World): SummaryItem[] {
  const net = netPerDay(w)
  const days = net < 0 ? Math.max(0, w.cash) / -net : Infinity
  const short = w.cash < 0 || days < 30
  return [
    { label: 'Cash', value: w.rules?.infiniteCash ? '∞ Unlimited' : money(w.cash), tone: !w.rules?.infiniteCash && w.cash < 0 ? 'neg' : undefined },
    { label: 'Net per day', value: w.ledger.length ? money(net) : '—', tone: net > 0 ? 'pos' : net < 0 ? 'neg' : undefined, hint: 'last 14 days' },
    { label: 'Runway', value: w.rules?.infiniteCash ? 'Unlimited' : !Number.isFinite(days) ? 'Profitable' : days > 1095 ? 'Over 3 years' : `${Math.floor(days)} days`, tone: !w.rules?.infiniteCash && short ? 'neg' : 'pos', hint: 'until cash runs out' },
    { label: 'Debt', value: money(debt(w)), hint: `limit ${money(creditLimit(w))}` }
  ]
}

export function teamSummary(w: World): SummaryItem[] {
  const ic = w.people.filter((p) => !isManager(p.role))
  const morale = ic.length ? ic.reduce((a, p) => a + p.morale, 0) / ic.length : 0
  const mgrs = w.people.length - ic.length
  return [
    { label: 'People', value: num(w.people.length), hint: mgrs ? `${mgrs} manager${mgrs === 1 ? '' : 's'}` : 'no managers yet' },
    { label: 'Payroll', value: `${money(payrollPerDay(w) * 365)}/yr` },
    { label: 'Morale', value: `${Math.round(morale * 100)}%`, tone: morale < 0.5 ? 'neg' : morale < 0.65 ? 'warn' : 'pos' },
    { label: 'Candidates', value: num(w.candidates.length), hint: 'ready to interview' }
  ]
}

export function rankingsSummary(w: World): SummaryItem[] {
  const best = w.models.filter((m) => m.owner === 'player').reduce((a, m) => Math.max(a, m.elo), 0)
  const modelRank = best ? 1 + w.competitors.filter((c) => c.elo > best).length : 0
  const v = valuation(w)
  const coRank = 1 + w.rivals.filter((r) => !r.owned && r.valuation > v).length
  const dom = domination(w)
  return [
    { label: 'Best model', value: modelRank ? `#${modelRank}` : 'Unranked', hint: best ? `${Math.round(best)} Elo` : 'train one in the Lab' },
    { label: 'Company', value: `#${coRank}`, hint: `by valuation · ${money(v)}` },
    { label: 'World domination', value: `${(dom.index * 100).toFixed(dom.index < 0.01 ? 2 : 1)}%`, hint: dom.stage }
  ]
}

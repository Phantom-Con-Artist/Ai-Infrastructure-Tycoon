/**
 * Pure consequence previews for actions the player can't take back. Each returns plain-English lines for the confirm
 * modal and the tier that decides how hard the UI makes you confirm. Nothing here mutates the world.
 */
import { EQUIP, RACK_COST } from './data/equipment'
import { itemAt, relayout } from './layout'
import { ROLES } from './people'
import { corp } from './data/lore'
import { acquisitionPrice, antitrustRisk } from './corporate'
import { creditLimit, debt, valuation } from './world'
import { designMonths } from './chips'
import { evaluateChip, type ChipSpec } from './silicon'
import { gpu, findSite, yearOf } from './util'
import { ppaQuote, sellRefund } from './actions'
import type { World } from './types'

export type Tier = 'severe' | 'expensive' | 'cheap'
export interface Preview { lines: string[]; cost?: number; tier: Tier }

const EXPENSIVE_SHARE = 0.25
export function usd(n: number): string {
  const a = Math.abs(n), s = n < 0 ? '−' : ''
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}k`
  return `${s}$${a.toFixed(0)}`
}
const isExpensive = (w: World, cost: number): boolean => !w.rules?.infiniteCash && cost > EXPENSIVE_SHARE * Math.max(0, w.cash)
const cashAfter = (w: World, cost: number): string => w.rules?.infiniteCash ? 'Cash: unlimited (sandbox)'
  : cost > w.cash ? `You're ${usd(cost - w.cash)} short — borrow or sell something first` : `Cash after: ${usd(w.cash - cost)}`

/** Any plain purchase: expensive above 25% of cash, otherwise cheap. */
export function previewSpend(w: World, cost: number): Preview {
  return { tier: isExpensive(w, cost) ? 'expensive' : 'cheap', cost, lines: [`Costs ${usd(cost)}`, cashAfter(w, cost)] }
}

export function previewSellServers(w: World, siteId: string, gpuId: string, count: number): Preview {
  const s = findSite(w, siteId), g = gpu(w, gpuId)
  const have = s.stock[gpuId] ?? 0, n = Math.min(count, have)
  const refund = sellRefund(w, gpuId, n)
  return {
    tier: 'severe', lines: [
      `Sell ${n} spare ${g.name} server${n === 1 ? '' : 's'} for ${usd(refund)}`,
      `Spares left for repairs: ${have - n}${have - n === 0 ? ' — broken servers will wait for a technician' : ''}`,
      'Buying them back later costs full market price'
    ]
  }
}

export function previewRemove(w: World, hallId: string, x: number, y: number): Preview {
  const hall = w.sites.flatMap((s) => s.halls).find((h) => h.id === hallId)
  if (!hall) return { tier: 'cheap', lines: ['Nothing to remove'] }
  const it = itemAt(hall, x, y)
  if (!it) return { tier: 'cheap', lines: ['Nothing here'] }
  if (it.rack) return { tier: 'cheap', lines: [`Remove an empty rack, refund ${usd(RACK_COST * 0.3)}`] }
  const e = it.equip!
  const spec = EQUIP[e.kind]
  // Simulate the hall without this unit and count racks that lose power or cooling.
  const ghost = structuredClone(hall)
  ghost.equipment = ghost.equipment.filter((q) => !(q.x === e.x && q.y === e.y && q.kind === e.kind))
  relayout(ghost, hall.cooling === 'dlc' || hall.cooling === 'immersion')
  let dark = 0, hot = 0, servers = 0
  ghost.racks.forEach((r, i) => {
    const was = hall.racks[i]
    if (was.powered && !r.powered) { dark++; servers += r.servers }
    else if (was.cooled && !r.cooled) { hot++; servers += r.servers }
  })
  const lines = [`Remove ${spec.name}, refund ${usd(spec.cost * 0.3)} (30%)`]
  if (dark) lines.push(`${dark} rack${dark === 1 ? '' : 's'} lose power`)
  if (hot) lines.push(`${hot} rack${hot === 1 ? '' : 's'} lose cooling and will throttle`)
  if (servers) lines.push(`${servers} installed server${servers === 1 ? '' : 's'} affected`)
  return { tier: dark || hot ? 'severe' : 'cheap', lines }
}

export function previewFire(w: World, personId: string): Preview {
  const p = w.people.find((x) => x.id === personId)
  if (!p) return { tier: 'cheap', lines: ['No such person'] }
  return {
    tier: 'severe', cost: p.salary * 0.25, lines: [
      `Let ${p.name} (${ROLES[p.role]?.name ?? p.role}, skill ${p.skill}) go`,
      `Severance ${usd(p.salary * 0.25)}`,
      `Everyone else's morale drops a little`
    ]
  }
}

export function previewIpo(w: World): Preview {
  const v = valuation(w), raise = v * 0.2
  return {
    tier: 'severe', lines: [
      `Sell 20% of the company at ${usd(v)}: raises ${usd(raise)}`,
      `Your stake goes from ${(w.founderStake * 100).toFixed(0)}% to ${(w.founderStake * 80).toFixed(0)}%`,
      'You can only go public once'
    ]
  }
}

export function previewAcquire(w: World, rivalId: string): Preview {
  const price = acquisitionPrice(w, rivalId), risk = antitrustRisk(w, rivalId)
  const lines = [`Buy ${corp(rivalId).name} for ${usd(price)} (35% control premium)`, cashAfter(w, price)]
  if (risk > 0) lines.push(`${Math.round(risk * 100)}% chance regulators block it — you'd pay a ${usd(price * 0.04)} break fee`)
  return { tier: 'severe', cost: price, lines }
}

export function previewPpa(w: World, siteId: string, mw: number): Preview {
  const price = ppaQuote(w, siteId), total = mw * 8766 * 10 * price
  return {
    tier: 'severe', lines: [
      `Buy ${mw} MW at $${price}/MWh for 10 years`,
      `Total commitment ≈ ${usd(total)}, paid whether you use it or not`,
      `Site: ${findSite(w, siteId).name}`
    ]
  }
}

export function previewLoan(w: World, amount: number): Preview {
  const d = debt(w), lim = creditLimit(w)
  const rate = 0.07 + 0.04 * (d / lim)
  return {
    tier: 'severe', lines: [
      `Borrow ${usd(amount)} at ${(rate * 100).toFixed(1)}% a year`,
      `Interest ≈ ${usd(amount * rate / 365)} a day until repaid`,
      `Debt after: ${usd(d + amount)} of ${usd(lim)} limit`
    ]
  }
}

export function previewTapeout(w: World, spec: ChipSpec): Preview {
  const e = evaluateChip(spec, yearOf(w.tick))
  const upfront = e.nreUsd * 0.3
  return {
    tier: 'severe', cost: upfront, lines: [
      `Tape out ${spec.name}: ${usd(upfront)} now (30% of ${usd(e.nreUsd)} design cost)`,
      `Ready in about ${designMonths(w, e.designMonths).toFixed(0)} months`,
      cashAfter(w, upfront)
    ]
  }
}

export function previewTraining(w: World, costUsd: number): Preview {
  const share = w.cash > 0 ? costUsd / w.cash : Infinity
  return {
    tier: !w.rules?.infiniteCash && share > EXPENSIVE_SHARE ? 'severe' : 'cheap', cost: costUsd, lines: [
      `Estimated compute cost ${usd(costUsd)}${Number.isFinite(share) && !w.rules?.infiniteCash ? ` (${Math.round(share * 100)}% of your cash)` : ''}`,
      'Paused or failed runs keep what they already spent'
    ]
  }
}

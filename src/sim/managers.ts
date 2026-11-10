/**
 * Managers: hire one per system and switch on its autopilot. A manager calls the same actions the player does, makes
 * worse calls when less skilled, keeps a short log, leaves a system alone for 7 days after you touch it, and never
 * takes a severe action on its own — those become inbox requests you approve or reject.
 */
import { GPUS_PER_SERVER, region } from './data/hardware'
import { EQUIP } from './data/equipment'
import { BRANCHES, TECHS, techCost, type Branch } from './data/tech'
import * as A from './actions'
import { acquire } from './corporate'
import { trainFlops } from './ai'
import { rentalUtilisation } from './market'
import { ROLES, firePerson, giveRaise, hirePerson, isManager, payrollPerDay, type ManagerRole, type Person } from './people'
import { previewLoan, previewPpa } from './preview'
import { range } from './rng'
import { canAfford } from './rules'
import { committed, gpu, hasTech, newId } from './util'
import { creditLimit, debt } from './world'
import { SYSTEMS, type InboxItem, type Site, type System, type World } from './types'

type Result = { ok: true; value: undefined } | { ok: false; error: string }
const ok: Result = { ok: true, value: undefined }
const fail = (error: string): Result => ({ ok: false, error })

export const HANDS_OFF_TICKS = 7 * 24
const LOG_CAP = 20
export const ROLE_OF: Record<System, ManagerRole> = {
  facilities: 'mgr-facilities', sales: 'mgr-sales', people: 'mgr-people', finance: 'mgr-finance', research: 'mgr-research'
}
export const DEFAULT_POLICY: Record<System, Record<string, number>> = {
  facilities: { green: 0 }, sales: { margin: 1 }, people: { moraleFloor: 0.6 }, finance: { reserveDays: 30 }, research: {}
}

/** The most skilled manager hired for this system, if any. */
export function managerOf(w: World, sys: System): Person | undefined {
  let best: Person | undefined
  for (const p of w.people) if (p.role === ROLE_OF[sys] && (!best || p.skill > best.skill)) best = p
  return best
}
export function setAutopilot(w: World, sys: System, on: boolean, policy?: Record<string, number>): Result {
  if (on && !managerOf(w, sys)) return fail(`Hire a ${ROLES[ROLE_OF[sys]].name.toLowerCase()} first`)
  const ap = w.autopilot[sys]
  ap.on = on
  ap.policy = { ...DEFAULT_POLICY[sys], ...ap.policy, ...(policy ?? {}) }
  return ok
}
/** Which R&D branch the research director should favour. */
export function setManagerFocus(w: World, b: Branch): Result {
  if (!BRANCHES.includes(b)) return fail('Unknown branch')
  w.managerFocus = b
  return ok
}
/** The player just acted on this system: the manager keeps out of it for a week. */
export function touchSystem(w: World, sys: System): void { w.autopilot[sys].handsOffUntil = w.tick + HANDS_OFF_TICKS }

const active = (w: World, sys: System): Person | undefined => {
  const ap = w.autopilot[sys]
  return ap.on && w.tick >= ap.handsOffUntil ? managerOf(w, sys) : undefined
}
const pol = (w: World, sys: System, k: string): number => w.autopilot[sys].policy[k] ?? DEFAULT_POLICY[sys][k] ?? 0
function log(w: World, sys: System, text: string): void {
  const l = w.managerLog[sys]
  const line = `Day ${Math.floor(w.tick / 24)} · ${text}`
  if (l[0]?.endsWith(text)) return // don't repeat the same note every day
  l.unshift(line)
  if (l.length > LOG_CAP) l.length = LOG_CAP
}
/** Skill-scaled wobble: a 10/10 manager is exact, a 1/10 one is off by up to ±27%. */
const wobble = (w: World, m: Person): number => 1 + (1 - m.skill / 10) * range(w, -0.3, 0.3)
const tryAct = (w: World, sys: System, r: { ok: boolean; error?: string }, okText: string): boolean => {
  if (r.ok) log(w, sys, okText); else log(w, sys, `failed: ${r.error}`)
  return r.ok
}
function ask(w: World, sys: System, title: string, lines: string[], fn: string, args: unknown[]): void {
  if (w.inbox.some((i) => i.action.fn === fn && JSON.stringify(i.action.args[0]) === JSON.stringify(args[0]))) return
  const item: InboxItem = { id: newId(w, 'ib'), system: sys, tick: w.tick, title, lines, action: { fn, args } }
  w.inbox.push(item)
  log(w, sys, `asked you: ${title}`)
}

// ─────────────────────────────────────────────────────────────── facilities
function facilities(w: World, m: Person): void {
  for (const s of w.sites) {
    const hasBattery = s.gens.some((g) => g.kind === 'battery' && w.tick >= g.readyTick)
    const target: NonNullable<Site['strategy']> = pol(w, 'facilities', 'green') >= 1 ? 'green'
      : hasBattery ? 'arbitrage' : region(s.regionId).reliability < 0.999 ? 'resilient' : 'cost'
    if ((s.strategy ?? 'cost') !== target) tryAct(w, 'facilities', A.setPowerStrategy(w, s.id, target), `switched ${s.name} to ${target} power`)
    if (hasBattery && !(s.drPct ?? 0)) tryAct(w, 'facilities', A.setDemandResponse(w, s.id, 0.1 * wobble(w, m)), `signed ${s.name} up for demand response`)
    for (const h of s.halls) {
      if (!h.racks.length && !h.equipment.length && canAfford(w, 5e6)) tryAct(w, 'facilities', A.autoLayout(w, h.id), `laid out ${h.name}`)
      if (h.equipment.some((e) => e.kind === 'pdu' && e.load > EQUIP.pdu.kw)) log(w, 'facilities', `PDU overloaded in ${h.name} — needs another PDU`)
      else if (h.racks.some((r) => r.servers > 0 && !r.cooled)) log(w, 'facilities', `racks in ${h.name} have no cooling`)
    }
  }
}
/** Cheap hourly reflex: on a grid outage, switch the site to resilient dispatch. */
export function facilitiesHourly(w: World): void {
  const ap = w.autopilot?.facilities
  if (!ap?.on || w.tick < ap.handsOffUntil) return
  for (const s of w.sites) if (!s.gridUp && s.strategy !== 'resilient' && managerOf(w, 'facilities')) {
    tryAct(w, 'facilities', A.setPowerStrategy(w, s.id, 'resilient'), `grid down at ${s.name}: switched to resilient`)
  }
}

// ─────────────────────────────────────────────────────────────── sales
const PRICE_GRID = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5, 1.75, 2]
function bestPriceMult(w: World, gpuId: string, margin: number): number {
  const g = gpu(w, gpuId)
  let best = 1, bestRev = -1
  for (const pm of PRICE_GRID) { const rev = pm * rentalUtilisation(w, g, pm); if (rev > bestRev) { bestRev = rev; best = pm } }
  return best * margin
}
/** Free (uncommitted) installed servers per GPU type at each site, computed once per manager turn. */
function freeBySite(w: World): Map<Site, Map<string, number>> {
  const out = new Map<Site, Map<string, number>>()
  for (const s of w.sites) {
    const inst = new Map<string, number>()
    for (const h of s.halls) for (const r of h.racks) if (r.gpuId && r.servers > 0) inst.set(r.gpuId, (inst.get(r.gpuId) ?? 0) + r.servers)
    const free = new Map<string, number>()
    for (const [id, n] of inst) free.set(id, n - committed(w, s.id, id))
    out.set(s, free)
  }
  return out
}
function sales(w: World, m: Person): void {
  const margin = pol(w, 'sales', 'margin')
  let free = freeBySite(w)
  // 1. contracts that fit free capacity and can finish before the deadline
  for (const c of w.contracts) {
    if (c.accepted || c.done || c.expiresTick < w.tick) continue
    let took = false
    for (const [s, f] of free) {
      for (const [id, n] of f) {
        if (n < 1) continue
        const spec = gpu(w, id)
        if (spec.vcpus || spec.memGB < c.minGpuMemGB) continue
        const hours = trainFlops(c.moe ? c.paramsB / 8 : c.paramsB, c.tokensT) / (n * GPUS_PER_SERVER * spec.tflops * 1e12 * 0.35 * 3600)
        if (w.tick + hours * 1.3 * wobble(w, m) >= c.deadlineTick) continue
        if (tryAct(w, 'sales', A.acceptContract(w, c.id, s.id, id, n), `took the ${c.customer} contract`)) { took = true; break }
      }
      if (took) break
    }
    if (took) free = freeBySite(w)
  }
  // 2. reprice existing on-demand rentals
  for (const r of w.rentals) {
    if ((r.kind ?? 'ondemand') !== 'ondemand') continue
    const pm = Math.round(bestPriceMult(w, r.gpuId, margin) * wobble(w, m) * 100) / 100
    if (Math.abs(pm - r.priceMult) > 0.04) tryAct(w, 'sales', A.setRental(w, r.siteId, r.gpuId, r.servers, pm, 'ondemand'), `repriced ${gpu(w, r.gpuId).name} rentals to ${pm.toFixed(2)}× market`)
  }
  // 3. put idle installed servers up for rent
  free = freeBySite(w)
  for (const [s, f] of free) for (const [id, n] of f) {
    if (n < 1) continue
    const ex = w.rentals.find((r) => r.siteId === s.id && r.gpuId === id)
    if (ex && (ex.kind ?? 'ondemand') !== 'ondemand') continue
    const pm = ex?.priceMult ?? Math.round(bestPriceMult(w, id, margin) * 100) / 100
    tryAct(w, 'sales', A.setRental(w, s.id, id, (ex?.servers ?? 0) + n, pm, 'ondemand'), `listed ${n} idle ${gpu(w, id).name} servers for rent`)
  }
}

// ─────────────────────────────────────────────────────────────── people
function people(w: World, m: Person): void {
  const floor = pol(w, 'people', 'moraleFloor')
  const star = w.people.filter((p) => !isManager(p.role) && p.skill >= 6 && p.morale < floor).sort((a, b) => b.skill - a.skill)[0]
  if (star) tryAct(w, 'people', giveRaise(w, star.id), `gave ${star.name} a raise to keep them`)
  const racks = w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + h.racks.length, 0), 0)
  const servers = w.sites.reduce((a, s) => a + s.halls.reduce((b, h) => b + h.racks.reduce((c, r) => c + r.servers, 0), 0), 0)
  const need: [keyof World['staff'], number][] = [['ops', Math.max(2, Math.ceil(racks / 50))], ['engineers', Math.max(3, Math.ceil(servers / 250))]]
  for (const [role, target] of need) {
    const have = w.people.filter((p) => p.role === role).length
    if (have >= Math.round(target * wobble(w, m))) continue
    const c = w.candidates.filter((x) => x.role === role).sort((a, b) => b.skill / b.salary - a.skill / a.salary)[0]
    if (c && tryAct(w, 'people', hirePerson(w, c.id), `hired ${c.name} (${ROLES[role].name})`)) return
  }
}

// ─────────────────────────────────────────────────────────────── finance
function finance(w: World, m: Person): void {
  const l = w.ledger.slice(-14)
  const net = l.length ? l.reduce((a, d) => a + d.revenue - d.powerCost - d.staffCost - d.opex - d.interest, 0) / l.length : 0
  const reserve = pol(w, 'finance', 'reserveDays') * Math.max(-net, payrollPerDay(w)) * wobble(w, m)
  const loan = [...w.loans].sort((a, b) => a.principal - b.principal)[0]
  if (loan && w.cash - loan.principal > reserve) tryAct(w, 'finance', A.repay(w, loan.id), `repaid a loan early`)
  if (!w.rules.infiniteCash && w.cash < reserve * 0.5) {
    const amount = Math.round(Math.min(reserve - w.cash, creditLimit(w) - debt(w)) / 1e6) * 1e6
    if (amount >= 1e6) ask(w, 'finance', `Borrow $${(amount / 1e6).toFixed(0)}M to restore the cash reserve?`, previewLoan(w, amount).lines, 'borrow', [amount])
  }
  if (hasTech(w, 'ppa')) for (const s of w.sites) {
    if (s.ppa && s.ppa.untilTick > w.tick) continue
    if (A.ppaQuote(w, s.id) > region(s.regionId).basePriceMwh * 0.97) continue
    const mw = Math.max(1, Math.min(s.utilityMw, Math.round(s.utilityMw * 0.6)))
    ask(w, 'finance', `Lock in ${mw} MW of power at ${s.name} for 10 years?`, previewPpa(w, s.id, mw).lines, 'signPpa', [s.id, mw])
  }
}

// ─────────────────────────────────────────────────────────────── research
function research(w: World, m: Person): void {
  if (w.research.current) return
  const avail = TECHS.filter((t) => {
    const lv = w.research.levels[t.id] ?? 0
    if ((lv > 0 || w.research.done.includes(t.id)) && !t.repeatable) return false
    if (t.repeatable?.max && lv >= t.repeatable.max) return false
    return !t.requires?.some((r) => !w.research.done.includes(r))
  })
  const focus = w.managerFocus
  const pool = focus && avail.some((t) => t.branch === focus) ? avail.filter((t) => t.branch === focus) : avail
  const pick = pool.map((t) => ({ t, c: techCost(t, w.research.levels[t.id] ?? 0) * wobble(w, m) })).sort((a, b) => a.c - b.c)[0]
  if (pick) tryAct(w, 'research', A.startResearch(w, pick.t.id), `started researching ${pick.t.name}`)
}

const RUN: Record<System, (w: World, m: Person) => void> = { facilities, sales, people, finance, research }

/** Daily: every switched-on manager takes its turn. */
export function runManagers(w: World): void {
  for (const sys of SYSTEMS) { const m = active(w, sys); if (m) RUN[sys](w, m) }
}

// ─────────────────────────────────────────────────────────────── inbox
const APPROVABLE: Record<string, (w: World, ...args: never[]) => { ok: boolean; error?: string }> = {
  signPpa: A.signPpa as never, borrow: A.borrow as never, firePerson: firePerson as never, acquire: acquire as never
}
export function approveInbox(w: World, id: string): Result {
  const item = w.inbox.find((i) => i.id === id); if (!item) return fail('Request is gone')
  const fn = APPROVABLE[item.action.fn]; if (!fn) return fail(`Unknown action “${item.action.fn}”`)
  const r = fn(w, ...(item.action.args as never[]))
  if (!r.ok) return fail(r.error ?? 'Failed')
  w.inbox = w.inbox.filter((i) => i !== item)
  log(w, item.system, `you approved: ${item.title}`)
  return ok
}
export function rejectInbox(w: World, id: string): Result {
  const item = w.inbox.find((i) => i.id === id); if (!item) return fail('Request is gone')
  w.inbox = w.inbox.filter((i) => i !== item)
  log(w, item.system, `you said no: ${item.title}`)
  return ok
}

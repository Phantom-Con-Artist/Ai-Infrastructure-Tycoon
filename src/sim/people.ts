import type { Branch } from './data/tech'
import { CORPS } from './data/lore'
import { pick, range, rnd } from './rng'
import type { World } from './types'
import { newId, pushNews, spend } from './util'

export type Role = 'engineers' | 'researchers' | 'ops' | 'sales' | 'chip'
export const ROLES: Record<Role, { name: string; base: number; blurb: string }> = {
  engineers: { name: 'ML infra engineer', base: 230_000, blurb: 'MFU, uptime, fewer restarts.' },
  researchers: { name: 'Research scientist', base: 320_000, blurb: 'Research speed; staffs your labs.' },
  ops: { name: 'Data-center technician', base: 110_000, blurb: 'Faster repairs.' },
  sales: { name: 'Enterprise sales', base: 160_000, blurb: 'Rental utilisation, deal flow.' },
  chip: { name: 'Silicon architect', base: 290_000, blurb: 'Faster tape-outs.' }
}
export const TRAITS = [
  { id: '10x', name: '10× engineer', mult: 1.6, blurb: 'Claims to be. Is, annoyingly.' },
  { id: 'ex-big', name: 'Ex-Big Tech', mult: 1.2, blurb: 'Knows how it is done at scale. Mentions it often.' },
  { id: 'phd', name: 'Triple PhD', mult: 1.3, blurb: 'Writes papers in their sleep. Literally.' },
  { id: 'burnout', name: 'Burnout risk', mult: 1.1, blurb: 'Brilliant, fragile. Morale drops faster.' },
  { id: 'celebrity', name: 'Twitter-famous', mult: 1.15, blurb: '+reputation while employed. Tweets your roadmap.' },
  { id: 'loyal', name: 'Loyal', mult: 1.0, blurb: 'Will never be poached.' },
  { id: 'none', name: '', mult: 1.0, blurb: '' }
] as const
export interface Person { id: string; name: string; role: Role; skill: number; salary: number; morale: number; trait: string; from: string; hiredTick: number }
export interface ResearchLab { id: string; name: string; focus: Branch }

const FIRST = ['Ada', 'Grace', 'Linus', 'Yann', 'Fei', 'Ilya', 'Andrej', 'Demis', 'Jeff', 'Noam', 'Mira', 'Oriol', 'Chris', 'Daphne', 'Geoff', 'Kai', 'Priya', 'Wen', 'Sven', 'Tariq', 'Zoe', 'Hiro', 'Lena', 'Omar']
const LAST = ['Loveless', 'Hopperton', 'Torvaldson', 'LeCant', 'Fei-Fei', 'Sutskeverish', 'Karpathyish', 'Hassabisque', 'Deanish', 'Shazeerio', 'Muratoff', 'Vinyalsky', 'Olahan', 'Kollerman', 'Hintonbury', 'Matrixov', 'Gradientova', 'Tensorson', 'Backpropoulos', 'Overfitz']

export function makeCandidate(w: World): Person {
  const role = pick(w, Object.keys(ROLES) as Role[])
  const skill = Math.round(Math.min(10, Math.max(1, 3 + rnd(w) * 5 + (rnd(w) < 0.12 ? 3 : 0))))
  const traitR = rnd(w)
  const trait = traitR < 0.06 ? '10x' : traitR < 0.18 ? 'ex-big' : traitR < 0.26 ? 'phd' : traitR < 0.34 ? 'burnout' : traitR < 0.38 ? 'celebrity' : traitR < 0.46 ? 'loyal' : 'none'
  const tr = TRAITS.find((t) => t.id === trait)!
  const salary = Math.round(ROLES[role].base * Math.pow(skill / 5, 1.6) * tr.mult * range(w, 0.9, 1.15) / 1000) * 1000
  return { id: newId(w, 'pp'), name: `${pick(w, FIRST)} ${pick(w, LAST)}`, role, skill, salary, morale: 0.8, trait, from: trait === 'ex-big' ? pick(w, CORPS.filter((c) => c.kind !== 'chip').map((c) => c.name)) : pick(w, ['a startup', 'academia', 'a hedge fund', 'stealth mode', 'a crypto exchange', 'their garage']), hiredTick: 0 }
}
export function foundingTeam(w: World): Person[] {
  const mk = (role: Role, skill: number): Person => ({ ...makeCandidate(w), role, skill, trait: 'loyal', salary: Math.round(ROLES[role].base * Math.pow(skill / 5, 1.6) / 1000) * 1000, from: 'founding team', hiredTick: 0 })
  return [mk('engineers', 6), mk('engineers', 5), mk('engineers', 5), mk('researchers', 6), mk('ops', 5), mk('ops', 4), mk('sales', 5)]
}
/** Effective headcount per role (skill 5 = 1 FTE), plus morale effects; writes into w.staff for the rest of the sim. */
export function recomputeStaff(w: World): void {
  const eff: Record<Role, number> = { engineers: 0, researchers: 0, ops: 0, sales: 0, chip: 0 }
  for (const p of w.people) eff[p.role] += (p.skill / 5) * (0.5 + 0.5 * p.morale) * (p.trait === '10x' ? 1.8 : 1)
  w.staff = { engineers: eff.engineers, researchers: eff.researchers, ops: eff.ops, sales: eff.sales }
  w.chipStaff = eff.chip
}
export const payrollPerDay = (w: World): number => w.people.reduce((a, p) => a + p.salary, 0) / 365
/** Research speed multiplier for a branch from labs that focus on it. */
export function labBoost(w: World, branch: Branch): number {
  const labs = w.labs.filter((l) => l.focus === branch).length
  if (!labs) return 1
  const researchers = w.people.filter((p) => p.role === 'researchers').reduce((a, p) => a + p.skill / 5, 0)
  return 1 + Math.min(1.5, 0.25 * labs + 0.05 * researchers / Math.max(1, w.labs.length))
}

type R<T = undefined> = { ok: true; value: T } | { ok: false; error: string }
export function hirePerson(w: World, id: string): R {
  const c = w.candidates.find((x) => x.id === id); if (!c) return { ok: false, error: 'Candidate gone' }
  const bonus = c.salary * 0.25
  if (w.cash < bonus) return { ok: false, error: 'Signing bonus is 25% of salary' }
  spend(w, bonus, 'opex')
  w.candidates = w.candidates.filter((x) => x !== c)
  w.people.push({ ...c, hiredTick: w.tick, morale: 0.9 })
  recomputeStaff(w)
  if (c.trait === 'celebrity') pushNews(w, 'good', `${c.name} joins ${w.company}`, 'Their announcement thread gets 40k likes. Your recruiting inbox explodes.')
  return { ok: true, value: undefined }
}
export function firePerson(w: World, id: string): R {
  const p = w.people.find((x) => x.id === id); if (!p) return { ok: false, error: 'No such person' }
  w.people = w.people.filter((x) => x !== p)
  spend(w, p.salary * 0.25, 'opex') // severance
  for (const q of w.people) q.morale = Math.max(0, q.morale - 0.03)
  recomputeStaff(w)
  return { ok: true, value: undefined }
}
export function giveRaise(w: World, id: string): R {
  const p = w.people.find((x) => x.id === id); if (!p) return { ok: false, error: 'No such person' }
  p.salary = Math.round(p.salary * 1.15 / 1000) * 1000
  p.morale = Math.min(1, p.morale + 0.25)
  recomputeStaff(w)
  return { ok: true, value: undefined }
}
export function createLab(w: World, name: string, focus: Branch): R {
  const cost = 20e6 * (1 + w.labs.length)
  if (w.cash < cost) return { ok: false, error: `A new lab costs ${(cost / 1e6).toFixed(0)}M` }
  if (!w.people.some((p) => p.role === 'researchers')) return { ok: false, error: 'Hire a researcher first' }
  spend(w, cost)
  w.labs.push({ id: newId(w, 'lab'), name, focus })
  pushNews(w, 'good', `${name} opens`, `A new research lab focused on ${focus}. Free kombucha on tap.`)
  return { ok: true, value: undefined }
}
export function setLabFocus(w: World, id: string, focus: Branch): R {
  const l = w.labs.find((x) => x.id === id); if (!l) return { ok: false, error: 'No such lab' }
  l.focus = focus; return { ok: true, value: undefined }
}

export function dailyPeople(w: World): void {
  const day = Math.floor(w.tick / 24)
  if (day % 7 === 0 || w.candidates.length < 4) {
    w.candidates = w.candidates.filter(() => rnd(w) < 0.4)
    while (w.candidates.length < 8) w.candidates.push(makeCandidate(w))
  }
  const profitable = (w.ledger.at(-1)?.revenue ?? 0) > (w.ledger.at(-1)?.staffCost ?? 0) * 2
  for (const p of [...w.people]) {
    const fair = ROLES[p.role].base * Math.pow(p.skill / 5, 1.6)
    const pay = p.salary / fair
    const target = Math.min(1, 0.45 + 0.35 * Math.min(1.4, pay) + (profitable ? 0.1 : -0.05) + (w.reputation - 50) / 400)
    p.morale += (target - p.morale) * (p.trait === 'burnout' ? 0.06 : 0.03)
    if (p.trait === 'celebrity') w.reputation = Math.min(100, w.reputation + 0.003)
    // quits and poaching
    const quitP = p.morale < 0.35 ? 0.01 : 0
    const poachP = p.trait === 'loyal' ? 0 : p.skill >= 8 ? 0.0015 * (1.2 - p.morale) : 0
    if (rnd(w) < quitP + poachP) {
      w.people = w.people.filter((x) => x !== p)
      const who = pick(w, CORPS.filter((c) => c.kind !== 'chip'))
      pushNews(w, 'bad', `${p.name} leaves`, quitP > poachP ? `Morale was ${(p.morale * 100).toFixed(0)}%. The exit interview was one word long.` : `Poached by ${who.name}. ${who.ceo} reportedly offered "a lot of GPUs".`)
    }
  }
  recomputeStaff(w)
}

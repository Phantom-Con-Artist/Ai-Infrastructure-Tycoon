/**
 * Everything the player is waiting on, as one flat list. Screens draw these with the same progress bar so a delivery,
 * a hall under construction and a training run all read the same way.
 */
import { TECHS, techCost } from './data/tech'
import type { World } from './types'
import { projectRate } from './datafoundry'
import { FEATURES } from './store'
import { gpu } from './util'

export type JobKind = 'delivery' | 'build' | 'power' | 'training' | 'chip' | 'research' | 'data' | 'product'
export interface Job { id: string; kind: JobKind; label: string; where: string; frac: number; hoursLeft: number; endTick?: number }

const span = (w: World, start: number | undefined, end: number, guessDays: number): { frac: number; hoursLeft: number; endTick: number } => {
  const s = start ?? end - guessDays * 24
  return { frac: Math.max(0, Math.min(1, (w.tick - s) / Math.max(1, end - s))), hoursLeft: Math.max(0, end - w.tick), endTick: end }
}

export function jobs(w: World): Job[] {
  const out: Job[] = []
  for (const s of w.sites) {
    for (const o of s.orders) out.push({ id: o.id, kind: 'delivery', label: `${o.servers} × ${gpu(w, o.gpuId).name}`, where: s.name, ...span(w, o.placedTick, o.arriveTick, 30) })
    for (const h of s.halls) if (w.tick < h.readyTick) out.push({ id: h.id, kind: 'build', label: `${h.name} under construction`, where: s.name, ...span(w, h.startTick, h.readyTick, 90) })
    s.pendingUtility.forEach((p, i) => out.push({ id: `${s.id}-u${i}`, kind: 'power', label: `Grid upgrade +${p.mw} MW`, where: s.name, ...span(w, p.startTick, p.readyTick, 180) }))
    for (const g of s.gens) if (w.tick < g.readyTick) out.push({ id: g.id, kind: 'power', label: `${g.mw} MW ${g.kind}`, where: s.name, ...span(w, g.startTick, g.readyTick, 120) })
  }
  for (const r of w.runs) if (r.status === 'running' || r.status === 'paused') {
    out.push({ id: r.id, kind: 'training', label: `Training ${r.name}${r.status === 'paused' ? ' (paused)' : ''}`, where: w.sites.find((s) => s.id === r.siteId)?.name ?? 'Cloud', frac: r.flopsTotal > 0 ? Math.min(1, r.flopsDone / r.flopsTotal) : 0, hoursLeft: r.status === 'running' ? r.etaH : Infinity })
  }
  for (const d of w.silicon.designs) if (d.status === 'designing') out.push({ id: d.id, kind: 'chip', label: `Tape-out ${d.spec.name}`, where: 'Silicon', ...span(w, d.startTick, d.readyTick, 365) })
  const fab = w.silicon.fab
  if (fab && w.tick < fab.readyTick) out.push({ id: 'fab', kind: 'chip', label: 'Fab under construction', where: 'Silicon', ...span(w, fab.readyTick - 540 * 24, fab.readyTick, 540) })
  for (const p of w.data?.projects ?? []) { const rate = projectRate(w, p); out.push({ id: p.id, kind: 'data', label: `Gathering ${p.name}`, where: 'Data Foundry', frac: Math.min(1, p.doneT / p.targetT), hoursLeft: rate > 0 ? ((p.targetT - p.doneT) / rate) * 24 : Infinity }) }
  for (const p of w.products) {
    if (p.building) out.push({ id: p.id + 'b', kind: 'product', label: `Building ${FEATURES.find((f) => f.id === p.building!.id)?.name ?? 'a feature'}`, where: p.name, ...span(w, p.building.startTick, p.building.readyTick, 30) })
    if (p.test) out.push({ id: p.id + 't', kind: 'product', label: 'Price experiment', where: p.name, ...span(w, p.test.startTick, p.test.endTick, 14) })
  }
  const cur = w.research.current ? TECHS.find((t) => t.id === w.research.current) : undefined
  if (cur) {
    const cost = techCost(cur, w.research.levels[cur.id] ?? 0), left = Math.max(0, cost - w.research.progressUsd)
    out.push({ id: 'research', kind: 'research', label: `Researching ${cur.name}`, where: 'R&D', frac: cost > 0 ? Math.min(1, w.research.progressUsd / cost) : 0, hoursLeft: w.research.budgetPerDay > 0 ? (left / w.research.budgetPerDay) * 24 : Infinity })
  }
  return out.sort((a, b) => a.hoursLeft - b.hoursLeft)
}

/** Plain-language read on a training plan: which lever is actually holding quality back. */
export interface Outlook { verdict: string; lever: 'size' | 'data' | 'balanced'; size: { x: number; elo: number }[]; data: { x: number; elo: number }[] }
export const OUTLOOK_STEPS = [0.25, 0.5, 1, 2, 4]
export function trainingOutlook(eloAt: (sizeMult: number, dataMult: number) => number): Outlook {
  const size = OUTLOOK_STEPS.map((x) => ({ x, elo: eloAt(x, 1) })), data = OUTLOOK_STEPS.map((x) => ({ x, elo: eloAt(1, x) }))
  const now = eloAt(1, 1), gs = eloAt(2, 1) - now, gd = eloAt(1, 2) - now
  const lever = gs > gd * 1.6 && gs > 3 ? 'size' : gd > gs * 1.6 && gd > 3 ? 'data' : 'balanced'
  const verdict = lever === 'size' ? `The model is too small to absorb this much data. Doubling its size adds about ${Math.round(gs)} Elo; doubling the data only ${Math.round(Math.max(0, gd))}.`
    : lever === 'data' ? `The model is hungry: it has more capacity than data to fill it. Doubling the data adds about ${Math.round(gd)} Elo; doubling the size only ${Math.round(Math.max(0, gs))}.`
    : gs < 3 && gd < 3 ? 'You are deep into diminishing returns: doubling size or data barely moves quality. Better data quality or research will do more.'
    : `Size and data are well matched. Doubling either adds about ${Math.round(Math.max(gs, gd))} Elo.`
  return { verdict, lever, size, data }
}

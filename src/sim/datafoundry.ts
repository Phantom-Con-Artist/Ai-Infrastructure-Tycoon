/**
 * Data Foundry: make your own datasets instead of only buying them.
 * A project turns a daily budget into tokens; when it finishes you own the dataset, can train on it, license it to
 * rivals for daily income (which makes them a little better) or sell it outright.
 * Sources trade cost, quality and risk — and feed the society loop: synthetic data adds to internet slop, telemetry
 * costs public trust (see society.ts).
 */
import type { DatasetSpec, Domain } from './models'
import { canAfford } from './rules'
import type { World } from './types'
import { newId, pushNews, spend, techSum, yearOf } from './util'

export type Source = 'scrape' | 'license' | 'label' | 'synthetic' | 'telemetry'
export interface SourceSpec { name: string; blurb: string; usdPerT: number; quality: number; risk: number; tech?: string }
export const SOURCES: Record<Source, SourceSpec> = {
  scrape:    { name: 'Scrape the web',      blurb: 'Cheap and enormous. Lawyers and slop included.',         usdPerT: 0.4e6, quality: 0.8,  risk: 0.35 },
  license:   { name: 'License from owners', blurb: 'Publishers, forums, studios. Clean, slow to negotiate.', usdPerT: 40e6,  quality: 1.2,  risk: 0 },
  label:     { name: 'Human experts',       blurb: 'Paid annotators and PhDs. Tiny, superb, immune to slop.', usdPerT: 400e6, quality: 1.5,  risk: 0, tech: 'data-label' },
  synthetic: { name: 'Generate with your model', blurb: 'As good as your best model. Feeds the slop problem.', usdPerT: 6e6, quality: 1.0,  risk: 0, tech: 'synth' },
  telemetry: { name: 'Your users\' conversations', blurb: 'Free-ish and uniquely yours. The public notices.',  usdPerT: 1e6,   quality: 1.1,  risk: 0.1, tech: 'data-telemetry' }
}
export interface DataProject { id: string; name: string; domain: Domain; source: Source; targetT: number; doneT: number; budgetPerDay: number; spent: number; startTick: number }
export interface OwnDataset extends DatasetSpec { made: Source; licensed: boolean; earned: number }
export interface DataState { projects: DataProject[]; own: OwnDataset[] }
export const dataState = (w: World): DataState => (w.data ??= { projects: [], own: [] })
type R<T = undefined> = { ok: true; value: T } | { ok: false; error: string }

const bestElo = (w: World): number => Math.max(0, ...w.models.filter((m) => m.owner === 'player').map((m) => m.elo))
export function sourceQuality(w: World, s: Source): number {
  const base = s === 'synthetic' ? Math.max(0.7, Math.min(1.6, 0.9 + (bestElo(w) - 1300) / 900)) : SOURCES[s].quality
  return +(base * (1 + techSum(w, 'labelQ') * (s === 'label' || s === 'license' ? 1 : 0.4))).toFixed(2)
}
/** Trillions of tokens a day this project gathers at its budget. */
export function projectRate(w: World, p: Pick<DataProject, 'source' | 'budgetPerDay'>): number {
  let rate = (p.budgetPerDay / SOURCES[p.source].usdPerT) * (1 + techSum(w, 'dataSpeed'))
  if (p.source === 'telemetry') {
    const served = w.products.reduce((a, x) => a + (x.history.at(-1)?.served ?? 0), 0) / 1e12
    rate = Math.min(rate, served * (w.society?.laws.includes('data-act') ? 0.5 : 1)) // you can only log what users actually said
  }
  return rate
}
export function startProject(w: World, o: { name: string; domain: Domain; source: Source; targetT: number; budgetPerDay: number }): R {
  const s = SOURCES[o.source]
  if (s.tech && !w.research.done.includes(s.tech)) return { ok: false, error: `${s.name} needs research first (R&D → Data)` }
  if (o.targetT <= 0 || o.budgetPerDay <= 0) return { ok: false, error: 'Set a size and a daily budget' }
  if (o.source === 'telemetry' && !w.products.length) return { ok: false, error: 'Launch a product first: no users, no conversations' }
  if (!canAfford(w, o.budgetPerDay)) return { ok: false, error: 'You cannot cover the first day' }
  if (dataState(w).projects.length >= 6) return { ok: false, error: 'Six projects at once is all your data team can run' }
  dataState(w).projects.push({ id: newId(w, 'dp'), name: o.name || 'Untitled corpus', domain: o.domain, source: o.source, targetT: o.targetT, doneT: 0, budgetPerDay: o.budgetPerDay, spent: 0, startTick: w.tick })
  return { ok: true, value: undefined }
}
export function cancelProject(w: World, id: string): R {
  const d = dataState(w); const p = d.projects.find((x) => x.id === id); if (!p) return { ok: false, error: 'No such project' }
  d.projects = d.projects.filter((x) => x !== p)
  if (p.doneT > 0.001) finish(w, p)
  return { ok: true, value: undefined }
}
function finish(w: World, p: DataProject): void {
  const s = SOURCES[p.source]
  const ds: OwnDataset = { id: 'own-' + p.id, name: p.name, domain: p.domain, tokensT: +p.doneT.toPrecision(3), quality: sourceQuality(w, p.source), usd: p.spent, legalRisk: s.risk, source: `Made in-house · ${s.name.toLowerCase()}`, year: yearOf(w.tick), made: p.source, licensed: false, earned: 0 }
  dataState(w).own.push(ds)
  w.datasets[ds.id] = ds.tokensT
  pushNews(w, 'good', `${ds.name} is ready`, `${ds.tokensT}T tokens of ${ds.domain}, quality ×${ds.quality}. Yours to train on, license or sell.`, 'mine', 1)
}
/** What rivals pay per day to license a dataset. Clean human data is worth more the sloppier the internet gets. */
export function licenceValue(w: World, d: OwnDataset): number {
  const slop = w.society?.slop ?? 0
  return 30_000 * Math.sqrt(d.tokensT) * Math.pow(d.quality, 4) * (d.legalRisk > 0.3 ? 0.3 : 1) * (d.made === 'synthetic' ? 0.5 : 1 + 2 * slop) * (1 + techSum(w, 'dataPrice'))
}
export function setLicensed(w: World, id: string, on: boolean): R {
  const d = dataState(w).own.find((x) => x.id === id); if (!d) return { ok: false, error: 'Not one of yours' }
  d.licensed = on; return { ok: true, value: undefined }
}
export function sellDataset(w: World, id: string): R<number> {
  const st = dataState(w); const d = st.own.find((x) => x.id === id); if (!d) return { ok: false, error: 'Not one of yours' }
  const price = Math.round(licenceValue(w, d) * 400)
  st.own = st.own.filter((x) => x !== d); delete w.datasets[id]
  w.cash += price; w.today.revenue += price
  pushNews(w, 'info', `Sold ${d.name}`, `An exclusive sale for $${(price / 1e6).toFixed(1)}M. You can no longer train on it; somebody else now can.`, 'mine', 1)
  return { ok: true, value: price }
}
export function dailyData(w: World): void {
  const st = w.data; if (!st) return
  for (const p of [...st.projects]) {
    if (!w.rules.infiniteCash && w.cash <= 0) continue
    const left = p.targetT - p.doneT
    const got = Math.min(left, projectRate(w, p))
    const cost = p.budgetPerDay * (got / Math.max(1e-12, projectRate(w, { ...p })) || 0)
    spend(w, cost, 'opex'); p.spent += cost; p.doneT += got
    if (p.doneT >= p.targetT - 1e-9) { st.projects = st.projects.filter((x) => x !== p); finish(w, p) }
  }
  for (const d of st.own) if (d.licensed) { const v = licenceValue(w, d); w.cash += v; w.today.revenue += v; d.earned += v }
}

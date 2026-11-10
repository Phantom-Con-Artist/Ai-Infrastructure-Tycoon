import type { World } from './types'
import { canAfford } from './rules'
import { pushNews, spend } from './util'

export type SiteTemplate = 'minimal' | 'bold' | 'corporate' | 'brutalist'
export interface WebPresence {
  domains: string[]; primary?: string
  site?: { template: SiteTemplate; headline: string; tagline: string; sections: string[]; publishedTick: number }
}
export const TEMPLATES_WEB: Record<SiteTemplate, { name: string; quality: number; cost: number; blurb: string }> = {
  minimal: { name: 'Minimal', quality: 0.5, cost: 50_000, blurb: 'White space and confidence.' },
  bold: { name: 'Bold', quality: 0.7, cost: 250_000, blurb: 'Giant type, gradient, one CTA.' },
  corporate: { name: 'Corporate', quality: 0.6, cost: 400_000, blurb: 'Stock photos of handshakes. Trusted by enterprises.' },
  brutalist: { name: 'Brutalist', quality: 0.8, cost: 900_000, blurb: 'Award-winning. Nobody can find the pricing page.' }
}
export const SECTIONS = ['Products', 'Pricing', 'Benchmarks', 'Careers', 'Safety', 'Blog', 'Status page', 'Investor relations']
const TLD: Record<string, number> = { com: 1, ai: 1.6, io: 0.5, net: 0.3, dev: 0.4, gpu: 2.2, agi: 6, xyz: 0.05 }
export const TLDS = Object.keys(TLD)

/** Domain pricing: short and premium TLDs explode in price; famous names are absurd. */
export function domainPrice(name: string): number {
  const [label, tld] = name.toLowerCase().split('.')
  if (!label || !tld || !(tld in TLD) || !/^[a-z0-9-]+$/.test(label)) return NaN
  const len = label.length
  const base = len <= 2 ? 15_000_000 : len <= 3 ? 2_500_000 : len <= 5 ? 120_000 : len <= 8 ? 6_000 : 15
  const famous = ['ai', 'agi', 'gpu', 'chat', 'cloud', 'brain', 'compute', 'tensor', 'model'].includes(label) ? 40 : 1
  return Math.round(base * TLD[tld] * famous)
}
export function buyDomain(w: World, name: string): { ok: true; value: number } | { ok: false; error: string } {
  const n = name.toLowerCase().trim()
  const price = domainPrice(n)
  if (!Number.isFinite(price)) return { ok: false, error: `Unsupported domain. Try .${TLDS.join(', .')}` }
  if (w.web.domains.includes(n)) return { ok: false, error: 'You already own it' }
  if (!canAfford(w, price)) return { ok: false, error: 'Not enough cash' }
  spend(w, price, 'opex')
  w.web.domains.push(n)
  if (!w.web.primary) w.web.primary = n
  pushNews(w, 'info', `Domain acquired: ${n}`, price > 1e6 ? `$${(price / 1e6).toFixed(1)}M for a URL. The CFO has stopped speaking to you.` : 'Squatters weep.')
  return { ok: true, value: price }
}
export function publishSite(w: World, s: { template: SiteTemplate; headline: string; tagline: string; sections: string[] }): { ok: true; value: number } | { ok: false; error: string } {
  if (!w.web.primary) return { ok: false, error: 'Buy a domain first' }
  const cost = TEMPLATES_WEB[s.template].cost
  if (!canAfford(w, cost)) return { ok: false, error: 'Not enough cash for the agency' }
  spend(w, cost, 'opex')
  w.web.site = { ...s, publishedTick: w.tick }
  pushNews(w, 'good', `${w.web.primary} is live`, `${TEMPLATES_WEB[s.template].name} redesign shipped. Designers on Chirper are already arguing about the kerning.`)
  return { ok: true, value: cost }
}
/** 0..1 quality of your web presence; feeds demand and reputation. */
export function webQuality(w: World): number {
  const site = w.web?.site
  if (!site) return 0
  const brandMatch = w.web.domains.some((d) => d.split('.')[0].replace(/-/g, '') === w.company.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, d.split('.')[0].length)) ? 0.15 : 0
  const premium = w.web.domains.some((d) => d.endsWith('.ai') || d.endsWith('.com')) ? 0.1 : 0
  return Math.min(1, TEMPLATES_WEB[site.template].quality * 0.6 + site.sections.length * 0.04 + brandMatch + premium)
}
/** A weekly newsletter summarising the last seven days. */
export function weeklyDigest(w: World): { title: string; lines: string[] } {
  const week = w.ledger.slice(-7)
  const rev = week.reduce((a, d) => a + d.revenue, 0)
  const cost = week.reduce((a, d) => a + d.powerCost + d.staffCost + d.opex + d.interest, 0)
  const recent = w.news.filter((n) => n.tick > w.tick - 24 * 7 && n.kind !== 'info').slice(0, 4).map((n) => n.title)
  const top = [...w.competitors].sort((a, b) => b.elo - a.elo)[0]
  return {
    title: `The Weekly Tensor · week ${Math.floor(w.tick / (24 * 7))}`,
    lines: [
      `${w.company} made $${(rev / 1e6).toFixed(2)}M and spent $${(cost / 1e6).toFixed(2)}M.`,
      top ? `${top.name} still leads the leaderboard at ${Math.round(top.elo)} Elo.` : 'No clear leader on the leaderboard.',
      `AI hype index ${w.market.boom.toFixed(2)}, GPU supply tightness ${w.market.supplyTight.toFixed(2)}.`,
      ...recent
    ]
  }
}

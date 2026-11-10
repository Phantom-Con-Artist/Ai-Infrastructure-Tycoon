/**
 * A scripted career from a fresh start with no free money: a sensible but unspectacular player.
 * It is the balance check: this player must stay solvent, grow, and not run away with the game.
 */
import { describe, expect, it } from 'vitest'
import * as A from './actions'
import * as DF from './datafoundry'
import * as OG from './orgs'
import * as S from './store'
import type { Hall, Site } from './types'
import { committed, hallServers } from './util'
import { availableGpus, createWorld, step, valuation } from './world'

describe('playthrough: five years of a sensible career', () => {
  it('stays solvent, grows, and the world pushes back', () => {
    const w = createWorld(11)
    const cash0 = w.cash
    const site = (A.buildSite(w, 'or') as { ok: true; value: Site }).value
    const hall = (A.buildHall(w, site.id, { size: 'M', cooling: 'air', fabric: 'eth100' }) as { ok: true; value: Hall }).value
    A.autoLayout(w, hall.id, 24) // a first row, not the whole floor
    const gpu = availableGpus(w).filter((x) => !x.vcpus).sort((a, b) => b.tflops - a.tflops)[0]
    const free = (): number => hallServers(hall, gpu.id) - committed(w, site.id, gpu.id)
    const log: string[] = []
    let ordered = false, trained = 0, product: S.Product | undefined
    A.buyDataset(w, 'crawl')
    for (let d = 0; d < 365 * 5 && !w.gameOver; d++) {
      for (let h = 0; h < 24; h++) step(w)
      const day = w.ledger.at(-1)
      // 1. first servers, sized to what cash allows
      if (!ordered) { ordered = A.orderServers(w, site.id, gpu.id, 40).ok } // order on day one: delivery takes as long as the build
      const stock = site.stock[gpu.id] ?? 0
      if (stock > 0) A.installServers(w, site.id, hall.id, gpu.id, stock)
      // 2. rent out whatever is idle
      const mine = w.models.filter((m) => m.owner === 'player')
      if (d % 7 === 0 && free() > 0 && !w.runs.some((r) => r.status === 'running')) {
        const cur = w.rentals.find((r) => r.siteId === site.id && r.gpuId === gpu.id)?.servers ?? 0
        A.setRental(w, site.id, gpu.id, cur + Math.floor(free() * 0.8), 1, 'ondemand')
      }
      // 3. once a year, train a model as big as the fleet can do in ~2 months
      if (d > 120 && d % 365 === 150 && hallServers(hall, gpu.id) >= 20) {
        A.setRental(w, site.id, gpu.id, 0, 1, 'ondemand')
        const n = Math.floor(hallServers(hall, gpu.id) * 0.7)
        const r = A.startTraining(w, { name: `Bot-${++trained}`, paramsB: 3 * trained, tokensT: 1 + trained, siteId: site.id, gpuId: gpu.id, servers: n })
        if (!r.ok) log.push(`train failed: ${r.error}`)
      }
      for (const m of mine) if (!m.releasedByPlayer) {
        A.launchModel(w, m.id)
        A.deployModel(w, m.id, site.id, gpu.id, Math.max(4, Math.floor(free() * 0.5)))
        if (!product) { const p = S.createProduct(w, { name: 'BotChat', category: 'chat', modelId: m.id }); if (p.ok) product = p.value }
      }
      // 4. reinvest: more servers when cash is comfortable, research always
      if (d % 30 === 0 && w.cash > cash0 * 0.5 && ordered) { A.autoLayout(w, hall.id, hall.racks.length + 4); A.orderServers(w, site.id, gpu.id, 20) }
      if (!w.research.current && (day?.revenue ?? 0) > 0) for (const id of ['k8s', 'hotaisle', 'smart-grid', 'safe-evals', 'safe-policy', 'prod-onboarding', 'data-pipeline', 'marketplace', 'ppa', 'safe-interp']) if (!w.research.done.includes(id) && A.startResearch(w, id).ok) break
      if (product && !product.building && w.cash > 5e6) for (const f of S.featuresFor(product)) if (!product.features?.includes(f.id) && w.cash > f.costUsd * 4) { S.buildFeature(w, product.id, f.id); break }
      for (const o of w.orgDeals ?? []) if (o.status === 'offer') { const m = OG.eligibleModels(w, o)[0]; if (m && OG.spareCapacity(w, m.id) >= OG.dealDemand(o)) OG.acceptDeal(w, o.id, m.id) }
      if (d === 500 && w.cash > 3e6) DF.startProject(w, { name: 'Bot corpus', domain: 'code', source: 'scrape', targetT: 2, budgetPerDay: 20_000 })
      if (d % 365 === 364) log.push(`y${(d + 1) / 365}: cash ${(w.cash / 1e6).toFixed(1)}M · val ${(valuation(w) / 1e6).toFixed(0)}M · rev/day ${((day?.revenue ?? 0) / 1e3).toFixed(0)}k · servers ${hallServers(hall, gpu.id)} · models ${mine.length} best ${Math.round(Math.max(0, ...mine.map((m) => m.elo)))} vs rival ${Math.round(Math.max(...w.competitors.map((c) => c.elo)))} · users ${Math.round(product?.freeUsers ?? 0)} · deals ${(w.orgDeals ?? []).filter((o) => o.status === 'active').length} · trust ${w.society?.trust.toFixed(0)} reg ${w.society?.regulation.toFixed(0)} slop ${((w.society?.slop ?? 0) * 100).toFixed(0)}% · rep ${w.reputation.toFixed(0)}`)
    }
    console.info('playthrough\n' + log.join('\n'))
    expect(w.gameOver).toBe(false)
    expect(valuation(w)).toBeGreaterThan(cash0)
    expect(valuation(w)).toBeLessThan(cash0 * 5000) // growth, not a runaway
    expect(w.models.filter((m) => m.owner === 'player').length).toBeGreaterThan(0)
  }, 180_000)
})

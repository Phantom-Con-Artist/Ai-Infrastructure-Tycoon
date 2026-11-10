/** A long unattended run through every newer system at once: nothing may go NaN, negative or out of range. */
import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { CLOUD } from './cloud'
import * as DF from './datafoundry'
import { TECHS } from './data/tech'
import * as OG from './orgs'
import { jobs } from './progress'
import * as S from './store'
import { createWorld, step } from './world'

describe('soak: four years with products, organisations, data projects and society', () => {
  it('stays finite and the systems actually interact', () => {
    const w = createWorld(21); w.cash = 2e10
    w.models.push({ id: 'mm', name: 'Brainy', owner: 'player', paramsB: 70, activeParamsB: 70, tokensT: 15, loss: 1.9, elo: 1650, releaseTick: 0, priceMtok: 2, posttrain: 2, tokensServed: 0, revenue: 0, share: 0, demandTokPerDay: 0, capacityTokPerDay: 0, releasedByPlayer: true })
    const p = (S.createProduct(w, { name: 'BrainyChat', category: 'chat', modelId: 'mm' }) as { ok: true; value: S.Product }).value
    expect(A.deployModel(w, 'mm', CLOUD, 'nv-h1000', 250).ok).toBe(true)
    expect(S.buildFeature(w, p.id, 'memory').ok).toBe(true)
    expect(S.buildFeature(w, p.id, 'voice').ok).toBe(false) // one at a time
    expect(S.setSupport(w, p.id, 1).ok).toBe(true)
    expect(S.startPriceTest(w, p.id, p.plans.find((x) => x.price > 0)!.id).ok).toBe(true)
    expect(jobs(w).filter((j) => j.kind === 'product')).toHaveLength(2)
    expect(DF.startProject(w, { name: 'Crawl', domain: 'web', source: 'scrape', targetT: 20, budgetPerDay: 100_000 }).ok).toBe(true)
    w.datasets.books3 = 0.3 // risky data, to push trust and regulation
    let signed = 0
    for (let d = 0; d < 365 * 4; d++) {
      for (let h = 0; h < 24; h++) step(w)
      if (w.cash < 1e9) w.cash = 2e10 // this is a systems test, not a balance test
      for (const o of w.orgDeals ?? []) if (o.status === 'offer') { const m = OG.eligibleModels(w, o)[0]; if (m && OG.spareCapacity(w, m.id) >= OG.dealDemand(o) && OG.acceptDeal(w, o.id, m.id).ok) signed++ }
      if (d === 400) expect(S.buildFeature(w, p.id, 'voice').ok).toBe(true)
    }
    const s = w.society!
    for (const v of [w.cash, w.reputation, s.trust, s.regulation, s.slop, s.safetyDebt, p.freeUsers, p.frustration, ...w.competitors.map((c) => c.elo), ...(w.orgDeals ?? []).map((o) => o.satisfaction)]) expect(Number.isFinite(v)).toBe(true)
    expect(s.trust).toBeGreaterThanOrEqual(0); expect(s.trust).toBeLessThanOrEqual(100)
    expect(s.slop).toBeGreaterThan(0.03) // the internet got sloppier
    expect(p.features).toEqual(['memory', 'voice'])
    expect(p.insight?.text.length).toBeGreaterThan(10)
    expect(w.data!.own).toHaveLength(1)
    expect(signed).toBeGreaterThan(0)
    expect(p.freeUsers).toBeGreaterThan(0)
    console.info('soak', JSON.stringify({ trust: +s.trust.toFixed(1), regulation: +s.regulation.toFixed(1), slop: +s.slop.toFixed(3), debt: +s.safetyDebt.toFixed(2), laws: s.laws, signed, activeDeals: (w.orgDeals ?? []).filter((o) => o.status === 'active').length, users: Math.round(p.freeUsers), insight: p.insight?.text, rep: +w.reputation.toFixed(1), rivalBest: Math.round(Math.max(...w.competitors.map((c) => c.elo))) }))
  }, 120_000)
  it('the research tree is large, ids are unique and every prerequisite exists', () => {
    expect(TECHS.length).toBeGreaterThan(150)
    const ids = new Set(TECHS.map((t) => t.id))
    expect(ids.size).toBe(TECHS.length)
    for (const t of TECHS) for (const r of t.requires ?? []) expect(ids.has(r), `${t.id} requires ${r}`).toBe(true)
  })
})

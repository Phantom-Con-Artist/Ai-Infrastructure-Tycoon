import { describe, expect, it } from 'vitest'
import { TEMPLATES, archStats } from './models'
describe('architecture maths matches published sizes', () => {
  const p = (id: string) => archStats(TEMPLATES.find((t) => t.id === id)!.arch)
  it('Llamma-3 8B ≈ 8B', () => { expect(p('llamma8').totalB).toBeGreaterThan(7.5); expect(p('llamma8').totalB).toBeLessThan(8.6) })
  it('Llamma-3 70B ≈ 70B', () => { expect(p('llamma70').totalB).toBeGreaterThan(66); expect(p('llamma70').totalB).toBeLessThan(74) })
  it('Llamma-3 405B ≈ 405B', () => { expect(p('llamma405').totalB).toBeGreaterThan(380); expect(p('llamma405').totalB).toBeLessThan(430) })
  it('Mixtrial ≈ 47B total / 13B active', () => { const s = p('mixtrial'); expect(s.totalB).toBeGreaterThan(44); expect(s.totalB).toBeLessThan(50); expect(s.activeB).toBeGreaterThan(12); expect(s.activeB).toBeLessThan(15) })
  it('DeepSink V3 ≈ 671B total / 37B active', () => { const s = p('deepsink3'); console.log(s.totalB, s.activeB); expect(s.totalB).toBeGreaterThan(600); expect(s.totalB).toBeLessThan(720); expect(s.activeB).toBeGreaterThan(28); expect(s.activeB).toBeLessThan(45) })
  it('GPTea-2 small ≈ 124M', () => { expect(p('gptea2').totalB).toBeGreaterThan(0.1); expect(p('gptea2').totalB).toBeLessThan(0.17) })
})

import { createWorld, step } from './world'
import * as Act from './actions'
describe('architecture training', () => {
  it('trains a MoE from a template on a dataset mix and scores evals', () => {
    const w = createWorld(8); w.cash = 1e9
    w.research.done.push('moe'); w.research.levels.moe = 1
    const site = (Act.buildSite(w, 'or') as any).value
    w.research.done.push('rdhx', 'dlc')
    const hall = (Act.buildHall(w, site.id, { size: 'M', cooling: 'dlc', fabric: 'eth100' }) as any).value
    Act.autoLayout(w, hall.id)
    Act.orderServers(w, site.id, 'nv-h1000', 64)
    while (w.tick < hall.readyTick + 24 || (site.stock['nv-h1000'] ?? 0) < 64) step(w)
    Act.installServers(w, site.id, hall.id, 'nv-h1000', 64)
    expect(Act.buyDataset(w, 'crawl').ok).toBe(true)
    expect(Act.buyDataset(w, 'githug').ok).toBe(true)
    const arch = { ...TEMPLATES.find((t) => t.id === 'mixtrial')!.arch, layers: 8 }
    const r = Act.startArchTraining(w, { name: 'Mini-MoE', arch, mix: { crawl: 0.05, githug: 0.02 }, siteId: site.id, gpuId: 'nv-h1000', servers: 64 })
    expect(r.ok).toBe(true)
    for (let i = 0; i < 24 * 90 && !w.models.length; i++) step(w)
    const m = w.models[0]
    expect(m).toBeTruthy(); expect(m.arch?.experts).toBe(8)
    expect(m.evals?.humaneval).toBeGreaterThan(0)
  })
})

import { CLOUD, cloudCapacity } from './cloud'
describe('renting cloud compute', () => {
  it('trains a model on rented GPUs with no own sites, and pays for it', () => {
    const w = createWorld(12)
    Act.buyDataset(w, 'crawl')
    const cap = cloudCapacity(w, 'nv-h1000')
    expect(cap).toBeGreaterThan(32)
    const cash0 = w.cash
    const r = Act.startArchTraining(w, { name: 'Rented-1', arch: TEMPLATES.find((t) => t.id === 'gptea2')!.arch, mix: { crawl: 0.05 }, siteId: CLOUD, gpuId: 'nv-h1000', servers: 32 })
    expect(r.ok).toBe(true)
    for (let i = 0; i < 24 * 30 && !w.models.length; i++) step(w)
    expect(w.models.length).toBe(1)
    expect(w.runs[0].spentUsd).toBeGreaterThan(0)
    expect(w.cash).toBeLessThan(cash0)
  })
})

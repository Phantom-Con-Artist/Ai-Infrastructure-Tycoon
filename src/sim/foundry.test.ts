import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { MODALITIES, baseOptions, foundryElo, modalityOk } from './foundry'
import { boot, firstGpu, ready } from './testkit'
import { finishRun } from './world'
const devUnlockTech = (w: { research: { done: string[] } }, id: string): void => { w.research.done.push(id) }

const spec = (w: ReturnType<typeof boot>['w'], site: string, gpuId: string, p: Partial<A.TrainSpec> = {}): A.TrainSpec =>
  ({ name: 'M', paramsB: 1, tokensT: 0.02, siteId: site, gpuId, servers: 4, ...p })

describe('model foundry', () => {
  it('lists five-plus modalities, text always available, others gated by research', () => {
    expect(Object.keys(MODALITIES)).toEqual(expect.arrayContaining(['text', 'code', 'image', 'speech', 'video', 'omni']))
    const { w } = boot(3)
    expect(modalityOk(w, 'text')).toBe(true)
    expect(modalityOk(w, 'image')).toBe(false)
    devUnlockTech(w, 'mod-image')
    expect(modalityOk(w, 'image')).toBe(true)
  })
  it('offers open-weights templates as bases from day one', () => {
    const { w } = boot(3)
    const b = baseOptions(w)
    expect(b.some((x) => x.kind === 'open' && x.name.includes('Llamma'))).toBe(true)
    expect(b.every((x) => x.elo > 1000 && x.paramsB > 0)).toBe(true)
  })
  it('fine-tuning starts from the base Elo, gains a little, and is capped', () => {
    const base = { elo: 1300, paramsB: 8, tokensT: 15, modality: 'text' as const }
    const small = foundryElo('finetune', 900, base, 0.01, 1, 'text')
    const big = foundryElo('finetune', 900, base, 0.2, 1, 'text')
    expect(small).toBeGreaterThan(1300)
    expect(big).toBeGreaterThan(small)
    expect(big).toBeLessThanOrEqual(1300 + 120)
  })
  it('switching modality during a fine-tune costs Elo', () => {
    const base = { elo: 1300, paramsB: 8, tokensT: 15, modality: 'text' as const }
    expect(foundryElo('finetune', 900, base, 0.1, 1, 'code')).toBeLessThan(foundryElo('finetune', 900, base, 0.1, 1, 'text'))
  })
  it('distillation pulls a small student toward a stronger teacher but never past it', () => {
    const teacher = { elo: 1500, paramsB: 70, tokensT: 15, modality: 'text' as const }
    const st = foundryElo('distill', 1200, teacher, 1, 1, 'text')
    expect(st).toBeGreaterThan(1200)
    expect(st).toBeLessThan(1500)
  })
  it('a fine-tune run uses the base parameter count, needs research and produces a tagged model', () => {
    const { w, site, hall } = boot(9)
    const g = firstGpu(w)
    ready(w, site, hall, g, 8)
    const llama = baseOptions(w).find((b) => b.kind === 'open' && b.paramsB < 10)!
    const blocked = A.startTraining(w, spec(w, site.id, g, { method: 'finetune', baseId: llama.id, tokensT: 0.005 }))
    expect(blocked.ok).toBe(false)
    devUnlockTech(w, 'finetune')
    const r = A.startTraining(w, spec(w, site.id, g, { method: 'finetune', baseId: llama.id, tokensT: 0.005, name: 'Tuned' }))
    if (!r.ok) throw new Error(r.error)
    const run = w.runs.find((x) => x.id === r.value)!
    expect(run.paramsB).toBeCloseTo(llama.paramsB, 1)
    finishRun(w, run.id)
    const m = w.models.find((x) => x.name === 'Tuned')!
    expect(m.method).toBe('finetune')
    expect(m.modality).toBe('text')
    expect(m.elo).toBeGreaterThan(llama.elo)
  })
  it('refuses fine-tunes with too many tokens and modalities you have not researched', () => {
    const { w, site } = boot(9)
    devUnlockTech(w, 'finetune')
    const base = baseOptions(w)[0]
    expect(A.validateTraining(w, spec(w, site.id, firstGpu(w), { method: 'finetune', baseId: base.id, tokensT: 5 }))).toMatch(/fine-tune/i)
    expect(A.validateTraining(w, spec(w, site.id, firstGpu(w), { modality: 'video' }))).toMatch(/research/i)
  })
})

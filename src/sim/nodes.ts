/**
 * Node designer: your own 8-GPU server SKU built around a GPU on sale. A design is a derived GpuSpec stored in
 * w.customGpus, so ordering, racking, renting and training treat it like any other server.
 */
import { gpuCatalog, type GpuSpec } from './data/hardware'
import { canAfford } from './rules'
import type { World } from './types'
import { newId, pushNews, spend, yearOf } from './util'

export interface NodeOpts { cooling: 'air' | 'liquid'; power: 'eco' | 'balanced' | 'max'; ramTB: 1 | 2 | 4; parts: 'standard' | 'premium' }
export interface NodeInfo extends NodeOpts { base: string }
export const DESIGN_FEE = 250_000

const POWER = { eco: { tdp: 0.75, perf: 0.85 }, balanced: { tdp: 1, perf: 1 }, max: { tdp: 1.1, perf: 1.05 } }

/** Per-GPU effective spec of a node built from `base` with `o`. Balanced/air/2TB/standard is the reference box. */
export function nodeSpec(base: GpuSpec, o: NodeOpts, id = 'node-preview', name = base.name): GpuSpec & { node: NodeInfo } {
  const p = POWER[o.power], liquid = o.cooling === 'liquid'
  const perGpuExtra = (liquid ? 2500 : 0) + (o.ramTB - 2) * 1200 // cold plates; host RAM is shared by 8 GPUs
  return {
    ...base, id, name, vendor: base.vendor,
    tflops: Math.round(base.tflops * p.perf * (liquid ? 1.06 : 1)),
    tdpW: Math.round(base.tdpW * p.tdp * (liquid ? 0.88 : 1)),
    priceUsd: Math.round((base.priceUsd + perGpuExtra) * (o.parts === 'premium' ? 1.06 : 1)),
    mtbfH: Math.round(base.mtbfH * (o.parts === 'premium' ? 1.3 : 1) * (o.power === 'max' ? 0.85 : o.power === 'eco' ? 1.1 : 1)),
    node: { ...o, base: base.id }
  }
}

type R<T> = { ok: true; value: T } | { ok: false; error: string }
export function designNode(w: World, name: string, baseId: string, o: NodeOpts): R<GpuSpec> {
  const nm = name.trim(); if (!nm) return { ok: false, error: 'Give the design a name' }
  const base = gpuCatalog(yearOf(w.tick)).find((g) => g.id === baseId && !g.vcpus)
  if (!base) return { ok: false, error: 'Pick an accelerator that is on sale' }
  if (!canAfford(w, DESIGN_FEE)) return { ok: false, error: `Engineering costs $${DESIGN_FEE / 1e3}k` }
  spend(w, DESIGN_FEE)
  const g = nodeSpec(base, o, newId(w, 'node'), nm)
  w.customGpus.push(g)
  pushNews(w, 'good', `${nm} node designed`, `${o.cooling === 'liquid' ? 'Liquid-cooled' : 'Air-cooled'}, ${o.power} power, ${o.ramTB} TB host RAM, ${o.parts} parts around ${base.name}. ODMs are quoting.`, 'mine', 0)
  return { ok: true, value: g }
}

/** Node designs whose base GPU is still on sale. */
export const orderableNodes = (w: World): GpuSpec[] => {
  const onSale = new Set(gpuCatalog(yearOf(w.tick)).map((g) => g.id))
  return w.customGpus.filter((g) => g.node && onSale.has(g.node.base))
}

/**
 * Model Foundry: what kind of model (modality) and how you make it (method).
 *  - scratch:   pre-train from random init (the classic run)
 *  - finetune:  start from a base (yours or open weights), a few billion tokens, small capped gain
 *  - distill:   a smaller student learns from a stronger teacher; closes most of the gap, never passes it
 *  - continue:  continued pre-training on top of a base; tokens add up
 * Each modality is its own business line with its own price and demand multipliers.
 */
import { modelLoss } from './ai'
import { eloFromLoss } from './ai'
import { TEMPLATES } from './models'
import { archStats } from './models'
import type { World } from './types'
import { hasTech } from './util'

export type Modality = 'text' | 'code' | 'image' | 'speech' | 'video' | 'omni'
export type Method = 'scratch' | 'finetune' | 'distill' | 'continue'
export interface ModalitySpec { name: string; tech?: string; price: number; demand: number; unit: string; blurb: string }
export const MODALITIES: Record<Modality, ModalitySpec> = {
  text:   { name: 'Text & chat',     price: 1,   demand: 1,    unit: 'tokens',   blurb: 'The big market. Everybody is here.' },
  code:   { name: 'Coding',          tech: 'mod-code',   price: 1.6, demand: 0.45, unit: 'tokens',   blurb: 'Smaller crowd, pays more, judges harshly.' },
  image:  { name: 'Image generation',tech: 'mod-image',  price: 2.2, demand: 0.3,  unit: 'images',   blurb: 'Pictures of hands. Increasingly correct hands.' },
  speech: { name: 'Speech & voice',  tech: 'mod-speech', price: 1.4, demand: 0.35, unit: 'minutes',  blurb: 'Call centres, audiobooks, your nan.' },
  video:  { name: 'Video',           tech: 'mod-video',  price: 4,   demand: 0.2,  unit: 'seconds',  blurb: 'Every frame costs a fortune. Every demo goes viral.' },
  omni:   { name: 'Omni (everything)', tech: 'mod-omni', price: 1.8, demand: 0.9,  unit: 'tokens',   blurb: 'One model to see, hear, speak and code.' }
}
export const METHOD_TECH: Partial<Record<Method, string>> = { finetune: 'finetune', distill: 'distill' }
export const FINETUNE_MAX_T = 0.2

export const modalityOk = (w: World, m: Modality): boolean => !MODALITIES[m].tech || hasTech(w, MODALITIES[m].tech!)
export const methodOk = (w: World, m: Method): boolean => !METHOD_TECH[m] || hasTech(w, METHOD_TECH[m]!)

export interface BaseOption { id: string; kind: 'own' | 'open'; name: string; paramsB: number; activeParamsB: number; tokensT: number; moe: boolean; elo: number; modality: Modality }
const OPEN_CORPS = new Set(['meeta', 'mistrial', 'deepsink'])
/** Models you may start from: your own finished models, plus open-weights templates (pre-trained by others). */
export function baseOptions(w: World): BaseOption[] {
  const own: BaseOption[] = w.models.filter((m) => m.owner === 'player' && !m.subsidiary && m.paramsB > 0).map((m) => ({
    id: m.id, kind: 'own', name: m.name, paramsB: m.paramsB, activeParamsB: m.activeParamsB, tokensT: m.tokensT, moe: m.activeParamsB < m.paramsB, elo: m.elo, modality: m.modality ?? 'text'
  }))
  const open: BaseOption[] = TEMPLATES.filter((t) => OPEN_CORPS.has(t.corp) && !t.absurd).map((t) => {
    const s = archStats(t.arch), moe = t.arch.experts > 1
    return { id: 'tpl:' + t.id, kind: 'open', name: `${t.name} (open weights)`, paramsB: s.totalB, activeParamsB: s.activeB, tokensT: t.tokensT, moe, elo: Math.round(eloFromLoss(modelLoss(s.totalB, s.activeB, t.tokensT, moe, 1))), modality: 'text' }
  })
  return [...own, ...open]
}
export const findBase = (w: World, id?: string): BaseOption | undefined => id ? baseOptions(w).find((b) => b.id === id) : undefined

/** Final Elo for a run made with `method`. `scratchElo` is what the same run would score from random init. */
export function foundryElo(method: Method, scratchElo: number, base: Pick<BaseOption, 'elo' | 'modality'> & { paramsB: number; tokensT: number } | undefined, tokensT: number, dataQuality: number, modality: Modality): number {
  if (method === 'scratch' || !base) return scratchElo
  const crossModal = base.modality !== modality ? 60 : 0
  if (method === 'finetune') return base.elo + Math.min(120, 32 * Math.log10(1 + tokensT * 1000) * dataQuality) - crossModal
  if (method === 'distill') return Math.min(base.elo - 25, scratchElo + 0.6 * Math.max(0, base.elo - scratchElo)) - crossModal * 0.5
  return Math.max(base.elo, scratchElo) - crossModal // continue: caller computes scratchElo on the combined token count
}

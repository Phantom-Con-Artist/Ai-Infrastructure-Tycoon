import { create } from 'zustand'
import { backfillRivals } from '@sim/corporate'
import { createWorld, step } from '@sim/world'
import type * as A from '@sim/actions'
import type { System, World } from '@sim/types'
import type { Preview } from '@sim/preview'
import type { Rules } from '@sim/rules'
import { touchSystem } from '@sim/managers'
import { HUBS, hubOf, type Hub, type Screen } from './nav'
export type { Screen } from './nav'
export const SPEEDS = [0, 6, 24, 168, 720] // game-hours per real second

import { saves, loadSettings, storeSettings, type Settings } from './saves'
import { WORLD_VERSION } from '@sim/world'

export const UNDO_MS = 5000
export type Overlay = null | 'news' | 'paper' | 'dev'
export interface Pending { title: string; preview: Preview; verb: string; resolve: (ok: boolean) => void }
export interface ActOpts { undoable?: boolean; system?: System }

interface UI {
  w: World | null; rev: number; speed: number; screen: Screen; siteId: string | null; settings: Settings
  overlay: Overlay; paperDay: number | null; lastReadTick: number
  pending: Pending | null
  undo: { snap: World; tick: number; at: number } | null
  goHub: (h: Hub) => void
  openOverlay: (o: Overlay, paperDay?: number | null) => void
  markRead: () => void
  /** Ask the player. Cheap passes straight through; expensive passes when that confirm tier is switched off. */
  confirm: (title: string, preview: Preview, verb: string) => Promise<boolean>
  answer: (ok: boolean) => void
  /** confirm, then act. null when the player backs out. */
  confirmAct: <T>(title: string, preview: Preview, verb: string, fn: (w: World) => A.Result<T>, opts?: ActOpts & { okMsg?: string }) => Promise<A.Result<T> | null>
  doUndo: () => void
  /** Offer Undo back to a snapshot taken before a multi-step edit (e.g. a paint stroke in the hall editor). */
  armUndo: (snap: World) => void
  setSettings: (p: Partial<Settings>) => void
  toast: { msg: string; kind: 'ok' | 'err'; id: number } | null
  newGame: (o: { company: string; ceo: string; advisor: string; seed: number; logo: { glyph: string; color: string }; rules?: Partial<Rules> }) => void
  load: (slot: string) => Promise<void>
  save: (slot?: string) => Promise<void>
  exit: () => void
  setSpeed: (s: number) => void
  go: (s: Screen) => void
  selectSite: (id: string | null) => void
  act: <T>(fn: (w: World) => A.Result<T>, okMsg?: string, opts?: ActOpts) => A.Result<T>
  tickFrame: (dtSec: number) => void
  flash: (msg: string, kind?: 'ok' | 'err') => void
}

let acc = 0
let lastRender = 0
let lastAuto = 0

export const useGame = create<UI>((set, get) => ({
  w: null, rev: 0, speed: 1, screen: 'overview', siteId: null, toast: null, settings: loadSettings(),
  overlay: null, paperDay: null, lastReadTick: 0, pending: null, undo: null,
  setSettings: (p) => { const settings = { ...get().settings, ...p }; storeSettings(settings); set({ settings }) },
  newGame: ({ company, ceo, advisor, seed, logo, rules }) => {
    const w = createWorld(seed, company, ceo, advisor, logo, rules)
    acc = 0
    set({ w, rev: 1, speed: 0, screen: 'overview', siteId: null, undo: null, pending: null, overlay: null, lastReadTick: 0 })
  },
  load: async (slot) => {
    const raw = await saves.read(slot)
    if (!raw) return get().flash('Save not found', 'err')
    const w = JSON.parse(raw) as World
    if (w.version !== WORLD_VERSION) return get().flash('That save is from an older version of the game', 'err')
    backfillRivals(w)
    acc = 0
    set({ w, rev: 1, speed: 0, screen: 'overview', siteId: w.sites[0]?.id ?? null, undo: null, pending: null, overlay: null, lastReadTick: w.tick })
  },
  save: async (slot = 'manual') => {
    const w = get().w; if (!w) return
    await saves.write(slot, { company: w.company, tick: w.tick, cash: w.cash, sandbox: w.rules.mode === 'sandbox' }, JSON.stringify(w))
    if (slot !== 'auto') get().flash('Game saved')
  },
  exit: () => set({ w: null, speed: 0, undo: null, pending: null, overlay: null }),
  setSpeed: (speed) => set({ speed }),
  go: (screen) => {
    const h = hubOf(screen)
    get().setSettings({ lastTab: { ...get().settings.lastTab, [h]: screen } })
    set({ screen })
  },
  goHub: (h) => {
    const last = get().settings.lastTab[h]
    set({ screen: last && HUBS[h].screens.includes(last) ? last : HUBS[h].screens[0] })
  },
  openOverlay: (overlay, paperDay = null) => set({ overlay, paperDay }),
  markRead: () => { const w = get().w; if (w) set({ lastReadTick: w.tick }) },
  confirm: (title, preview, verb) => {
    if (preview.tier === 'cheap') return Promise.resolve(true)
    if (preview.tier === 'expensive' && !get().settings.confirmExpensive) return Promise.resolve(true)
    get().pending?.resolve(false)
    return new Promise<boolean>((resolve) => set({ pending: { title, preview, verb, resolve } }))
  },
  answer: (ok) => { const p = get().pending; set({ pending: null }); p?.resolve(ok) },
  confirmAct: async (title, preview, verb, fn, opts) => {
    if (!(await get().confirm(title, preview, verb))) return null
    return get().act(fn, opts?.okMsg, opts)
  },
  armUndo: (snap) => {
    const w = get().w; if (!w) return
    const at = Date.now()
    set({ undo: { snap, tick: w.tick, at } })
    setTimeout(() => { if (get().undo?.at === at) set({ undo: null }) }, UNDO_MS)
  },
  doUndo: () => {
    const { undo, w } = get()
    if (undo && w && w.tick === undo.tick && Date.now() - undo.at < UNDO_MS) set((s) => ({ w: undo.snap, undo: null, rev: s.rev + 1 }))
    else set({ undo: null })
  },
  selectSite: (siteId) => set({ siteId }),
  flash: (msg, kind = 'ok') => {
    const id = Date.now()
    set({ toast: { msg, kind, id } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, get().undo ? UNDO_MS : 3200)
  },
  act: (fn, okMsg, opts) => {
    const w = get().w
    if (!w) return { ok: false, error: 'no game' }
    const snap = opts?.undoable ? structuredClone(w) : null
    const r = fn(w)
    if (!r.ok) get().flash(r.error, 'err')
    else {
      if (opts?.system) touchSystem(w, opts.system)
      if (snap) {
        const at = Date.now()
        set({ undo: { snap, tick: w.tick, at } })
        setTimeout(() => { if (get().undo?.at === at) set({ undo: null }) }, UNDO_MS)
      } else if (get().undo) set({ undo: null })
      if (okMsg) get().flash(okMsg)
    }
    set((s) => ({ rev: s.rev + 1 }))
    return r
  },
  tickFrame: (dt) => {
    const { w, speed } = get()
    if (!w || w.gameOver) return
    if (speed > 0) {
      acc += Math.min(dt, 0.25) * SPEEDS[speed]
      let n = Math.floor(acc)
      acc -= n
      n = Math.min(n, 400)
      for (let i = 0; i < n; i++) step(w)
      if (n > 0 && get().undo) set({ undo: null })
      if (n > 0 && w.tick - lastAuto > 24 * get().settings.autosaveDays) { lastAuto = w.tick; void get().save('auto') }
    }
    const now = performance.now()
    if (now - lastRender > 120) { lastRender = now; set((s) => ({ rev: s.rev + 1 })) }
  }
}))
export const useWorld = (): World => {
  useGame((s) => s.rev)
  return useGame.getState().w as World
}
// Dev-only handle for live UI testing and debugging from the console.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const g = window as unknown as Record<string, unknown>
  g.__game = useGame
  void import('./devDemo').then((m) => { g.__demo = m.demo })
  void Promise.all([import('@sim/actions'), import('@sim/chips'), import('@sim/store'), import('@sim/world'), import('@sim/events'), import('@sim/dev'), import('@sim/managers')]).then(([A, C, S, W, E, D, M]) => { g.__sim = { A, C, S, W, E, D, M } })
}

import { create } from 'zustand'
import { createWorld, step } from '@sim/world'
import type * as A from '@sim/actions'
import type { World } from '@sim/types'

export type Screen = 'overview' | 'sites' | 'fleet' | 'lab' | 'contracts' | 'research' | 'finance'
export const SPEEDS = [0, 6, 24, 168, 720] // game-hours per real second

declare global { interface Window { saves: import('../../preload').SavesApi } }

interface UI {
  w: World | null; rev: number; speed: number; screen: Screen; siteId: string | null
  toast: { msg: string; kind: 'ok' | 'err'; id: number } | null
  newGame: (o: { company: string; advisor: string; seed: number }) => void
  load: (slot: string) => Promise<void>
  save: (slot?: string) => Promise<void>
  exit: () => void
  setSpeed: (s: number) => void
  go: (s: Screen) => void
  selectSite: (id: string | null) => void
  act: <T>(fn: (w: World) => A.Result<T>, okMsg?: string) => A.Result<T>
  tickFrame: (dtSec: number) => void
  flash: (msg: string, kind?: 'ok' | 'err') => void
}

let acc = 0
let lastRender = 0
let lastAuto = 0

export const useGame = create<UI>((set, get) => ({
  w: null, rev: 0, speed: 1, screen: 'overview', siteId: null, toast: null,
  newGame: ({ company, advisor, seed }) => {
    const w = createWorld(seed, company, advisor)
    acc = 0
    set({ w, rev: 1, speed: 0, screen: 'overview', siteId: null })
  },
  load: async (slot) => {
    const raw = await window.saves.read(slot)
    if (!raw) return get().flash('Save not found', 'err')
    const w = JSON.parse(raw) as World
    acc = 0
    set({ w, rev: 1, speed: 0, screen: 'overview', siteId: w.sites[0]?.id ?? null })
  },
  save: async (slot = 'manual') => {
    const w = get().w; if (!w) return
    await window.saves.write(slot, { company: w.company, tick: w.tick, cash: w.cash }, JSON.stringify(w))
    if (slot !== 'auto') get().flash('Game saved')
  },
  exit: () => set({ w: null, speed: 0 }),
  setSpeed: (speed) => set({ speed }),
  go: (screen) => set({ screen }),
  selectSite: (siteId) => set({ siteId }),
  flash: (msg, kind = 'ok') => {
    const id = Date.now()
    set({ toast: { msg, kind, id } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, 3200)
  },
  act: (fn, okMsg) => {
    const w = get().w
    if (!w) return { ok: false, error: 'no game' }
    const r = fn(w)
    if (!r.ok) get().flash(r.error, 'err')
    else if (okMsg) get().flash(okMsg)
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
      if (n > 0 && w.tick - lastAuto > 24 * 60) { lastAuto = w.tick; void get().save('auto') }
    }
    const now = performance.now()
    if (now - lastRender > 120) { lastRender = now; set((s) => ({ rev: s.rev + 1 })) }
  }
}))
export const useWorld = (): World => {
  useGame((s) => s.rev)
  return useGame.getState().w as World
}

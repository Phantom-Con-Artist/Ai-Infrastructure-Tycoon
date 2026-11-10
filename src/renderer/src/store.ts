import { create } from 'zustand'
import { createWorld, step } from '@sim/world'
import type * as A from '@sim/actions'
import type { World } from '@sim/types'

export type Screen = 'overview' | 'sites' | 'fleet' | 'silicon' | 'lab' | 'contracts' | 'research' | 'finance' | 'rankings' | 'studio' | 'web'
export const SPEEDS = [0, 6, 24, 168, 720] // game-hours per real second

import { saves, loadSettings, storeSettings, type Settings } from './saves'
import { WORLD_VERSION } from '@sim/world'

interface UI {
  w: World | null; rev: number; speed: number; screen: Screen; siteId: string | null; settings: Settings
  setSettings: (p: Partial<Settings>) => void
  toast: { msg: string; kind: 'ok' | 'err'; id: number } | null
  newGame: (o: { company: string; ceo: string; advisor: string; seed: number; logo: { glyph: string; color: string } }) => void
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
  w: null, rev: 0, speed: 1, screen: 'overview', siteId: null, toast: null, settings: loadSettings(),
  setSettings: (p) => { const settings = { ...get().settings, ...p }; storeSettings(settings); set({ settings }) },
  newGame: ({ company, ceo, advisor, seed, logo }) => {
    const w = createWorld(seed, company, ceo, advisor, logo)
    acc = 0
    set({ w, rev: 1, speed: 0, screen: 'overview', siteId: null })
  },
  load: async (slot) => {
    const raw = await saves.read(slot)
    if (!raw) return get().flash('Save not found', 'err')
    const w = JSON.parse(raw) as World
    if (w.version !== WORLD_VERSION) return get().flash('That save is from an older version of the game', 'err')
    acc = 0
    set({ w, rev: 1, speed: 0, screen: 'overview', siteId: w.sites[0]?.id ?? null })
  },
  save: async (slot = 'manual') => {
    const w = get().w; if (!w) return
    await saves.write(slot, { company: w.company, tick: w.tick, cash: w.cash }, JSON.stringify(w))
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
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __game: typeof useGame }).__game = useGame

/** Save backend: SQLite via Electron IPC, or localStorage when running in a plain browser (dev/testing). */
export interface SaveMeta { slot: string; company: string; tick: number; cash: number; savedAt: number; sandbox?: boolean }
interface Backend {
  list(): Promise<SaveMeta[]>
  write(slot: string, meta: { company: string; tick: number; cash: number; sandbox?: boolean }, world: string): Promise<boolean>
  read(slot: string): Promise<string | null>
  remove(slot: string): Promise<boolean>
}
const KEY = 'aitycoon.saves.v1'
const local: Backend = {
  async list() { try { const m = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, SaveMeta>; return Object.values(m).sort((a, b) => b.savedAt - a.savedAt) } catch { return [] } },
  async write(slot, meta, world) {
    try { const m = JSON.parse(localStorage.getItem(KEY) ?? '{}'); m[slot] = { slot, ...meta, savedAt: Date.now() }; localStorage.setItem(KEY, JSON.stringify(m)); localStorage.setItem(KEY + ':' + slot, world); return true } catch { return false }
  },
  async read(slot) { try { return localStorage.getItem(KEY + ':' + slot) } catch { return null } },
  async remove(slot) { try { const m = JSON.parse(localStorage.getItem(KEY) ?? '{}'); delete m[slot]; localStorage.setItem(KEY, JSON.stringify(m)); localStorage.removeItem(KEY + ':' + slot); return true } catch { return false } }
}
export const saves: Backend = (typeof window !== 'undefined' && (window as unknown as { saves?: Backend }).saves) || local

import type { Hub, Screen } from './nav'
export interface Settings { autosaveDays: number; startSpeed: number; reduceMotion: boolean; uiScale: number; confirmQuit: boolean; skipIntro: boolean; confirmExpensive: boolean; expertMode: boolean; lastTab: Partial<Record<Hub, Screen>> }
const SKEY = 'aitycoon.settings.v1'
export const DEFAULT_SETTINGS: Settings = { autosaveDays: 30, startSpeed: 1, reduceMotion: false, uiScale: 1, confirmQuit: true, skipIntro: false, confirmExpensive: true, expertMode: false, lastTab: {} }
export function loadSettings(): Settings { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SKEY) ?? '{}') } } catch { return DEFAULT_SETTINGS } }
export function storeSettings(s: Settings): void { try { localStorage.setItem(SKEY, JSON.stringify(s)) } catch { /* ignore */ } }

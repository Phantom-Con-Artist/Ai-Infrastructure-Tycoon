import { useCallback, useState } from 'react'
/**
 * useState that survives leaving the screen. Drafts live in memory for the session and are cleared when a game
 * starts, loads or exits, so one company's half-filled form never leaks into another.
 */
const drafts = new Map<string, unknown>()
export const clearDrafts = (): void => drafts.clear()
export function useDraft<T>(key: string, init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void] {
  const [v, set] = useState<T>(() => (drafts.has(key) ? (drafts.get(key) as T) : typeof init === 'function' ? (init as () => T)() : init))
  const setV = useCallback((n: T | ((p: T) => T)) => {
    set((p) => { const next = typeof n === 'function' ? (n as (p: T) => T)(p) : n; drafts.set(key, next); return next })
  }, [key])
  return [v, setV]
}

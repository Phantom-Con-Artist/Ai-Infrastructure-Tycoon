/**
 * Confirm host. Severe actions use a hold-to-confirm button whose fill burns across like a fuse: you feel the weight
 * of the decision without the UI shouting. Expensive actions confirm with Enter. Escape always backs out.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Wallet } from 'lucide-react'
import { useGame } from '../store'
import { money } from '../format'

export const HOLD_MS = 1200

export function HoldButton({ label, onDone, tone = 'danger', keyboard = true }: { label: string; onDone: () => void; tone?: 'danger' | 'ok'; keyboard?: boolean }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | null>(null)
  // The game re-renders ~8×/s; keep the callback in a ref so start/stop stay stable and a hold survives re-renders.
  const done = useRef(onDone)
  done.current = onDone
  const start = useCallback(() => {
    if (timer.current !== null) return
    setHolding(true)
    timer.current = window.setTimeout(() => { timer.current = null; setHolding(false); done.current() }, HOLD_MS)
  }, [])
  const stop = useCallback(() => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null }
    setHolding(false)
  }, [])
  useEffect(() => {
    if (!keyboard) return
    const down = (e: KeyboardEvent): void => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); start() } }
    const up = (e: KeyboardEvent): void => { if (e.key === 'Enter') stop() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); stop() }
  }, [keyboard, start, stop])
  return (
    <button className={`hold ${tone} ${holding ? 'holding' : ''}`} style={{ ['--hold' as string]: `${HOLD_MS}ms` }}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onContextMenu={(e) => e.preventDefault()}>
      <span className="fill" aria-hidden />
      <span className="lbl">{holding ? 'Keep holding…' : `Hold to ${label.toLowerCase()}`}</span>
    </button>
  )
}

export function Confirm() {
  const pending = useGame((s) => s.pending)
  const answer = useGame((s) => s.answer)
  const cash = useGame((s) => s.w?.cash ?? 0)
  useEffect(() => {
    if (!pending) return
    const k = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.preventDefault(); answer(false) }
      if (e.key === 'Enter' && pending.preview.tier === 'expensive') { e.preventDefault(); answer(true) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [pending, answer])
  if (!pending) return null
  const { title, preview, verb } = pending
  const severe = preview.tier === 'severe'
  return (
    <div className="scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) answer(false) }}>
      <div className={`confirm ${severe ? 'severe' : 'expensive'}`} role="alertdialog" aria-modal aria-labelledby="cf-t">
        <div className="cf-icon">{severe ? <AlertTriangle size={20} /> : <Wallet size={20} />}</div>
        <h3 id="cf-t">{title}</h3>
        <ul>{preview.lines.map((l, i) => <li key={i} style={{ animationDelay: `${60 + i * 60}ms` }}>{l}</li>)}</ul>
        {severe && <p className="cf-note">This can’t be undone.</p>}
        {!severe && preview.cost !== undefined && <p className="cf-note">You have {money(cash)}.</p>}
        <div className="cf-actions">
          <button className="btn ghost" onClick={() => answer(false)}>Cancel <kbd>Esc</kbd></button>
          {severe ? <HoldButton label={verb} onDone={() => answer(true)} /> : <button className="btn pri" autoFocus onClick={() => answer(true)}>{verb} <kbd>Enter</kbd></button>}
        </div>
      </div>
    </div>
  )
}

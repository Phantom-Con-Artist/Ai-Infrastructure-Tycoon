import { useState, type ReactNode } from 'react'
import { useGame } from './store'
import { GLOSSARY } from './glossary'

export function Bar({ v, max = 1, warnAt = 0.8, badAt = 0.97 }: { v: number; max?: number; warnAt?: number; badAt?: number }) {
  const f = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0
  return <div className={'bar' + (f >= badAt ? ' bad' : f >= warnAt ? ' warn' : '')}><i style={{ width: `${f * 100}%` }} /></div>
}
export function Big({ n, l, cls = '' }: { n: ReactNode; l: string; cls?: string }) {
  return <div className="bigstat"><div className={'n ' + cls}>{n}</div><div className="l">{l}</div></div>
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="f">{label}{children}</label>
}
export function Num({ value, onChange, min = 0, max, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return <input type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
}
export function Tabs<T extends string>({ tabs, value, onChange, labels }: { tabs: readonly T[]; value: T; onChange: (t: T) => void; labels?: Partial<Record<T, string>> }) {
  return <div className="tabs">{tabs.map((t) => <button key={t} className={t === value ? 'on' : ''} onClick={() => onChange(t)}>{labels?.[t] ?? t}</button>)}</div>
}
export function useTab<T extends string>(first: T): [T, (t: T) => void] { return useState<T>(first) }
export function Head({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return <div className="page-head"><div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>{right}</div>
}
export function Spark({ data, w = 220, h = 48, color = 'var(--phos)' }: { data: number[]; w?: number; h?: number; color?: string }) {
  if (data.length < 2) return <svg width={w} height={h} />
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || 1
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((d - mn) / rg) * (h - 6)}`).join(' ')
  return <svg width={w} height={h} style={{ display: 'block' }}><polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} /></svg>
}

export function EmptyState({ art, eyebrow, title, body, children }: { art: ReactNode; eyebrow: string; title: string; body: ReactNode; children?: ReactNode }) {
  return <div className="empty"><div>{art}</div><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{body}</p>{children && <div className="acts">{children}</div>}</div></div>
}

/*
 * Simple-first screen pattern. Art direction: a calm instrument panel — every screen opens with three or four big,
 * quiet numbers (Summary), then the two or three moves that matter now (PrimaryActions). Everything else is still one
 * click away inside Advanced, which expert players can open by default from Settings.
 */
export interface SummaryItem { label: string; value: ReactNode; hint?: string; tone?: 'pos' | 'neg' | 'warn' }
export function Summary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="summary">
      {items.map((it) => (
        <div key={it.label} className={'sum ' + (it.tone ?? '')}>
          <span className="k">{it.label}</span>
          <span className="v">{it.value}</span>
          {it.hint && <span className="h">{it.hint}</span>}
        </div>
      ))}
    </div>
  )
}
export function PrimaryActions({ children }: { children: ReactNode }) {
  return <div className="primary-actions">{children}</div>
}
export function Advanced({ title = 'All controls', defaultOpen, children }: { title?: string; defaultOpen?: boolean; children: ReactNode }) {
  const expert = useGame((s) => s.settings.expertMode)
  const [open, setOpen] = useState<boolean | null>(null)
  const shown = open ?? defaultOpen ?? expert
  return (
    <section className={'advanced ' + (shown ? 'open' : '')}>
      <button className="adv-toggle" aria-expanded={shown} onClick={() => setOpen(!shown)}>
        <span>{title}</span><i aria-hidden>{shown ? '−' : '+'}</i>
      </button>
      {shown && <div className="adv-body">{children}</div>}
    </section>
  )
}
/** Jargon with a dotted underline; hover or focus for a one-line explanation. */
export function Term({ k, children }: { k: string; children: ReactNode }) {
  const tip = GLOSSARY[k]
  if (!tip) return <>{children}</>
  return <span className="term" tabIndex={0}>{children}<span className="term-tip" role="tooltip">{tip}</span></span>
}

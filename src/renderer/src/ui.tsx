import { useState, type ReactNode } from 'react'

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
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[]; value: T; onChange: (t: T) => void }) {
  return <div className="tabs">{tabs.map((t) => <button key={t} className={t === value ? 'on' : ''} onClick={() => onChange(t)}>{t}</button>)}</div>
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

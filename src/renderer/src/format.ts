import { START_YEAR } from '@sim/types'

export function money(n: number, d = 1): string {
  const a = Math.abs(n), s = n < 0 ? '−' : ''
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(d)}T`
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(d)}B`
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(d)}M`
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(d === 0 ? 0 : 1)}k`
  return `${s}$${a.toFixed(0)}`
}
export function num(n: number, d = 0): string {
  const a = Math.abs(n)
  if (a >= 1e15) return (n / 1e15).toFixed(2) + 'P'
  if (a >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (a >= 1e4) return (n / 1e3).toFixed(1) + 'k'
  return n.toLocaleString('en-US', { maximumFractionDigits: d })
}
export function flops(n: number): string {
  const u = ['FLOP', 'KFLOP', 'MFLOP', 'GFLOP', 'TFLOP', 'PFLOP', 'EFLOP', 'ZFLOP', 'YFLOP']
  let i = 0
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++ }
  return `${n.toFixed(n < 10 ? 2 : 1)} ${u[i]}`
}
export function dateOf(tick: number): string {
  const d = new Date(Date.UTC(START_YEAR, 0, 1) + tick * 3600_000)
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
export function dur(hours: number): string {
  if (!Number.isFinite(hours)) return '∞'
  if (hours < 48) return `${hours.toFixed(0)} h`
  if (hours < 24 * 90) return `${(hours / 24).toFixed(1)} d`
  return `${(hours / 8766).toFixed(2)} y`
}
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' }
/** 5.9×10¹⁶ style scientific notation. */
export function sci(n: number, d = 1): string {
  if (!Number.isFinite(n) || n === 0) return String(n)
  const e = Math.floor(Math.log10(Math.abs(n)))
  return `${(n / 10 ** e).toFixed(d)}×10${String(e).split('').map((c) => SUP[c] ?? c).join('')}`
}
/** Parameter counts given in billions → 124M / 8.0B / 671B / 100T. */
export function params(b: number): string {
  if (b >= 1000) return `${num(b / 1000, 1)}T`
  if (b >= 1) return `${b >= 100 ? b.toFixed(0) : b.toFixed(1)}B`
  return `${(b * 1000).toFixed(0)}M`
}

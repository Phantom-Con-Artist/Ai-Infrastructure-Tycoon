import type { Site } from '@sim/types'

const SRC = [
  { k: 'grid', name: 'Grid', color: 'oklch(0.55 0.03 265)' }, { k: 'solar', name: 'Solar', color: 'oklch(0.8 0.15 85)' }, { k: 'wind', name: 'Wind', color: 'oklch(0.75 0.1 210)' },
  { k: 'firm', name: 'Nuclear / geo', color: 'oklch(0.62 0.15 300)' }, { k: 'battery', name: 'Battery', color: 'oklch(0.65 0.17 150)' }, { k: 'gas', name: 'Gas', color: 'oklch(0.66 0.16 50)' }
] as const
const SINK = [{ k: 'it', name: 'IT (GPUs)', color: 'oklch(0.58 0.16 255)' }, { k: 'cooling', name: 'Cooling', color: 'oklch(0.7 0.11 220)' }, { k: 'other', name: 'Losses & lights', color: 'oklch(0.75 0.02 265)' }, { k: 'curtailed', name: 'Curtailed (DR)', color: 'oklch(0.6 0.2 25)' }] as const

/** Sankey-style power flow: sources on the left, the site bus in the middle, loads on the right. Animated dashes show current. */
export function PowerFlow({ site }: { site: Site }) {
  const f = site.flow
  if (!f) return <p className="dim">Power flow appears once the clock runs.</p>
  const W = 640, H = 260, busX = W / 2
  const srcs = SRC.map((s) => ({ ...s, v: f[s.k] })).filter((s) => s.v > 0.0005)
  const sinks = SINK.map((s) => ({ ...s, v: f[s.k] })).filter((s) => s.v > 0.0005)
  const total = Math.max(1e-6, srcs.reduce((a, s) => a + s.v, 0), sinks.reduce((a, s) => a + s.v, 0))
  if (total < 0.002) return <p className="dim" style={{ padding: '40px 0', textAlign: 'center' }}>Nothing is drawing power yet: halls under construction or no servers installed.</p>
  const scale = (H - 60) / total
  const lay = <T extends { v: number }>(arr: T[]) => { let y = 20 + ((H - 40) - arr.reduce((a, s) => a + s.v * scale, 0) - (arr.length - 1) * 8) / 2; return arr.map((s) => { const h = Math.max(2, s.v * scale); const o = { ...s, y, h }; y += h + 8; return o }) }
  const L = lay(srcs), R = lay(sinks)
  let busIn = H / 2 - (total * scale) / 2, busOut = busIn
  const fmt = (mw: number): string => mw >= 1 ? `${mw.toFixed(1)} MW` : `${(mw * 1000).toFixed(0)} kW`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-label="Power flow">
      {L.map((s) => { const y0 = s.y + s.h / 2, y1 = busIn + s.h / 2; busIn += s.h; return <g key={s.k}>
        <path d={`M120,${y0} C${busX - 60},${y0} ${busX - 60},${y1} ${busX - 8},${y1}`} stroke={s.color} strokeWidth={s.h} fill="none" opacity={0.35} />
        <path d={`M120,${y0} C${busX - 60},${y0} ${busX - 60},${y1} ${busX - 8},${y1}`} stroke={s.color} strokeWidth={Math.min(3, s.h)} fill="none" strokeDasharray="4 10" className="flow" />
        <rect x={104} y={s.y} width={16} height={s.h} rx={3} fill={s.color} />
        <text x={98} y={y0 + 4} textAnchor="end" fontSize={12} fill="var(--tx)">{s.name} <tspan fill="var(--tx-3)">{fmt(s.v)}</tspan></text></g> })}
      <rect x={busX - 8} y={H / 2 - (total * scale) / 2 - 6} width={16} height={total * scale + 12} rx={6} fill="var(--ink)" />
      <text x={busX} y={H / 2 - (total * scale) / 2 - 12} textAnchor="middle" fontSize={11.5} fontWeight={650} fill="var(--tx)">{site.name.split(' ')[0]} bus</text>
      {R.map((s) => { const y1 = s.y + s.h / 2, y0 = busOut + s.h / 2; busOut += s.h; return <g key={s.k}>
        <path d={`M${busX + 8},${y0} C${busX + 60},${y0} ${busX + 60},${y1} ${W - 120},${y1}`} stroke={s.color} strokeWidth={s.h} fill="none" opacity={0.35} />
        <path d={`M${busX + 8},${y0} C${busX + 60},${y0} ${busX + 60},${y1} ${W - 120},${y1}`} stroke={s.color} strokeWidth={Math.min(3, s.h)} fill="none" strokeDasharray="4 10" className="flow" />
        <rect x={W - 120} y={s.y} width={16} height={s.h} rx={3} fill={s.color} />
        <text x={W - 98} y={y1 + 4} fontSize={12} fill="var(--tx)">{s.name} <tspan fill="var(--tx-3)">{fmt(s.v)}</tspan></text></g> })}
    </svg>
  )
}

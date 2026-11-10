import type { GpuSpec } from '@sim/data/hardware'

const VENDOR: Record<string, { pcb: string; shroud: string; accent: string }> = {
  nvidious: { pcb: '#1b1f1a', shroud: '#2a2d30', accent: '#76c442' },
  amdude: { pcb: '#1d1a1a', shroud: '#2c2a2b', accent: '#e8513d' },
  intellect: { pcb: '#161b24', shroud: '#252b36', accent: '#4f8df5' },
  player: { pcb: '#1c1828', shroud: '#2b2540', accent: '#9a7bff' }
}

/** Top-down SXM-style module render: die area, HBM stacks and VRMs scale with the spec. */
export function GpuArt({ g, width = 120 }: { g: GpuSpec; width?: number }) {
  const v = VENDOR[g.vendor] ?? VENDOR.player
  const stacks = Math.max(2, Math.min(12, Math.round(g.memGB / 24)))
  const dieW = Math.min(64, 26 + Math.sqrt(g.tflops) * 0.55), dieH = dieW * 0.82
  const perSide = Math.ceil(stacks / 2)
  const hbmH = Math.min(14, (dieH - (perSide - 1) * 2) / perSide)
  const cx = 60, cy = 44
  const vrm = Math.min(16, Math.round(g.tdpW / 90))
  return (
    <svg width={width} height={width * 0.74} viewBox="0 0 120 89" aria-label={g.name} style={{ display: 'block' }}>
      <rect x={2} y={2} width={116} height={85} rx={6} fill={v.pcb} />
      {Array.from({ length: vrm }, (_, i) => <rect key={i} x={6 + i * (108 / vrm)} y={6} width={108 / vrm - 2} height={6} rx={1} fill="#3a3d42" />)}
      {Array.from({ length: vrm }, (_, i) => <rect key={'b' + i} x={6 + i * (108 / vrm)} y={77} width={108 / vrm - 2} height={6} rx={1} fill="#3a3d42" />)}
      <rect x={cx - dieW / 2 - 22} y={cy - dieH / 2 - 6} width={dieW + 44} height={dieH + 12} rx={3} fill="#5c5f63" />
      <rect x={cx - dieW / 2} y={cy - dieH / 2} width={dieW} height={dieH} rx={1.5} fill="url(#die)" />
      {Array.from({ length: stacks }, (_, i) => {
        const left = i < perSide, k = left ? i : i - perSide
        return <rect key={i} x={left ? cx - dieW / 2 - 18 : cx + dieW / 2 + 4} y={cy - dieH / 2 + k * (hbmH + 2)} width={14} height={hbmH} rx={1} fill="#b7bbc1" stroke="#7d8187" strokeWidth={0.5} />
      })}
      <rect x={6} y={83} width={30} height={2} fill={v.accent} />
      <defs><linearGradient id="die" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4b4f6b" /><stop offset=".5" stopColor="#8a8fb3" /><stop offset="1" stopColor="#3c405a" /></linearGradient></defs>
    </svg>
  )
}

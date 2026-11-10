import type { ChipSpec, ChipEval } from '@sim/silicon'

/** Top-down package floorplan: compute (tensor), SRAM, I/O partitions per die, HBM stacks along the edges. */
export function Floorplan({ s, e, size = 340 }: { s: ChipSpec; e: ChipEval; size?: number }) {
  const wafer = s.pkg === 'wafer'
  if (wafer) return <WaferScale size={size} />
  const dies = Math.max(1, s.dies)
  const dieW = Math.sqrt(s.dieMm2) * 1.15, dieH = Math.sqrt(s.dieMm2) / 1.15
  const perSide = s.kind === 'gpu' ? Math.ceil(s.hbmStacks / 2) : 0
  const hbmW = 11, hbmH = 10, gap = 3
  const W = dies * dieW + (dies - 1) * gap + (perSide ? 2 * (hbmW + gap) : 0)
  const H = Math.max(dieH, perSide * (hbmH + 2))
  const pad = 14, scale = (size - 2 * pad) / Math.max(W, H)
  const ox = pad + ((size - 2 * pad) - W * scale) / 2, oy = pad + ((size - 2 * pad) - H * scale) / 2
  const cells: JSX.Element[] = []
  for (let d = 0; d < dies; d++) {
    const x = ox + ((perSide ? hbmW + gap : 0) + d * (dieW + gap)) * scale, y = oy + ((H - dieH) / 2) * scale
    const w = dieW * scale, h = dieH * scale
    const cols = Math.max(4, Math.round(Math.sqrt(e.transistorsB / dies) * 1.4)), rows = Math.max(3, Math.round(cols * dieH / dieW))
    const compH = h * s.computeFrac / (s.computeFrac + s.sramFrac + 0.0001) * 0.86
    cells.push(<rect key={'d' + d} x={x} y={y} width={w} height={h} rx={3} fill="#2c3150" />)
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const cy = y + 4 + (j / rows) * (h - 8), isComp = cy < y + compH
      cells.push(<rect key={`c${d}-${i}-${j}`} x={x + 4 + (i / cols) * (w - 8)} y={cy} width={(w - 8) / cols - 1.2} height={(h - 8) / rows - 1.2} rx={0.8} fill={isComp ? (s.kind === 'cpu' ? '#7aa6ff' : '#6fdc8c') : '#c5a8ff'} opacity={isComp ? 0.85 : 0.6} className={isComp ? 'node' : undefined} style={isComp ? { animationDelay: `${((i * 7 + j * 13) % 20) / 10}s` } : undefined} />)
    }
    cells.push(<rect key={'io' + d} x={x + 4} y={y + h - 9} width={w - 8} height={5} rx={1} fill="#f0b94d" opacity={0.85} />)
  }
  for (let k = 0; k < (s.kind === 'gpu' ? s.hbmStacks : 0); k++) {
    const left = k < perSide, i = left ? k : k - perSide
    const x = left ? ox : ox + (W - hbmW) * scale
    const y = oy + (i * (hbmH + 2)) * scale + ((H - perSide * (hbmH + 2)) / 2) * scale
    cells.push(<g key={'h' + k}><rect x={x} y={y} width={hbmW * scale} height={hbmH * scale} rx={2} fill="#b9bec7" stroke="#8a9099" />
      {Array.from({ length: Math.min(8, s.hbmHeight) }, (_, t) => <line key={t} x1={x + 2} x2={x + hbmW * scale - 2} y1={y + 3 + t * (hbmH * scale - 6) / 8} y2={y + 3 + t * (hbmH * scale - 6) / 8} stroke="#8a9099" strokeWidth={0.6} />)}</g>)
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Package floorplan">
      <rect x={4} y={4} width={size - 8} height={size - 8} rx={14} fill="#3b2f25" />
      <rect x={ox - 6} y={oy - 6} width={W * scale + 12} height={H * scale + 12} rx={6} fill="#8d9097" opacity={s.pkg === 'mono' ? 0 : 0.55} />
      {cells}
    </svg>
  )
}

function WaferScale({ size }: { size: number }) {
  const r = size / 2 - 8, c = size / 2, cells: JSX.Element[] = []
  const n = 12, step = (2 * r * 0.72) / n
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = c - r * 0.72 + i * step, y = c - r * 0.72 + j * step
    cells.push(<rect key={`${i}${j}`} x={x} y={y} width={step - 2} height={step - 2} rx={2} fill={(i * 31 + j * 17) % 23 === 0 ? '#e9a23b' : '#6fdc8c'} opacity={0.85} className="node" style={{ animationDelay: `${((i + j) % 10) / 5}s` }} />)
  }
  return <svg width={size} height={size}><circle cx={c} cy={c} r={r} fill="#2c3150" /><rect x={c - r * 0.72 - 4} y={c - r * 0.72 - 4} width={r * 1.44 + 6} height={r * 1.44 + 6} rx={6} fill="#1d2133" />{cells}</svg>
}

/** 300 mm wafer with every candidate die drawn; defective dies (Poisson) shown in red. */
export function WaferMap({ dieMm2, yieldFrac, size = 220, seed = 1 }: { dieMm2: number; yieldFrac: number; size?: number; seed?: number }) {
  const R = 150, s = size / (2 * R + 8)
  const dw = Math.sqrt(dieMm2) * 1.15, dh = Math.sqrt(dieMm2) / 1.15
  const out: JSX.Element[] = []
  let k = seed * 9301
  const rand = (): number => { k = (k * 16807) % 2147483647; return k / 2147483647 }
  for (let y = -R; y < R; y += dh) for (let x = -R; x < R; x += dw) {
    const corners = [[x, y], [x + dw, y], [x, y + dh], [x + dw, y + dh]]
    if (!corners.every(([a, b]) => a * a + b * b <= (R - 3) ** 2)) continue
    const good = rand() < yieldFrac
    out.push(<rect key={`${x}${y}`} x={(x + R + 4) * s} y={(y + R + 4) * s} width={dw * s - 0.8} height={dh * s - 0.8} fill={good ? '#5cc985' : '#e8572f'} opacity={good ? 0.85 : 0.9} />)
  }
  return (
    <svg width={size} height={size} aria-label="Wafer map">
      <circle cx={size / 2} cy={size / 2} r={R * s} fill="#cfd5df" />
      <circle cx={size / 2} cy={size / 2} r={R * s} fill="url(#sheen)" />
      {out}
      <rect x={size / 2 - 6} y={size - 6} width={12} height={4} fill="var(--bg)" />
      <defs><radialGradient id="sheen" cx=".35" cy=".3"><stop offset="0" stopColor="#ffffff" stopOpacity=".7" /><stop offset="1" stopColor="#8f9bb3" stopOpacity=".2" /></radialGradient></defs>
    </svg>
  )
}
import type { JSX } from 'react'

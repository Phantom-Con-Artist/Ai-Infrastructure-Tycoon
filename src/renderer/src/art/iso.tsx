/** Tiny isometric SVG toolkit used by every illustration. */
const C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6)
export const iso = (x: number, y: number, z = 0): [number, number] => [(x - y) * C, (x + y) * S - z]
const pt = (p: [number, number]): string => `${p[0].toFixed(1)},${p[1].toFixed(1)}`

export interface BoxProps { x: number; y: number; z?: number; w: number; d: number; h: number; top: string; left: string; right: string; stroke?: string; className?: string; style?: React.CSSProperties }
/** An isometric box with its three visible faces. */
export function IsoBox({ x, y, z = 0, w, d, h, top, left, right, stroke = 'none', className, style }: BoxProps) {
  const t = [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)]
  const l = [iso(x, y + d, z + h), iso(x + w, y + d, z + h), iso(x + w, y + d, z), iso(x, y + d, z)]
  const r = [iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x + w, y + d, z), iso(x + w, y, z)]
  return (
    <g className={className} style={style} strokeLinejoin="round">
      <polygon points={l.map(pt).join(' ')} fill={left} stroke={stroke} strokeWidth={0.6} />
      <polygon points={r.map(pt).join(' ')} fill={right} stroke={stroke} strokeWidth={0.6} />
      <polygon points={t.map(pt).join(' ')} fill={top} stroke={stroke} strokeWidth={0.6} />
    </g>
  )
}
/** Flat isometric tile (floor plate). */
export function IsoTile({ x, y, w, d, fill, stroke = 'none', z = 0, dash }: { x: number; y: number; w: number; d: number; fill: string; stroke?: string; z?: number; dash?: string }) {
  const p = [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)]
  return <polygon points={p.map(pt).join(' ')} fill={fill} stroke={stroke} strokeWidth={0.8} strokeDasharray={dash} />
}
export const P = pt

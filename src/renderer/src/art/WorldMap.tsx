import type { World } from '@sim/types'
import { REGIONS } from '@sim/data/hardware'

/** Real coordinates for each playable region. */
export const REGION_LL: Record<string, [number, number]> = { va: [-77.5, 39.0], or: [-122.9, 45.5], tx: [-99.7, 32.4], az: [-111.8, 33.4], ie: [-6.3, 53.3], is: [-21.9, 64.1], se: [22.1, 65.6], qc: [-71.2, 46.8], sg: [103.7, 1.33] }

// Coarse continent outlines (lon, lat), hand-simplified. Good enough for a strategy-game overview.
const CONTINENTS: [number, number][][] = [
  [[-168, 66], [-140, 70], [-95, 74], [-80, 70], [-62, 60], [-56, 52], [-66, 45], [-75, 35], [-81, 25], [-97, 26], [-97, 18], [-87, 15], [-78, 8], [-90, 15], [-105, 20], [-117, 32], [-124, 40], [-124, 48], [-135, 57], [-152, 59], [-166, 60]],
  [[-80, 9], [-72, 12], [-60, 10], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -38], [-66, -55], [-73, -50], [-71, -30], [-75, -15], [-81, -5]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [3, 51], [8, 54], [11, 58], [5, 62], [14, 68], [25, 71], [40, 68], [60, 69], [80, 73], [105, 77], [140, 72], [170, 69], [178, 65], [160, 60], [142, 52], [135, 43], [122, 40], [121, 31], [110, 21], [105, 10], [100, 3], [96, 16], [92, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [52, 13], [43, 12], [35, 28], [35, 36], [28, 41], [22, 38], [16, 38], [12, 44], [3, 43], [-5, 36]],
  [[-17, 21], [-16, 13], [-8, 5], [7, 4], [9, -1], [13, -12], [12, -18], [18, -34], [26, -34], [33, -26], [40, -15], [40, -5], [51, 11], [43, 12], [32, 31], [20, 32], [10, 37], [-6, 36], [-10, 30]],
  [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -32], [116, -35], [114, -26]],
  [[-50, 60], [-44, 60], [-22, 70], [-20, 78], [-40, 83], [-62, 81], [-72, 78], [-55, 70]],
  [[-6, 50], [2, 51], [-3, 55], [-5, 58], [-8, 55]], [[-24, 64], [-14, 64], [-15, 66], [-22, 66]], [[130, 31], [140, 35], [142, 41], [140, 45], [135, 35]]
]

export function WorldMap({ w, onPick, height = 300 }: { w: World; onPick?: (regionId: string) => void; height?: number }) {
  const W = 1000, H = 500
  const px = (lon: number, lat: number): [number, number] => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H]
  const mwBy: Record<string, number> = {}
  for (const s of w.sites) mwBy[s.regionId] = (mwBy[s.regionId] ?? 0) + s.utilityMw
  return (
    <svg viewBox={`0 28 ${W} ${H - 160}`} width="100%" style={{ height, display: 'block' }} aria-label="World map of regions">
      <rect x={0} y={0} width={W} height={H} fill="oklch(0.95 0.015 240)" />
      {Array.from({ length: 11 }, (_, i) => <line key={'m' + i} x1={i * 100} x2={i * 100} y1={0} y2={H} stroke="oklch(0.58 0.16 255 / .06)" />)}
      {Array.from({ length: 6 }, (_, i) => <line key={'p' + i} x1={0} x2={W} y1={i * 100} y2={i * 100} stroke="oklch(0.58 0.16 255 / .06)" />)}
      {CONTINENTS.map((c, i) => <polygon key={i} points={c.map(([lo, la]) => px(lo, la).join(',')).join(' ')} fill="oklch(0.9 0.02 150)" stroke="oklch(0.8 0.03 150)" strokeWidth={1} strokeLinejoin="round" />)}
      {REGIONS.map((r) => {
        const [x, y] = px(...(REGION_LL[r.id] ?? [0, 0]))
        const mw = mwBy[r.id] ?? 0
        const owned = mw > 0
        return (
          <g key={r.id} onClick={onPick ? () => onPick(r.id) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }}>
            {owned && <circle cx={x} cy={y} r={14} fill="none" stroke="var(--accent)" className="pulse" />}
            <circle cx={x} cy={y} r={owned ? 6 + Math.min(14, Math.sqrt(mw)) : 5} fill={owned ? 'var(--accent)' : 'white'} stroke={owned ? 'white' : 'var(--ink)'} strokeWidth={2} />
            <text x={x + 10} y={y - 8} fontSize={13} fontWeight={owned ? 700 : 550} fill="var(--tx)" style={{ paintOrder: 'stroke', stroke: 'oklch(0.95 0.015 240)', strokeWidth: 4 }}>{r.name.split(',')[0]}{owned ? ` · ${mw} MW` : ''}</text>
          </g>
        )
      })}
    </svg>
  )
}

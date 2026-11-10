/**
 * Brand system for the parody universe: 20 original marks, app-icon tiles, word-marks with per-company type,
 * and vendor-branded hardware art. All geometry is original; no real trademark is drawn or named.
 */
import { useId } from 'react'
import { corp, type MarkShape } from '@sim/data/lore'
import type { GpuSpec } from '@sim/data/hardware'

/** One filled mark in a 48×48 box. `c` is the ink; the mark is designed to read in a single colour. */
export function BrandMark({ shape, c, size = 32 }: { shape: MarkShape; c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ display: 'block' }}><MarkPaths shape={shape} c={c} /></svg>
}

/** The mark's geometry as a bare <g>, for composing inside another SVG. */
export function MarkPaths({ shape, c }: { shape: MarkShape; c: string }) {
  const sw = { fill: 'none', stroke: c, strokeWidth: 4.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <g>
      {shape === 'orbit' && <><circle cx={24} cy={24} r={7} fill={c} /><ellipse cx={24} cy={24} rx={20} ry={8.5} {...sw} transform="rotate(-28 24 24)" /><circle cx={40} cy={15} r={3.4} fill={c} /></>}
      {shape === 'stack' && <>{[0, 1, 2].map((i) => <path key={i} d={`M6 ${17 + i * 9} l18 -9 18 9 -18 9z`} fill={c} opacity={1 - i * 0.28} />)}</>}
      {shape === 'spark' && <path d="M24 3 C26 17 31 22 45 24 C31 26 26 31 24 45 C22 31 17 26 3 24 C17 22 22 17 24 3Z" fill={c} />}
      {shape === 'knot' && <g {...sw} strokeWidth={4}>{[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx={24} cy={15} rx={7} ry={11} transform={`rotate(${a} 24 24)`} />)}</g>}
      {shape === 'wave' && <><path d="M3 30 C10 14 17 14 24 30 S38 46 45 30" {...sw} strokeWidth={5.5} /><path d="M3 18 C10 2 17 2 24 18 S38 34 45 18" {...sw} strokeWidth={3} opacity={0.5} /></>}
      {shape === 'prism' && <><path d="M24 4 L44 40 H4Z" fill={c} /><path d="M24 4 L24 40 L4 40Z" fill="#fff" opacity={0.22} /></>}
      {shape === 'chip' && <><rect x={11} y={11} width={26} height={26} rx={5} fill={c} /><rect x={18} y={18} width={12} height={12} rx={2} fill="#fff" opacity={0.35} />{[17, 24, 31].map((v) => <path key={v} d={`M${v} 3v6M${v} 39v6M3 ${v}h6M39 ${v}h6`} {...sw} strokeWidth={3} />)}</>}
      {shape === 'hex' && <><path d="M24 3 L42 13.5 V34.5 L24 45 L6 34.5 V13.5Z" fill={c} /><path d="M24 14 L33 19 V29 L24 34 L15 29 V19Z" fill="#fff" opacity={0.3} /></>}
      {shape === 'bloom' && <>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={24} cy={13} rx={6.5} ry={10} fill={c} opacity={0.82} transform={`rotate(${a} 24 24)`} />)}<circle cx={24} cy={24} r={5} fill="#fff" opacity={0.6} /></>}
      {shape === 'arc' && <><path d="M6 40 A18 18 0 0 1 42 40" {...sw} strokeWidth={7} /><path d="M15 40 A9 9 0 0 1 33 40" {...sw} strokeWidth={7} opacity={0.55} /></>}
      {shape === 'grid' && <>{[0, 1].map((i) => [0, 1].map((j) => <rect key={i + '' + j} x={6 + i * 19} y={6 + j * 19} width={17} height={17} rx={3} fill={c} opacity={i + j === 1 ? 0.6 : 1} />))}</>}
      {shape === 'eye' && <><path d="M3 24 C12 10 36 10 45 24 C36 38 12 38 3 24Z" fill={c} /><circle cx={24} cy={24} r={7.5} fill="#fff" opacity={0.85} /><circle cx={24} cy={24} r={3.5} fill={c} /></>}
      {shape === 'bolt' && <path d="M28 3 L9 27 H22 L19 45 L39 19 H26Z" fill={c} />}
      {shape === 'ring' && <><circle cx={24} cy={24} r={17} {...sw} strokeWidth={8} /><circle cx={24} cy={24} r={17} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={8} strokeDasharray="20 87" /></>}
      {shape === 'delta' && <><path d="M24 5 L45 43 H3Z" {...sw} strokeWidth={5} /><path d="M24 22 L33 38 H15Z" fill={c} /></>}
      {shape === 'cube' && <><path d="M24 4 L42 14 V34 L24 44 L6 34 V14Z" fill={c} /><path d="M24 24 L42 14 M24 24 L6 14 M24 24 V44" stroke="#fff" strokeOpacity={0.45} strokeWidth={2.5} /></>}
      {shape === 'flame' && <><path d="M24 3 C34 14 40 22 40 31 A16 16 0 0 1 8 31 C8 23 14 18 18 11 C19 18 22 21 25 22 C24 15 23 9 24 3Z" fill={c} /><path d="M24 26 C28 30 30 33 30 36 A6 6 0 0 1 18 36 C18 32 21 30 24 26Z" fill="#fff" opacity={0.4} /></>}
      {shape === 'leaf' && <><path d="M8 40 C8 18 22 6 42 6 C42 28 30 40 8 40Z" fill={c} /><path d="M10 38 L34 14" stroke="#fff" strokeOpacity={0.45} strokeWidth={2.5} strokeLinecap="round" /></>}
      {shape === 'pulse' && <path d="M3 26 H13 L18 12 L26 38 L31 20 L35 26 H45" {...sw} strokeWidth={5} />}
      {shape === 'shard' && <><path d="M8 40 L18 6 L40 20 Z" fill={c} /><path d="M18 6 L40 20 L30 42 Z" fill={c} opacity={0.6} /></>}
    </g>
  )
}

/** App-icon style tile: brand colour gradient with a white mark. */
export function CorpLogo({ id, size = 28 }: { id: string; size?: number }) {
  const c = corp(id), gid = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={c.name} style={{ display: 'inline-block', verticalAlign: 'middle', flex: 'none' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.color} /><stop offset="1" stopColor={c.color} stopOpacity={0.62} /></linearGradient></defs>
      <rect width={48} height={48} rx={13} fill="#1d2230" />
      <rect width={48} height={48} rx={13} fill={`url(#${gid})`} />
      <rect x={0.5} y={0.5} width={47} height={47} rx={12.5} fill="none" stroke="#fff" strokeOpacity={0.18} />
      <g transform="translate(10 10) scale(0.583)"><MarkPaths shape={c.mark} c="#ffffff" /></g>
    </svg>
  )
}

type TypeStyle = { weight: number; caps: boolean; track: string; italic?: boolean; family: string }
const STYLES: TypeStyle[] = [
  { weight: 700, caps: false, track: '-0.04em', family: 'var(--display)' },
  { weight: 800, caps: true, track: '0.08em', family: 'var(--sans)' },
  { weight: 500, caps: false, track: '-0.02em', family: 'var(--sans)' },
  { weight: 650, caps: false, track: '-0.03em', italic: true, family: 'var(--display)' },
  { weight: 900, caps: true, track: '-0.01em', family: 'var(--display)' },
  { weight: 400, caps: false, track: '0.01em', family: 'Newsreader Variable, serif' }
]
const styleOf = (id: string): TypeStyle => STYLES[[...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % STYLES.length]

/** Mark + name in the company's own type style. */
export function CorpWordmark({ id, size = 18, mono }: { id: string; size?: number; mono?: string }) {
  const c = corp(id), t = styleOf(id)
  const name = c.name.replace(/ (Inc\.|Holdings|Systems|Platforms|Semiconductor|Cloud|Web Services)$/, '')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.38, color: mono ?? 'inherit', whiteSpace: 'nowrap' }}>
      <BrandMark shape={c.mark} c={mono ?? c.color} size={size * 1.25} />
      <span style={{ font: `${t.italic ? 'italic ' : ''}${t.weight} ${t.caps ? size * 0.78 : size}px ${t.family}`, letterSpacing: t.track, textTransform: t.caps ? 'uppercase' : 'none' }}>{name}</span>
    </span>
  )
}

/** SXM-style module, vendor-branded: PCB, gold fingers, heat-spreader with etched mark, HBM stacks, VRMs. */
export function GpuArt({ g, width = 150 }: { g: GpuSpec; width?: number }) {
  const gid = useId().replace(/:/g, '')
  const c = g.vendor === 'player' ? { color: '#9a7bff', mark: 'spark' as MarkShape } : corp(g.vendor)
  const stacks = Math.max(2, Math.min(12, Math.round(g.memGB / 24)))
  const perSide = Math.ceil(stacks / 2)
  const dieW = Math.min(56, 24 + Math.sqrt(g.tflops) * 0.5), dieH = dieW * 0.86
  const hbmH = Math.min(13, (dieH - (perSide - 1) * 2) / perSide)
  const cx = 70, cy = 50, vrm = Math.min(14, Math.round(g.tdpW / 100) + 4)
  return (
    <svg width={width} height={width * 0.72} viewBox="0 0 140 101" role="img" aria-label={g.name} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid + 'p'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f2a24" /><stop offset="1" stopColor="#151b18" /></linearGradient>
        <linearGradient id={gid + 'm'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d9dde3" /><stop offset=".45" stopColor="#9aa0a8" /><stop offset=".55" stopColor="#c4c9d0" /><stop offset="1" stopColor="#7d838c" /></linearGradient>
        <linearGradient id={gid + 'h'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8d939b" /><stop offset=".5" stopColor="#e2e5ea" /><stop offset="1" stopColor="#8d939b" /></linearGradient>
      </defs>
      <rect x={3} y={3} width={134} height={92} rx={7} fill={`url(#${gid}p)`} />
      {Array.from({ length: 22 }, (_, i) => <rect key={'f' + i} x={12 + i * 5.2} y={95} width={3.4} height={5} rx={0.6} fill="#d9b25a" />)}
      {Array.from({ length: vrm }, (_, i) => <rect key={'v' + i} x={8 + i * (124 / vrm)} y={8} width={124 / vrm - 2.5} height={7} rx={1.2} fill="#363b42" />)}
      {Array.from({ length: vrm }, (_, i) => <rect key={'w' + i} x={8 + i * (124 / vrm)} y={83} width={124 / vrm - 2.5} height={7} rx={1.2} fill="#363b42" />)}
      <rect x={cx - dieW / 2 - 24} y={cy - dieH / 2 - 7} width={dieW + 48} height={dieH + 14} rx={4} fill="#4a4f56" />
      {Array.from({ length: stacks }, (_, i) => {
        const left = i < perSide, k = left ? i : i - perSide
        return <rect key={i} x={left ? cx - dieW / 2 - 20 : cx + dieW / 2 + 5} y={cy - dieH / 2 + k * (hbmH + 2)} width={15} height={hbmH} rx={1.2} fill={`url(#${gid}h)`} />
      })}
      <rect x={cx - dieW / 2} y={cy - dieH / 2} width={dieW} height={dieH} rx={2.5} fill={`url(#${gid}m)`} />
      <g transform={`translate(${cx - dieW * 0.2} ${cy - dieW * 0.2}) scale(${(dieW * 0.4) / 48})`} opacity={0.55}><MarkPaths shape={c.mark} c="#3d434b" /></g>
      <rect x={8} y={20} width={4} height={60} rx={2} fill={c.color} opacity={0.9} />
    </svg>
  )
}

/** CPU package: substrate, IHS, chiplets peeking through a cut-away corner, vendor mark. */
export function CpuArt({ g, width = 150 }: { g: GpuSpec; width?: number }) {
  const gid = useId().replace(/:/g, '')
  const c = corp(g.vendor)
  const ccds = Math.max(2, Math.min(16, Math.round((g.vcpus ?? 16) / 4)))
  const cols = Math.ceil(ccds / 2)
  return (
    <svg width={width} height={width * 0.72} viewBox="0 0 140 101" role="img" aria-label={g.name} style={{ display: 'block' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e6e8ec" /><stop offset=".5" stopColor="#aab0b8" /><stop offset="1" stopColor="#d0d4da" /></linearGradient></defs>
      <rect x={20} y={6} width={100} height={89} rx={5} fill="#2b5a3a" />
      {Array.from({ length: 18 }, (_, i) => <circle key={i} cx={25 + i * 5.3} cy={91} r={1.1} fill="#d9b25a" />)}
      <rect x={28} y={12} width={84} height={74} rx={5} fill={`url(#${gid})`} />
      <path d="M78 12 H107 A5 5 0 0 1 112 17 V46 Z" fill="#20252c" />
      {Array.from({ length: Math.min(ccds, 6) }, (_, i) => <rect key={i} x={86 + (i % 3) * 8} y={16 + Math.floor(i / 3) * 10} width={6} height={8} rx={1} fill="#5c6a8c" />)}
      <g transform="translate(38 30) scale(0.6)"><MarkPaths shape={c.mark} c="#5a616b" /></g>
      <text x={38} y={78} fontSize={8} fontWeight={700} fill="#4a5059" style={{ letterSpacing: '.08em' }}>{cols * 2} CCD · {g.vcpus} vCPU</text>
      <rect x={20} y={6} width={4} height={89} rx={2} fill={c.color} />
    </svg>
  )
}

/**
 * Engraving-style line art for The Daily Compute: ink on newsprint, hatching for shade, one muted accent per piece.
 * One illustration per news category so the lead story always has a picture.
 */
import type { NewsCategory } from '@sim/types'

const INK = 'var(--np-ink)'
const ACC = 'var(--np-accent)'
const hatch = (id: string, angle = 45, gap = 3) => (
  <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
    <line x1={0} y1={0} x2={0} y2={gap} stroke={INK} strokeWidth={0.6} />
  </pattern>
)

function Hall() {
  return (
    <svg viewBox="0 0 240 150" aria-hidden>
      <defs>{hatch('h-a', 45, 3)}{hatch('h-b', -45, 4)}</defs>
      <path d="M20 118 L120 140 L220 118 L120 96 Z" fill="none" stroke={INK} strokeWidth={1} />
      {[0, 1, 2, 3].map((i) => {
        const x = 52 + i * 34, y = 100 + i * 4
        return (
          <g key={i}>
            <path d={`M${x} ${y} l18 4 v-46 l-18 -4 Z`} fill="url(#h-a)" stroke={INK} strokeWidth={0.9} />
            <path d={`M${x + 18} ${y + 4} l10 -3 v-46 l-10 3 Z`} fill="url(#h-b)" stroke={INK} strokeWidth={0.9} />
            <path d={`M${x} ${y - 46} l18 4 l10 -3 l-18 -4 Z`} fill="var(--np-paper)" stroke={INK} strokeWidth={0.9} />
            {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={x + 4} cy={y - 40 + k * 8} r={1.1} fill={k === 2 ? ACC : INK} />)}
          </g>
        )
      })}
      <path d="M12 30 q30 -18 60 0 t60 0 t60 0 t40 -6" fill="none" stroke={INK} strokeWidth={0.7} strokeDasharray="2 3" />
    </svg>
  )
}
function Market() {
  const bars = [62, 70, 58, 80, 76, 92, 88, 104, 98, 112]
  return (
    <svg viewBox="0 0 240 150" aria-hidden>
      <defs>{hatch('m-a', 45, 2.6)}</defs>
      {[30, 60, 90, 120].map((y) => <line key={y} x1={16} x2={226} y1={y} y2={y} stroke={INK} strokeWidth={0.4} strokeDasharray="1 3" />)}
      {bars.map((h, i) => {
        const x = 24 + i * 20, up = i === 0 || h >= bars[i - 1]
        const top = 140 - h, bot = 140 - (i ? bars[i - 1] : h - 8)
        return (
          <g key={i}>
            <line x1={x + 5} x2={x + 5} y1={Math.min(top, bot) - 8} y2={Math.max(top, bot) + 6} stroke={INK} strokeWidth={0.8} />
            <rect x={x} y={Math.min(top, bot)} width={10} height={Math.max(3, Math.abs(bot - top))} fill={up ? 'var(--np-paper)' : 'url(#m-a)'} stroke={INK} strokeWidth={0.9} />
          </g>
        )
      })}
      <path d="M20 100 C70 90 110 70 150 50 S210 20 228 14" fill="none" stroke={ACC} strokeWidth={1.6} />
      <path d="M220 10 l9 3 l-6 7" fill="none" stroke={ACC} strokeWidth={1.6} />
    </svg>
  )
}
function Rivals() {
  return (
    <svg viewBox="0 0 240 150" aria-hidden>
      <defs>{hatch('r-a', 45, 3)}{hatch('r-b', 0, 3)}</defs>
      <path d="M10 140 H230" stroke={INK} strokeWidth={1} />
      <path d="M40 140 V52 l18 -14 l18 14 V140" fill="url(#r-a)" stroke={INK} strokeWidth={1} />
      <path d="M96 140 V24 h36 V140" fill="var(--np-paper)" stroke={INK} strokeWidth={1} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={102} x2={126} y1={36 + i * 12} y2={36 + i * 12} stroke={INK} strokeWidth={0.6} />)}
      <path d="M150 140 V70 q24 -30 48 0 V140" fill="url(#r-b)" stroke={INK} strokeWidth={1} />
      <path d="M114 24 V8 l12 4 l-12 4" fill={ACC} stroke={INK} strokeWidth={0.8} />
      <circle cx={174} cy={92} r={8} fill="var(--np-paper)" stroke={INK} />
    </svg>
  )
}
function Incident() {
  return (
    <svg viewBox="0 0 240 150" aria-hidden>
      <defs>{hatch('i-a', 60, 2.4)}</defs>
      <path d="M30 40 q20 -26 50 -10 q14 -24 44 -10 q30 -12 44 14 q26 2 22 24 H26 q-12 -10 4 -18" fill="url(#i-a)" stroke={INK} strokeWidth={1} />
      <path d="M118 62 l-16 34 h16 l-12 38 l34 -48 h-18 l12 -24 Z" fill={ACC} stroke={INK} strokeWidth={1} />
      <path d="M190 140 l12 -70 l12 70 M196 104 h12 M193 120 h18 M184 84 h36" fill="none" stroke={INK} strokeWidth={1} />
      <path d="M20 140 H230" stroke={INK} strokeWidth={1} />
    </svg>
  )
}
function World() {
  return (
    <svg viewBox="0 0 240 150" aria-hidden>
      <defs>{hatch('w-a', 45, 3)}</defs>
      <circle cx={120} cy={75} r={60} fill="var(--np-paper)" stroke={INK} strokeWidth={1.1} />
      {[-40, -20, 0, 20, 40].map((d) => <ellipse key={d} cx={120} cy={75} rx={Math.abs(Math.cos(d / 60)) * 60 * (1 - Math.abs(d) / 70)} ry={60} fill="none" stroke={INK} strokeWidth={0.5} />)}
      {[-36, -12, 12, 36].map((y) => <line key={y} x1={120 - Math.sqrt(3600 - y * y)} x2={120 + Math.sqrt(3600 - y * y)} y1={75 + y} y2={75 + y} stroke={INK} strokeWidth={0.5} />)}
      <path d="M86 52 q14 -10 26 0 q8 14 -6 22 q-16 4 -20 -8 Z M128 86 q16 -6 24 6 q-4 16 -18 14 q-10 -8 -6 -20 Z" fill="url(#w-a)" stroke={INK} strokeWidth={0.8} />
      <circle cx={140} cy={62} r={3} fill={ACC} />
      <path d="M140 62 q30 -30 70 -36" fill="none" stroke={ACC} strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  )
}

export function PaperArt({ category }: { category: NewsCategory }) {
  switch (category) {
    case 'market': return <Market />
    case 'rivals': return <Rivals />
    case 'incident': return <Incident />
    case 'world': return <World />
    default: return <Hall />
  }
}

import { AbsoluteFill, Easing, Sequence, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion'
import { Glyph, type LogoGlyph } from '../art/Logos'

export type TrailerStyle = 'hype' | 'documentary' | 'glitch'
export interface TrailerProps {
  style: TrailerStyle; company: string; glyph: string; color: string; ceo: string
  lines: string[]            // narrative cards
  stats: { label: string; value: string }[]
  closer: string
}
export const TRAILER_FRAMES = 600
const font = "'Space Grotesk Variable', 'Inter Variable', sans-serif"
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const E = Easing.bezier(0.16, 1, 0.3, 1)

const THEME: Record<TrailerStyle, { bg: string; fg: string; dur: number }> = {
  hype: { bg: '#0f1220', fg: '#ffffff', dur: 45 },
  documentary: { bg: '#f3efe7', fg: '#22201c', dur: 75 },
  glitch: { bg: '#050608', fg: '#b7ff5a', dur: 40 }
}

function Card({ text, style, i }: { text: string; style: TrailerStyle; i: number }) {
  const f = useCurrentFrame()
  const t = THEME[style]
  const jitter = style === 'glitch' ? (random(`g${i}-${Math.floor(f / 2)}`) - 0.5) * interpolate(f, [0, 8, 14], [40, 12, 0], clamp) : 0
  return (
    <AbsoluteFill style={{ background: t.bg, color: t.fg, fontFamily: font, alignItems: 'center', justifyContent: 'center', padding: 160, textAlign: 'center' }}>
      <div style={{
        fontSize: style === 'documentary' ? 74 : 104, fontWeight: style === 'documentary' ? 500 : 750, letterSpacing: '-0.04em', lineHeight: 1.05,
        fontStyle: style === 'documentary' ? 'italic' : 'normal',
        opacity: interpolate(f, [0, style === 'documentary' ? 20 : 6, t.dur - 8, t.dur], [0, 1, 1, 0], clamp),
        scale: style === 'hype' ? interpolate(f, [0, t.dur], [1.15, 1], { ...clamp, easing: E }) : 1,
        translate: `${jitter}px 0px`,
        textShadow: style === 'glitch' ? `${-jitter / 3}px 0 #ff2a6d, ${jitter / 3}px 0 #05d9e8` : 'none'
      }}>{text}</div>
    </AbsoluteFill>
  )
}
function StatWall({ stats, style }: TrailerProps) {
  const f = useCurrentFrame()
  const t = THEME[style]
  return (
    <AbsoluteFill style={{ background: t.bg, color: t.fg, fontFamily: font, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', padding: 140, gap: 60, alignContent: 'center' }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ opacity: interpolate(f, [i * 8, i * 8 + 12], [0, 1], clamp), translate: interpolate(f, [i * 8, i * 8 + 30], ['0px 50px', '0px 0px'], { ...clamp, easing: E }) }}>
          <div style={{ fontSize: 110, fontWeight: 750, letterSpacing: '-0.05em' }}>{s.value}</div>
          <div style={{ fontSize: 34, opacity: 0.6 }}>{s.label}</div>
        </div>
      ))}
    </AbsoluteFill>
  )
}
function Slam({ company, glyph, color, closer, style }: TrailerProps) {
  const f = useCurrentFrame()
  const t = THEME[style]
  return (
    <AbsoluteFill style={{ background: t.bg, color: t.fg, fontFamily: font, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ scale: interpolate(f, [0, 18], [3, 1], { ...clamp, easing: Easing.spring({ damping: 14 }) }), opacity: interpolate(f, [0, 6], [0, 1], clamp) }}><Glyph glyph={glyph as LogoGlyph} color={style === 'glitch' ? t.fg : color} size={200} /></div>
      <div style={{ fontSize: 96, fontWeight: 750, letterSpacing: '-0.045em', marginTop: 30, opacity: interpolate(f, [12, 28], [0, 1], clamp) }}>{company}</div>
      <div style={{ fontSize: 36, opacity: interpolate(f, [30, 50], [0, 0.7], clamp), marginTop: 16 }}>{closer}</div>
    </AbsoluteFill>
  )
}
export function Trailer(p: TrailerProps) {
  const { durationInFrames } = useVideoConfig()
  const d = THEME[p.style].dur
  const cards = p.lines.length * d
  return (
    <AbsoluteFill style={{ background: THEME[p.style].bg }}>
      {p.lines.map((l, i) => <Sequence key={i} from={i * d} durationInFrames={d}><Card text={l} style={p.style} i={i} /></Sequence>)}
      <Sequence from={cards} durationInFrames={120}><StatWall {...p} /></Sequence>
      <Sequence from={cards + 120} durationInFrames={Math.max(60, durationInFrames - cards - 120)}><Slam {...p} /></Sequence>
    </AbsoluteFill>
  )
}
export const trailerFrames = (p: TrailerProps): number => p.lines.length * THEME[p.style].dur + 120 + 120

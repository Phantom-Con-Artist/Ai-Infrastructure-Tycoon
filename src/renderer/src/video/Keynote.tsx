import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Glyph, type LogoGlyph } from '../art/Logos'

export interface KeynoteProps {
  company: string; glyph: string; color: string; ceo: string
  kind: 'model' | 'chip'; product: string; tagline: string; date: string
  stats: { label: string; value: number; unit: string }[]
  bars: { name: string; value: number; you: boolean }[]
  barLabel: string
}
export const KEYNOTE_FRAMES = 450
const BG = '#f6f7f9', INK = '#1d2230'
const E = Easing.bezier(0.16, 1, 0.3, 1)
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const font = "'Space Grotesk Variable', 'Inter Variable', sans-serif"

function LogoReveal({ company, glyph, color }: KeynoteProps) {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: BG, alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ scale: interpolate(f, [0, 30], [0.4, 1], { ...clamp, easing: Easing.spring({ damping: 12 }) }), opacity: interpolate(f, [0, 12], [0, 1], clamp), rotate: interpolate(f, [0, 30], ['-90deg', '0deg'], { ...clamp, easing: E }) }}>
        <Glyph glyph={glyph as LogoGlyph} color={color} size={220} />
      </div>
      <div style={{ marginTop: 36, fontSize: 84, fontWeight: 700, letterSpacing: '-0.04em', color: INK, opacity: interpolate(f, [24, 44], [0, 1], clamp), translate: interpolate(f, [24, 50], ['0px 40px', '0px 0px'], { ...clamp, easing: E }) }}>{company}</div>
    </AbsoluteFill>
  )
}
function Introducing({ product, kind, color }: KeynoteProps) {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: INK, alignItems: 'center', justifyContent: 'center', fontFamily: font, color: 'white' }}>
      <div style={{ fontSize: 40, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: interpolate(f, [0, 15], [0, 0.7], clamp) }}>Introducing</div>
      <div style={{ fontSize: 190, fontWeight: 750, letterSpacing: '-0.055em', lineHeight: 1, marginTop: 20, color, scale: interpolate(f, [8, 40], [1.4, 1], { ...clamp, easing: E }), opacity: interpolate(f, [8, 24], [0, 1], clamp), filter: `blur(${interpolate(f, [8, 30], [20, 0], clamp)}px)` }}>{product}</div>
      <div style={{ fontSize: 34, marginTop: 30, opacity: interpolate(f, [40, 60], [0, 0.75], clamp) }}>{kind === 'chip' ? 'Our most powerful accelerator. Ever.' : 'Our most capable model. Ever.'}</div>
    </AbsoluteFill>
  )
}
function Stats({ stats, color }: KeynoteProps) {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font, color: INK, padding: 120, display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, alignItems: 'center', gap: 60 }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ opacity: interpolate(f, [i * 10, i * 10 + 15], [0, 1], clamp), translate: interpolate(f, [i * 10, i * 10 + 30], ['0px 60px', '0px 0px'], { ...clamp, easing: E }) }}>
          <div style={{ fontSize: 130, fontWeight: 750, letterSpacing: '-0.05em', color: i === 0 ? color : INK, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(interpolate(f, [i * 10, i * 10 + 60], [0, s.value], { ...clamp, easing: E }))}<span style={{ fontSize: 50, marginLeft: 8 }}>{s.unit}</span>
          </div>
          <div style={{ fontSize: 34, opacity: 0.6, marginTop: 8 }}>{s.label}</div>
        </div>
      ))}
    </AbsoluteFill>
  )
}
function Bars({ bars, barLabel, color }: KeynoteProps) {
  const f = useCurrentFrame()
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font, color: INK, padding: '100px 160px', justifyContent: 'center', gap: 28 }}>
      <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 20 }}>{barLabel}</div>
      {bars.map((b, i) => (
        <div key={b.name} style={{ display: 'grid', gridTemplateColumns: '420px 1fr 200px', alignItems: 'center', gap: 30, opacity: interpolate(f, [i * 6, i * 6 + 12], [0, 1], clamp) }}>
          <div style={{ fontSize: 36, fontWeight: b.you ? 750 : 500 }}>{b.name}</div>
          <div style={{ height: 46, borderRadius: 23, background: '#e3e7ee', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 23, background: b.you ? color : '#9aa3b5', width: `${interpolate(f, [10 + i * 6, 70 + i * 6], [0, (b.value / max) * 100], { ...clamp, easing: E })}%` }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(interpolate(f, [10 + i * 6, 70 + i * 6], [0, b.value], clamp))}</div>
        </div>
      ))}
    </AbsoluteFill>
  )
}
function Outro({ ceo, tagline, date, company, glyph, color }: KeynoteProps) {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: INK, color: 'white', fontFamily: font, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 160 }}>
      <div style={{ fontSize: 66, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, opacity: interpolate(f, [0, 20], [0, 1], clamp) }}>“{tagline}”</div>
      <div style={{ fontSize: 32, marginTop: 30, opacity: interpolate(f, [15, 30], [0, 0.7], clamp) }}>— {ceo}, CEO</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 70, opacity: interpolate(f, [30, 45], [0, 1], clamp) }}><Glyph glyph={glyph as LogoGlyph} color={color} size={70} /><span style={{ fontSize: 44, fontWeight: 700 }}>{company}</span></div>
      <div style={{ fontSize: 28, marginTop: 20, opacity: interpolate(f, [40, 55], [0, 0.6], clamp) }}>Available {date}</div>
    </AbsoluteFill>
  )
}
export function Keynote(p: KeynoteProps) {
  const { fps } = useVideoConfig()
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Sequence durationInFrames={3 * fps}><LogoReveal {...p} /></Sequence>
      <Sequence from={3 * fps} durationInFrames={3 * fps}><Introducing {...p} /></Sequence>
      <Sequence from={6 * fps} durationInFrames={3.5 * fps}><Stats {...p} /></Sequence>
      <Sequence from={9.5 * fps} durationInFrames={3 * fps}><Bars {...p} /></Sequence>
      <Sequence from={12.5 * fps}><Outro {...p} /></Sequence>
    </AbsoluteFill>
  )
}
function fmt(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e4) return (n / 1e3).toFixed(0) + 'k'
  return n >= 100 ? n.toFixed(0) : n.toFixed(1)
}

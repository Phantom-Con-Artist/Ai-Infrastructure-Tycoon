/** Parody corp marks + a player logo builder. All original geometry; no real trademarks. */
export type LogoGlyph = 'hex' | 'orbit' | 'stack' | 'spark' | 'chip' | 'wave' | 'prism' | 'knot'
export const LOGO_GLYPHS: LogoGlyph[] = ['hex', 'orbit', 'stack', 'spark', 'chip', 'wave', 'prism', 'knot']
export const LOGO_COLORS = ['oklch(0.6 0.17 155)', 'oklch(0.58 0.16 255)', 'oklch(0.58 0.18 295)', 'oklch(0.66 0.17 45)', 'oklch(0.6 0.2 25)', 'oklch(0.24 0.025 265)']

export function Glyph({ glyph, color, size = 40 }: { glyph: LogoGlyph; color: string; size?: number }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 4.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      {glyph === 'hex' && <><path d="M24 4 l17 10 v20 l-17 10 -17 -10 v-20z" {...s} /><circle cx={24} cy={24} r={5} fill={color} /></>}
      {glyph === 'orbit' && <><ellipse cx={24} cy={24} rx={19} ry={8} {...s} transform="rotate(-30 24 24)" /><ellipse cx={24} cy={24} rx={19} ry={8} {...s} transform="rotate(30 24 24)" /><circle cx={24} cy={24} r={4} fill={color} /></>}
      {glyph === 'stack' && <>{[10, 20, 30].map((y, i) => <path key={y} d={`M8 ${y + 4} l16 -8 16 8 -16 8z`} {...s} opacity={1 - i * 0.25} />)}</>}
      {glyph === 'spark' && <path d="M24 4 q2 16 20 20 q-18 4 -20 20 q-2 -16 -20 -20 q18 -4 20 -20z" fill={color} />}
      {glyph === 'chip' && <><rect x={12} y={12} width={24} height={24} rx={4} {...s} /><rect x={19} y={19} width={10} height={10} rx={2} fill={color} />{[16, 24, 32].map((v) => <g key={v}><path d={`M${v} 4 v6 M${v} 38 v6 M4 ${v} h6 M38 ${v} h6`} {...s} strokeWidth={3} /></g>)}</>}
      {glyph === 'wave' && <><path d="M4 30 q10 -16 20 0 t20 0" {...s} /><path d="M4 20 q10 -16 20 0 t20 0" {...s} opacity={0.5} /></>}
      {glyph === 'prism' && <><path d="M24 5 l19 34 h-38z" {...s} /><path d="M24 5 v34 M5 39 l19 -12 19 12" {...s} strokeWidth={2.5} opacity={0.6} /></>}
      {glyph === 'knot' && <><circle cx={18} cy={20} r={10} {...s} /><circle cx={30} cy={20} r={10} {...s} /><circle cx={24} cy={30} r={10} {...s} /></>}
    </svg>
  )
}

const CORP_MARK: Record<string, { glyph: LogoGlyph; color: string }> = {
  qooqle: { glyph: 'orbit', color: 'oklch(0.58 0.16 255)' }, nicosoft: { glyph: 'stack', color: 'oklch(0.6 0.13 200)' },
  ratthropic: { glyph: 'spark', color: 'oklch(0.66 0.13 55)' }, openaye: { glyph: 'knot', color: 'oklch(0.3 0.02 265)' },
  meeta: { glyph: 'wave', color: 'oklch(0.55 0.17 265)' }, exai: { glyph: 'prism', color: 'oklch(0.3 0.02 265)' },
  deepsink: { glyph: 'wave', color: 'oklch(0.55 0.15 240)' }, mistrial: { glyph: 'stack', color: 'oklch(0.7 0.16 60)' },
  nvidious: { glyph: 'chip', color: 'oklch(0.6 0.18 140)' }, amdude: { glyph: 'prism', color: 'oklch(0.58 0.2 28)' },
  intellect: { glyph: 'hex', color: 'oklch(0.55 0.15 250)' }, amazoon: { glyph: 'wave', color: 'oklch(0.68 0.16 60)' },
  cerebros: { glyph: 'hex', color: 'oklch(0.55 0.18 300)' }, tsmc: { glyph: 'chip', color: 'oklch(0.45 0.02 265)' }
}
export function CorpLogo({ id, size = 28 }: { id: string; size?: number }) {
  const m = CORP_MARK[id] ?? { glyph: 'hex' as LogoGlyph, color: 'gray' }
  return <span style={{ display: 'inline-grid', placeItems: 'center', width: size, height: size, borderRadius: size * 0.3, background: 'var(--surface-2)', verticalAlign: 'middle' }}><Glyph glyph={m.glyph} color={m.color} size={size * 0.7} /></span>
}
/** Player word-mark: glyph + company name. */
export function WordMark({ glyph, color, name, size = 22 }: { glyph: LogoGlyph; color: string; name: string; size?: number }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.4, font: `700 ${size}px var(--display)`, letterSpacing: '-.03em' }}><Glyph glyph={glyph} color={color} size={size * 1.4} />{name}</span>
}

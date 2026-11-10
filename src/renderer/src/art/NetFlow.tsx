import { useEffect, useState, type ReactElement } from 'react'
import { archStats, type ArchSpec } from '@sim/models'
import { num } from '../format'

export type NetNode = 'embed' | 'attn' | 'ffn' | 'block' | 'head'
const INK = 'oklch(0.24 0.025 265)', BLUE = 'oklch(0.58 0.16 255)', GREEN = 'oklch(0.6 0.17 155)', VIOLET = 'oklch(0.58 0.18 295)', AMBER = 'oklch(0.7 0.15 65)'

/**
 * Animated, clickable flowchart of a decoder-only transformer.
 * Tokens flow along the edges; the MoE router re-picks its top-k experts continuously.
 */
export function NetFlow({ a, selected, onSelect }: { a: ArchSpec; selected: NetNode | null; onSelect: (n: NetNode) => void }) {
  const st = archStats(a)
  const moe = a.experts > 1
  const shownExperts = Math.min(a.experts, 48)
  const [lit, setLit] = useState<number[]>([])
  useEffect(() => {
    if (!moe) return
    const pick = (): void => { const s = new Set<number>(); while (s.size < Math.min(a.topK, shownExperts)) s.add(Math.floor(Math.random() * shownExperts)); setLit([...s]) }
    pick(); const t = setInterval(pick, 650); return () => clearInterval(t)
  }, [moe, a.topK, shownExperts])

  const W = 720, cx = W / 2
  const box = (id: NetNode | null, y: number, h: number, w: number, label: string, sub: string, color: string, extra?: ReactElement): ReactElement => {
    const on = id !== null && selected === id
    return (
      <g key={label + y} onClick={id ? () => onSelect(id) : undefined} style={{ cursor: id ? 'pointer' : 'default' }} className="nf-node">
        <rect x={cx - w / 2} y={y} width={w} height={h} rx={14} fill="white" stroke={on ? INK : color} strokeWidth={on ? 2.5 : 1.4} filter="url(#nfshadow)" />
        <rect x={cx - w / 2} y={y} width={6} height={h} rx={3} fill={color} />
        <text x={cx - w / 2 + 18} y={y + 22} fontSize={13.5} fontWeight={650} fill={INK}>{label}</text>
        <text x={cx - w / 2 + 18} y={y + 39} fontSize={11.5} fill="oklch(0.5 0.014 265)">{sub}</text>
        {extra}
      </g>
    )
  }
  // vertical layout
  const y0 = 18, yEmb = 60, yBlock = 150, yN1 = yBlock + 44, yAttn = yN1 + 52, yRes1 = yAttn + 112, yN2 = yRes1 + 38, yFfn = yN2 + 52
  const ffnH = moe ? 64 + Math.ceil(shownExperts / 16) * 22 : 80
  const yRes2 = yFfn + ffnH + 20, yBlockEnd = yRes2 + 34, yHead = yBlockEnd + 34, yOut = yHead + 84, H = yOut + 50
  const heads = Math.min(a.heads, 32), kvGroups = a.attn === 'mha' ? heads : a.attn === 'gqa' ? Math.max(1, Math.round(heads * a.kvHeads / a.heads)) : 1
  const flowPath = `M${cx},${y0 + 20} L${cx},${yOut}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 'calc(100vh - 260px)', display: 'block' }} aria-label="Neural network architecture flowchart">
      <defs>
        <filter id="nfshadow" x="-10%" y="-20%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1d2333" floodOpacity="0.08" /></filter>
        <marker id="nfarrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="oklch(0.6 0.02 265)" /></marker>
      </defs>
      {/* spine */}
      <path d={flowPath} stroke="oklch(0.8 0.01 265)" strokeWidth={2} fill="none" />
      <path d={flowPath} stroke={GREEN} strokeWidth={2.5} fill="none" strokeDasharray="3 22" className="flow" />
      {/* residual skip lines */}
      <path d={`M${cx + 230},${yN1 - 6} C${cx + 270},${yN1} ${cx + 270},${yRes1} ${cx + 18},${yRes1 + 12}`} stroke={AMBER} strokeWidth={1.6} fill="none" strokeDasharray="5 5" markerEnd="url(#nfarrow)" />
      <path d={`M${cx + 230},${yN2 - 6} C${cx + 270},${yN2} ${cx + 270},${yRes2} ${cx + 18},${yRes2 + 12}`} stroke={AMBER} strokeWidth={1.6} fill="none" strokeDasharray="5 5" markerEnd="url(#nfarrow)" />
      {/* block repeat bracket */}
      <g onClick={() => onSelect('block')} style={{ cursor: 'pointer' }}>
        <rect x={cx - 300} y={yBlock} width={600} height={yBlockEnd - yBlock} rx={22} fill={selected === 'block' ? 'oklch(0.58 0.16 255 / .07)' : 'oklch(0.58 0.16 255 / .035)'} stroke={BLUE} strokeDasharray="6 6" strokeWidth={1.3} />
        <text x={cx - 284} y={yBlock + 24} fontSize={13} fontWeight={700} fill={BLUE}>Transformer block × {a.layers}</text>
        <text x={cx - 284} y={yBlock + 40} fontSize={11.5} fill="oklch(0.5 0.014 265)">d_model {num(a.dModel)} · aspect d/L {st.aspect.toFixed(0)}</text>
        <path d={`M${cx - 300},${yBlockEnd - 20} C${cx - 340},${yBlockEnd - 20} ${cx - 340},${yBlock + 20} ${cx - 300},${yBlock + 20}`} stroke={BLUE} strokeWidth={1.6} fill="none" markerEnd="url(#nfarrow)" className="flow" strokeDasharray="4 6" />
      </g>
      {/* tokens in */}
      <g>{['The', 'cat', 'sat', 'on', '…'].map((t, i) => <g key={t}><rect x={cx - 120 + i * 50} y={y0} width={44} height={22} rx={11} fill="oklch(0.95 0.006 250)" /><text x={cx - 98 + i * 50} y={y0 + 15} fontSize={11} textAnchor="middle" fill={INK}>{t}</text></g>)}</g>
      {box('embed', yEmb, 54, 300, 'Token embedding', `${a.vocabK}k vocab × ${num(a.dModel)} = ${num(st.embedB * 1e9)} params`, VIOLET)}
      {box(null, yN1, 34, 220, 'RMSNorm', '', 'oklch(0.75 0.01 265)')}
      {box('attn', yAttn, 96, 440, a.attn === 'mla' ? 'Multi-head latent attention' : a.attn === 'gqa' ? 'Grouped-query attention' : 'Multi-head attention', `${a.heads} heads · ${a.attn === 'mha' ? a.heads : a.kvHeads} KV · ctx ${num(a.ctxK)}k · ${num(st.attnPerLayer)} params/layer`, BLUE,
        <g>{Array.from({ length: heads }, (_, i) => { const g = Math.floor(i / Math.max(1, heads / kvGroups)); return <rect key={i} x={cx - 200 + i * (400 / heads)} y={yAttn + 52} width={400 / heads - 3} height={30} rx={3} fill={`oklch(${0.62 + (g % 4) * 0.07} 0.13 ${235 + g * 18})`} className="node" style={{ animationDelay: `${(i * 0.09) % 2}s` }} /> })}
          {a.attn === 'mla' && <path d={`M${cx - 200},${yAttn + 90} L${cx},${yAttn + 84} L${cx + 200},${yAttn + 90}`} stroke={VIOLET} fill="none" strokeWidth={1.5} />}</g>)}
      <circle cx={cx} cy={yRes1 + 12} r={11} fill="white" stroke={AMBER} strokeWidth={1.6} /><text x={cx} y={yRes1 + 17} textAnchor="middle" fontSize={14} fill={AMBER} fontWeight={700}>+</text>
      {box(null, yN2, 34, 220, 'RMSNorm', '', 'oklch(0.75 0.01 265)')}
      {box('ffn', yFfn, ffnH, 520, moe ? `Mixture of ${num(a.experts)} experts · top-${a.topK}${a.shared ? ` + ${a.shared} shared` : ''}` : 'SwiGLU feed-forward', moe ? `router picks ${a.topK} experts per token · ${num(st.ffnPerLayer)} params/layer` : `hidden ${num(a.ffnMult * a.dModel)} · ${num(st.ffnPerLayer)} params/layer`, GREEN,
        moe ? <g>{Array.from({ length: shownExperts }, (_, i) => { const on = lit.includes(i); return <rect key={i} x={cx - 240 + (i % 16) * 30} y={yFfn + 52 + Math.floor(i / 16) * 22} width={26} height={17} rx={4} fill={on ? GREEN : 'oklch(0.93 0.01 150)'} stroke={on ? 'oklch(0.45 0.15 155)' : 'none'} style={{ transition: 'fill .25s' }} /> })}
          {Array.from({ length: a.shared }, (_, i) => <rect key={'s' + i} x={cx + 250 - 34} y={yFfn + 10 + i * 12} width={28} height={9} rx={3} fill={AMBER} />)}
          {a.experts > shownExperts && <text x={cx + 245} y={yFfn + ffnH - 10} fontSize={11} textAnchor="end" fill="oklch(0.5 0.014 265)">+{num(a.experts - shownExperts)} more</text>}</g>
          : <g>{[0, 1, 2].map((i) => <rect key={i} x={cx - 200 + i * 140} y={yFfn + 50} width={120} height={20} rx={5} fill={['oklch(0.85 0.08 150)', 'oklch(0.8 0.1 150)', 'oklch(0.75 0.12 150)'][i]} className="node" style={{ animationDelay: `${i * .3}s` }} />)}</g>)}
      <circle cx={cx} cy={yRes2 + 12} r={11} fill="white" stroke={AMBER} strokeWidth={1.6} /><text x={cx} y={yRes2 + 17} textAnchor="middle" fontSize={14} fill={AMBER} fontWeight={700}>+</text>
      {box('head', yHead, 54, 300, 'LM head → softmax', `predicts the next of ${a.vocabK}k tokens`, VIOLET)}
      <g><rect x={cx - 40} y={yOut} width={80} height={24} rx={12} fill={INK} /><text x={cx} y={yOut + 16} fontSize={11.5} textAnchor="middle" fill="white" fontWeight={600}>“the mat”</text></g>
      {/* travelling tokens */}
      {[0, 1, 2, 3].map((i) => <circle key={i} r={4.5} fill={GREEN}><animateMotion dur="3.2s" begin={`${i * 0.8}s`} repeatCount="indefinite" path={flowPath} /></circle>)}
    </svg>
  )
}

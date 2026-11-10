import { useMemo, useState } from 'react'
import { Player } from '@remotion/player'
import { Clapperboard, Mic2, Sparkles } from 'lucide-react'
import { corp } from '@sim/data/lore'
import { holdKeynote, keynoteCost, richList, domination } from '@sim/corporate'
import { evaluateChip } from '@sim/silicon'
import { gpuCatalog } from '@sim/data/hardware'
import { valuation } from '@sim/world'
import { totalGpus, yearOf } from '@sim/util'
import { dateOf, money, num } from '../format'
import { useGame, useWorld } from '../store'
import { EmptyState, Tabs } from '../ui'
import { Keynote, KEYNOTE_FRAMES, type KeynoteProps } from '../video/Keynote'
import { Trailer, trailerFrames, type TrailerProps, type TrailerStyle } from '../video/Trailer'
import { EmptyDealsArt } from '../art/Illustrations'

export function Studio() {
  const [tab, setTab] = useState<'keynotes' | 'trailers'>('keynotes')
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">Media studio</div><h1>Lights, camera, hype</h1></div><Tabs tabs={['keynotes', 'trailers'] as const} value={tab} onChange={setTab} /></div>
      {tab === 'keynotes' ? <Keynotes /> : <Trailers />}
    </>
  )
}

const playerStyle: React.CSSProperties = { width: '100%', aspectRatio: '16 / 9', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--sh-2)' }

function Keynotes() {
  const w = useWorld(); const act = useGame((s) => s.act); const go = useGame((s) => s.go)
  const products = [
    ...w.models.filter((m) => m.releasedByPlayer && !m.subsidiary).map((m) => ({ key: 'm:' + m.id, kind: 'model' as const, id: m.id, name: m.name, hype: m.hype ?? 0 })),
    ...w.silicon.designs.filter((d) => d.status === 'ready').map((d) => ({ key: 'c:' + d.id, kind: 'chip' as const, id: d.id, name: d.spec.name, hype: d.hype ?? 0 }))
  ]
  const [sel, setSel] = useState(products[0]?.key ?? '')
  const p = products.find((x) => x.key === sel) ?? products[0]
  const props = useMemo<KeynoteProps | null>(() => {
    if (!p) return null
    const base = { company: w.company, glyph: w.logo.glyph, color: resolve(w.logo.color), ceo: w.ceo, product: p.name, date: dateOf(w.tick), kind: p.kind }
    if (p.kind === 'model') {
      const m = w.models.find((x) => x.id === p.id)!
      const bars = [...w.competitors.slice().sort((a, b) => b.elo - a.elo).slice(0, 4).map((c) => ({ name: c.name, value: c.elo, you: false })), { name: m.name, value: m.elo, you: true }].sort((a, b) => b.value - a.value)
      return { ...base, tagline: m.elo > Math.max(...w.competitors.map((c) => c.elo)) ? 'The smartest model on Earth. Today.' : 'Smarter than yesterday. Cheaper than tomorrow.', barLabel: 'Arena Elo',
        stats: [{ label: 'Arena Elo', value: Math.round(m.elo), unit: '' }, { label: 'parameters', value: (m.paramsB || 1) * 1e9, unit: '' }, { label: 'per million tokens', value: m.priceMtok, unit: '$' }], bars }
    }
    const d = w.silicon.designs.find((x) => x.id === p.id)!
    const e = evaluateChip(d.spec, yearOf(w.tick))
    const rivals = gpuCatalog(yearOf(w.tick)).sort((a, b) => b.tflops - a.tflops).slice(0, 4)
    return { ...base, tagline: 'The more you buy, the more you… you know the rest.', barLabel: 'Dense BF16 TFLOPS',
      stats: [{ label: 'TFLOPS', value: e.tflops, unit: '' }, { label: 'transistors', value: e.transistorsB * 1e9, unit: '' }, { label: 'GB of HBM', value: e.memGB, unit: '' }],
      bars: [...rivals.map((g) => ({ name: g.name, value: g.tflops, you: false })), { name: d.spec.name, value: e.tflops, you: true }].sort((a, b) => b.value - a.value) }
  }, [p?.key, w.tick - (w.tick % 24)])
  if (!p || !props) return <EmptyState art={<EmptyDealsArt />} eyebrow="Nothing to announce" title="Ship something worth a keynote." body="Launch a model in the Lab or get first silicon from a chip, then come back to unveil it. Keynotes cost money but pour hype onto your product: demand jumps, then slowly cools."><button className="btn pri" onClick={() => go('lab')}>Open Lab</button></EmptyState>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>
      <Player component={Keynote as unknown as React.ComponentType<Record<string, unknown>>} inputProps={props as unknown as Record<string, unknown>} durationInFrames={KEYNOTE_FRAMES} fps={30} compositionWidth={1920} compositionHeight={1080} controls autoPlay loop style={playerStyle} />
      <div className="col" style={{ gap: 10 }}>
        <h3>Products</h3>
        {products.map((x) => <button key={x.key} className={'adv' + (x.key === p.key ? ' on' : '')} style={{ gridTemplateColumns: '1fr' }} onClick={() => setSel(x.key)}><b>{x.name}</b><span>{x.kind === 'model' ? 'AI model' : 'Chip'} · hype +{(x.hype * 100).toFixed(0)}%</span></button>)}
        <button className="btn pri" onClick={() => act((ww) => holdKeynote(ww, p.kind, p.id), 'Keynote delivered — hype rising')}><Mic2 size={14} /> Hold keynote · {money(keynoteCost(w))}</button>
        <p className="dim" style={{ fontSize: 12.5 }}>Each keynote adds demand hype that decays ~2.5% per day. The audience gets a little more tired every time.</p>
      </div>
    </div>
  )
}

const STYLES: { id: TrailerStyle; name: string; blurb: string }[] = [
  { id: 'hype', name: 'Hype', blurb: 'Big type, fast cuts, dark stage.' },
  { id: 'documentary', name: 'Documentary', blurb: 'Warm paper, slow italics, gravitas.' },
  { id: 'glitch', name: 'Glitch', blurb: 'Neon, RGB split, chaos.' }
]
function Trailers() {
  const w = useWorld()
  const [style, setStyle] = useState<TrailerStyle>('hype')
  const [seed, setSeed] = useState(1)
  const props = useMemo<TrailerProps>(() => {
    const d = domination(w)
    const best = w.models.filter((m) => m.releasedByPlayer).sort((a, b) => b.elo - a.elo)[0]
    const rich = richList(w).findIndex((r) => r.you) + 1
    const pool = [
      'In a world running out of electricity…', `one company bought ${num(totalGpus(w))} GPUs.`, `${w.ceo} had a dream.`,
      best ? `They built ${best.name}.` : 'They had not built a model yet.', `They poured concrete in ${w.sites.length || 'zero'} places.`,
      d.index > 0.5 ? 'The world noticed.' : 'The world did not notice. Yet.', `${corp('nvidious').ceo} is nervous.`, 'This summer…', 'Compute is destiny.'
    ]
    const pick = (i: number): string => pool[(i * 7 + seed * 3) % pool.length]
    return {
      style, company: w.company, glyph: w.logo.glyph, color: resolve(w.logo.color), ceo: w.ceo,
      lines: [pick(0), pick(1), pick(2), pick(3)],
      stats: [{ label: 'valuation', value: money(valuation(w)) }, { label: 'GPUs', value: num(totalGpus(w)) }, { label: 'world domination', value: `${(d.index * 100).toFixed(1)}%` }, { label: 'on the rich list', value: `#${rich}` }],
      closer: d.stage
    }
  }, [style, seed, w.tick - (w.tick % (24 * 7))])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>
      <Player key={style + seed} component={Trailer as unknown as React.ComponentType<Record<string, unknown>>} inputProps={props as unknown as Record<string, unknown>} durationInFrames={trailerFrames(props)} fps={30} compositionWidth={1920} compositionHeight={1080} controls autoPlay loop style={playerStyle} />
      <div className="col" style={{ gap: 10 }}>
        <h3>Template</h3>
        {STYLES.map((s) => <button key={s.id} className={'adv' + (style === s.id ? ' on' : '')} style={{ gridTemplateColumns: '1fr' }} onClick={() => setStyle(s.id)}><b>{s.name}</b><span>{s.blurb}</span></button>)}
        <button className="btn pri" onClick={() => setSeed((x) => x + 1)}><Sparkles size={14} /> Remix trailer</button>
        <p className="dim" style={{ fontSize: 12.5 }}><Clapperboard size={12} /> Generated from your actual company: GPUs, models, valuation, rank. Record your screen to share it.</p>
      </div>
    </div>
  )
}

/** Remotion renders on its own canvas; resolve CSS oklch() tokens to plain colours. */
function resolve(c: string): string {
  if (typeof document === 'undefined') return c
  const el = document.createElement('div'); el.style.color = c; document.body.appendChild(el)
  const v = getComputedStyle(el).color; el.remove(); return v
}

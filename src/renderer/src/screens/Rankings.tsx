import { useState } from 'react'
import { Crown } from 'lucide-react'
import { CORPS, corp } from '@sim/data/lore'
import { acquire, acquisitionPrice, richList } from '@sim/corporate'
import { EVALS, RIVAL_MIX, evalScore } from '@sim/models'
import { valuation } from '@sim/world'
import { hasTech } from '@sim/util'
import { money } from '../format'
import { useGame, useWorld } from '../store'
import { Summary, Tabs } from '../ui'
import { CorpLogo, WordMark, type LogoGlyph } from '../art/Logos'
import { Portrait } from '../art/People'
import * as PV from '@sim/preview'
import * as Sum from '../summaries'

const TABS = ['models', 'labs', 'evals', 'companies', 'rich list'] as const

export function Rankings() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('models')
  const w = useWorld()
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">Leaderboards</div><h1>Who is winning the AI race</h1></div><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>
      <Summary items={Sum.rankingsSummary(w)} />
      {tab === 'models' && <Models />}
      {tab === 'labs' && <Labs />}
      {tab === 'evals' && <Evals />}
      {tab === 'companies' && <Companies />}
      {tab === 'rich list' && <Rich />}
    </>
  )
}

const Me = () => { const w = useWorld(); return <span style={{ display: 'inline-grid', placeItems: 'center', width: 28, height: 28, borderRadius: 9, background: 'var(--surface-2)' }}><WordMark glyph={w.logo.glyph as LogoGlyph} color={w.logo.color} name="" size={13} /></span> }
const Rank = ({ i }: { i: number }) => <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: 99, fontWeight: 700, fontSize: 12.5, background: i === 0 ? 'oklch(0.85 0.14 85)' : i === 1 ? 'oklch(0.88 0.01 250)' : i === 2 ? 'oklch(0.78 0.08 55)' : 'var(--surface-2)' }}>{i + 1}</span>

function Models() {
  const w = useWorld()
  const rows = [
    ...w.competitors.map((c) => ({ name: c.name, corp: c.corp, who: corp(c.corp).name, elo: c.elo, price: c.priceMtok, share: 0, you: false })),
    ...w.models.filter((m) => m.releasedByPlayer).map((m) => ({ name: m.name, corp: '', who: m.subsidiary ? `${w.company} (via ${corp(m.subsidiary).name})` : w.company, elo: m.elo, price: m.priceMtok, share: m.share, you: true }))
  ].sort((a, b) => b.elo - a.elo)
  const top = rows[0]?.elo ?? 1
  return <div className="panel" style={{ padding: 8 }}><table><thead><tr><th style={{ width: 40 }} /><th>Model</th><th>Arena Elo</th><th className="r">$ / Mtok</th></tr></thead><tbody>
    {rows.map((r, i) => <tr key={r.name + i} style={r.you ? { background: 'var(--accent-soft)' } : undefined}><td><Rank i={i} /></td>
      <td><span className="row" style={{ gap: 10 }}>{r.you ? <Me /> : <CorpLogo id={r.corp} />}<span><b style={{ fontWeight: 600 }}>{r.name}</b><div className="dim" style={{ fontSize: 12 }}>{r.who}</div></span></span></td>
      <td style={{ width: '40%' }}><div className="row" style={{ gap: 10 }}><div className="bar" style={{ flex: 1 }}><i style={{ width: `${Math.max(4, (r.elo - 1000) / (top - 1000) * 100)}%`, background: r.you ? 'var(--accent)' : 'var(--blue)' }} /></div><b style={{ width: 44, textAlign: 'right' }}>{Math.round(r.elo)}</b></div></td>
      <td className="r">${r.price.toFixed(2)}</td></tr>)}
  </tbody></table></div>
}

function Labs() {
  const w = useWorld()
  const labs = CORPS.filter((c) => c.kind === 'lab' || c.kind === 'both').map((c) => {
    const r = w.rivals.find((x) => x.id === c.id)!
    const m = w.competitors.find((x) => x.corp === c.id)
    return { id: c.id, name: c.name, ceo: c.ceo, quip: c.quip, best: m?.elo ?? 0, model: m?.name ?? (r.owned ? 'acquired' : '—'), val: r.valuation, owned: r.owned, you: false }
  })
  const mine = w.models.filter((m) => m.releasedByPlayer).sort((a, b) => b.elo - a.elo)[0]
  labs.push({ id: 'you', name: w.company, ceo: w.ceo, quip: 'You.', best: mine?.elo ?? 0, model: mine?.name ?? 'no model yet', val: valuation(w), owned: false, you: true })
  return <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
    {labs.sort((a, b) => b.best - a.best).map((l, i) => <div key={l.id} className="panel col" style={{ gap: 10, background: l.you ? 'var(--accent-soft)' : undefined, opacity: l.owned ? 0.55 : 1 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="row" style={{ gap: 10 }}><Rank i={i} />{l.you ? <Me /> : <CorpLogo id={l.id} size={30} />}<b>{l.name}</b></span>{l.owned && <span className="tag g">yours</span>}</div>
      <div className="row" style={{ gap: 10 }}><span style={{ borderRadius: 12, overflow: 'hidden' }}><Portrait seed={l.ceo} size={40} jacket={l.id === 'nvidious'} /></span><div><b style={{ fontSize: 13 }}>{l.ceo}</b><div className="dim" style={{ fontSize: 12 }}>“{l.quip}”</div></div></div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Best: <b>{l.model}</b></span><span>Elo <b>{Math.round(l.best)}</b></span></div>
      <div className="dim" style={{ fontSize: 12.5 }}>Valuation {money(l.val)}</div>
    </div>)}
  </div>
}

function Evals() {
  const w = useWorld()
  const rows = [
    ...w.competitors.map((c) => ({ name: c.name, corp: c.corp, evals: Object.fromEntries(EVALS.map((e) => [e.id, evalScore(e, c.elo, RIVAL_MIX, Math.max(0, w.tick / 8766 - 1.5))])), you: false })),
    ...w.models.filter((m) => m.evals).map((m) => ({ name: m.name, corp: '', evals: m.evals!, you: true }))
  ]
  return <div className="col" style={{ gap: 14 }}>{EVALS.map((e) => {
    const sorted = [...rows].sort((a, b) => (b.evals[e.id] ?? 0) - (a.evals[e.id] ?? 0)).slice(0, 6)
    return <div key={e.id} className="panel"><div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><h3>{e.name}</h3><span className="dim" style={{ fontSize: 12.5 }}>{e.parody}</span></div>
      {sorted.map((r, i) => <div key={r.name + i} style={{ display: 'grid', gridTemplateColumns: '30px 28px 200px 1fr 48px', gap: 10, alignItems: 'center', padding: '4px 0' }}><Rank i={i} />{r.you ? <Me /> : <CorpLogo id={r.corp} size={24} />}<span style={{ fontWeight: r.you ? 650 : 500, fontSize: 13 }}>{r.name}</span><div className="bar"><i style={{ width: `${r.evals[e.id] ?? 0}%`, background: r.you ? 'var(--accent)' : 'var(--blue)' }} /></div><b style={{ textAlign: 'right' }}>{(r.evals[e.id] ?? 0).toFixed(1)}</b></div>)}
    </div>
  })}</div>
}

function Companies() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const canBuy = hasTech(w, 'm-and-a')
  const rows = [...w.rivals.map((r) => ({ ...r, name: corp(r.id).name, kind: corp(r.id).kind, you: false })), { id: 'you', name: w.company, kind: 'you', valuation: valuation(w), revenue: 0, margin: 0, ceoStake: w.founderStake, owned: false, you: true }]
    .sort((a, b) => b.valuation - a.valuation)
  return <>
    {!canBuy && <div className="panel row" style={{ marginBottom: 12, background: 'var(--blue-soft)', boxShadow: 'none' }}><Crown size={18} /><span>Research <b>IPO readiness → M&A desk</b> in Business R&D to start buying rivals. Mega-deals may be blocked by regulators.</span></div>}
    <div className="panel" style={{ padding: 8 }}><table><thead><tr><th style={{ width: 40 }} /><th>Company</th><th>Type</th><th className="r">Market cap</th><th className="r">Revenue</th><th className="r" /></tr></thead><tbody>
      {rows.map((r, i) => <tr key={r.id} style={r.you ? { background: 'var(--accent-soft)' } : undefined}><td><Rank i={i} /></td>
        <td><span className="row" style={{ gap: 10 }}>{r.you ? <Me /> : <CorpLogo id={r.id} />}<b style={{ fontWeight: 600 }}>{r.name}</b>{r.owned && <span className="tag g">subsidiary</span>}</span></td>
        <td className="dim" style={{ textTransform: 'capitalize' }}>{r.kind}</td><td className="r"><b>{money(r.valuation)}</b></td><td className="r dim">{r.you ? '' : money(r.revenue)}</td>
        <td className="r">{!r.you && !r.owned && <button className="btn sm" disabled={!canBuy} onClick={() => void useGame.getState().confirmAct(`Acquire ${r.name}?`, PV.previewAcquire(w, r.id), 'Acquire', (x) => acquire(x, r.id))}>Acquire · {money(acquisitionPrice(w, r.id))}</button>}</td></tr>)}
    </tbody></table></div>
  </>
}

function Rich() {
  const w = useWorld()
  const list = richList(w)
  return <div className="panel" style={{ padding: 8 }}><table><tbody>
    {list.map((p, i) => <tr key={p.name} style={p.you ? { background: 'var(--accent-soft)' } : undefined}><td style={{ width: 40 }}><Rank i={i} /></td>
      <td style={{ width: 52 }}><span style={{ display: 'block', borderRadius: 12, overflow: 'hidden', width: 40 }}><Portrait seed={p.name} size={40} jacket={p.corp === 'nvidious'} /></span></td>
      <td><b style={{ fontWeight: 650 }}>{p.name}{p.you ? ' (you)' : ''}</b>{p.you && w.rules.mode === 'sandbox' && <span className="tag sandbox" style={{ marginLeft: 6 }}>sandbox · unofficial</span>}<div className="dim" style={{ fontSize: 12.5 }}>{p.source}</div></td>
      <td className="r"><b style={{ fontSize: 16 }}>{money(p.worth)}</b></td></tr>)}
  </tbody></table></div>
}

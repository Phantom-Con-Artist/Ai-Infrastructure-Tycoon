import { useState } from 'react'
import { KeyRound, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import * as S from '@sim/store'
import { dateOf, money, num } from '../format'
import { useGame, useWorld } from '../store'
import { EmptyState, Field, Num, Summary } from '../ui'
import { EmptyLabArt } from '../art/Illustrations'
import * as PV from '@sim/preview'
import * as Sum from '../summaries'

const CAT_ICON: Record<S.Category, string> = { chat: '💬', coding: '⌨️', creative: '🎨', companion: '🫶', enterprise: '🏢', api: '🔑' }

export function Store() {
  const w = useWorld(); const go = useGame((s) => s.go)
  const [sel, setSel] = useState<string | 'new' | null>(w.products[0]?.id ?? null)
  const launched = w.models.filter((m) => m.releasedByPlayer)
  if (!launched.length) return <EmptyState art={<EmptyLabArt />} eyebrow="Store · nothing to sell" title="Products need a brain." body="Every chat app, coding agent and API platform here runs on one of your launched models, served by your GPUs. Train and launch a model in the Lab, deploy it on some servers, then come back to package it into products with Free, Plus and Pro plans."><button className="btn pri" onClick={() => go('lab')}>Open Lab</button></EmptyState>
  const product = w.products.find((p) => p.id === sel)
  return (
    <>
    <Summary items={Sum.storeSummary(w)} />
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 18, alignItems: 'start' }}>
      <div className="col" style={{ gap: 14, position: 'sticky', top: 0 }}>
        <button className="btn pri" onClick={() => setSel('new')}><Plus size={14} /> New product</button>
        {(Object.keys(S.CATEGORIES) as S.Category[]).map((c) => { const ps = w.products.filter((p) => p.category === c); if (!ps.length) return null; return (
          <div key={c} className="col" style={{ gap: 4 }}><div className="dim" style={{ fontSize: 12, fontWeight: 650 }}>{CAT_ICON[c]} {S.CATEGORIES[c].name}</div>
            {ps.map((p) => { const h = p.history.at(-1); return <button key={p.id} className={'adv' + (sel === p.id ? ' on' : '')} style={{ gridTemplateColumns: '1fr' }} onClick={() => setSel(p.id)}><b>{p.name}</b><span>{num(h?.users ?? 0)} users · {money(h?.mrr ?? 0)} MRR</span></button> })}
          </div>) })}
      </div>
      {sel === 'new' || !product ? <NewProduct onDone={(id) => setSel(id)} /> : product.category === 'api' ? <ApiConsole id={product.id} /> : <Dashboard id={product.id} />}
    </div>
    </>
  )
}

function NewProduct({ onDone }: { onDone: (id: string) => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const models = w.models.filter((m) => m.releasedByPlayer)
  const [cat, setCat] = useState<S.Category>('chat')
  const [modelId, setModel] = useState(models[0]?.id ?? '')
  const [name, setName] = useState(`${models[0]?.name ?? 'My'} Chat`)
  return (
    <div className="panel col" style={{ gap: 16 }}>
      <div className="eyebrow">New product</div><h2 style={{ fontSize: 26, fontFamily: 'var(--display)', margin: 0 }}>What are you shipping?</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {(Object.keys(S.CATEGORIES) as S.Category[]).map((c) => { const C = S.CATEGORIES[c]; return <button key={c} className={'adv' + (cat === c ? ' on' : '')} style={{ gridTemplateColumns: '36px 1fr' }} onClick={() => { setCat(c); setName(`${models.find((m) => m.id === modelId)?.name ?? 'My'} ${C.name.split(' ')[0]}`) }}><span style={{ fontSize: 26, gridRow: 'span 2' }}>{CAT_ICON[c]}</span><b>{C.name}</b><span>{C.blurb}</span></button> })}
      </div>
      <div className="row">
        <Field label="Product name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Powered by"><select value={modelId} onChange={(e) => setModel(e.target.value)}>{models.map((m) => <option key={m.id} value={m.id}>{m.name} · Elo {Math.round(m.elo)}</option>)}</select></Field>
      </div>
      <div className="dim" style={{ fontSize: 13 }}>Market: {num(S.CATEGORIES[cat].tam0)} people · willingness to pay ≈ ${S.CATEGORIES[cat].wtp}/mo · churn ≈ {(S.CATEGORIES[cat].churnMonthly * 100).toFixed(1)}%/mo. Traffic is served by {models.find((m) => m.id === modelId)?.name}'s deployments, so make sure it has GPUs.</div>
      <div><button className="btn pri" onClick={() => { void useGame.getState().confirmAct(`Launch ${name}?`, PV.previewSpend(w, cat === 'enterprise' ? 5e6 : 1e6), 'Launch', (x) => S.createProduct(x, { name, category: cat, modelId }), { okMsg: 'Product launched' }).then((r) => { if (r?.ok) onDone(r.value.id) }) }}><ShoppingBag size={14} /> Launch · {money(cat === 'enterprise' ? 5e6 : 1e6)}</button></div>
    </div>
  )
}

function Kpi({ k, v, sub, bad }: { k: string; v: string; sub?: string; bad?: boolean }) {
  return <div className="panel" style={{ padding: '12px 14px' }}><div className="dim" style={{ fontSize: 12 }}>{k}</div><div style={{ fontSize: 21, fontWeight: 650, letterSpacing: '-.02em', color: bad ? 'var(--red)' : undefined }}>{v}</div>{sub && <div className="dim" style={{ fontSize: 11.5 }}>{sub}</div>}</div>
}

/** Multi-series line chart with hover readout. */
export function LineChart({ series, height = 170, fmt = num }: { series: { name: string; color: string; data: number[]; dash?: boolean }[]; height?: number; fmt?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const n = Math.max(...series.map((s) => s.data.length), 2)
  const max = Math.max(1, ...series.flatMap((s) => s.data))
  const W = 600, H = height, pad = 6
  const x = (i: number): number => pad + (i / (n - 1)) * (W - 2 * pad)
  const y = (v: number): number => H - pad - (v / max) * (H - 2 * pad - 14)
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1))))) }}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={0} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" />)}
        {series.filter((s) => s.data.length >= 2).map((s) => <g key={s.name}>
          <path d={`M${s.data.map((v, i) => `${x(i)},${y(v)}`).join(' L')} L${x(s.data.length - 1)},${H} L${x(0)},${H}Z`} fill={s.color} opacity={s.dash ? 0 : 0.08} />
          <polyline points={s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash ? '5 4' : undefined} vectorEffect="non-scaling-stroke" />
        </g>)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--tx-4)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="row" style={{ gap: 14, fontSize: 12, marginTop: 4 }}>{series.map((s) => <span key={s.name}><i style={{ display: 'inline-block', width: 10, height: 3, background: s.color, marginRight: 6, verticalAlign: 3 }} />{s.name}{hover !== null && s.data[hover] !== undefined ? `: ${fmt(s.data[hover])}` : ''}</span>)}</div>
    </div>
  )
}

function Dashboard({ id }: { id: string }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const p = w.products.find((x) => x.id === id)!
  const m = w.models.find((x) => x.id === p.modelId)
  const h = p.history.slice(-90)
  const last = h.at(-1)
  const paid = p.plans.filter((x) => x.price > 0).reduce((a, x) => a + x.subs, 0)
  const users = p.freeUsers + paid
  const mrr = p.plans.reduce((a, x) => a + x.subs * x.price, 0)
  const churn30 = h.slice(-30).reduce((a, d) => a + d.churned, 0)
  const C = S.CATEGORIES[p.category]
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><div className="eyebrow">{CAT_ICON[p.category]} {C.name} · powered by {m?.name} · since {dateOf(p.launched)}</div><h1 style={{ fontSize: 38 }}>{p.name}</h1></div>
        <Field label={`Marketing ${money(p.marketingPerDay)}/day`}><input type="range" min={0} max={2_000_000} step={10_000} value={p.marketingPerDay} onChange={(e) => act((x) => S.setMarketing(x, id, +e.target.value), undefined, { system: 'sales' })} style={{ width: 240 }} /></Field>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <Kpi k={C.seatBased ? 'Seats' : 'Users'} v={num(users)} sub={`${num(p.freeUsers)} free`} />
        <Kpi k="Paying" v={num(paid)} sub={`${users ? ((paid / users) * 100).toFixed(1) : 0}% conversion`} />
        <Kpi k="MRR" v={money(mrr)} sub={`ARPU ${money(paid ? mrr / paid : 0)}/mo · ARR ${money(mrr * 12)}`} />
        <Kpi k="Served" v={`${(p.servedFrac * 100).toFixed(0)}%`} sub={`frustration ${(p.frustration * 100).toFixed(0)} · churned 30d ${num(churn30)}`} bad={p.servedFrac < 0.9} />
      </div>
      {p.servedFrac < 0.95 && <div className="panel row" style={{ background: 'var(--red-soft)', boxShadow: 'none' }}>⚠️ <span>{m?.name} doesn't have enough serving capacity: {num(last?.served ?? 0)} of {num(last?.tokens ?? 0)} tokens/day served. Deploy it on more servers (Lab → Models) or rent cloud GPUs.</span></div>}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="panel"><h3 style={{ marginBottom: 8 }}>Users</h3><LineChart series={[{ name: 'All users', color: 'var(--blue)', data: h.map((d) => d.users) }, { name: 'Paying', color: 'var(--accent)', data: h.map((d) => d.paid) }]} /></div>
        <div className="panel"><h3 style={{ marginBottom: 8 }}>Revenue</h3><LineChart fmt={money} series={[{ name: 'MRR', color: 'var(--accent)', data: h.map((d) => d.mrr) }, { name: 'Daily revenue ×30', color: 'var(--violet)', data: h.map((d) => d.revenue * 30), dash: true }]} /></div>
        <div className="panel"><h3 style={{ marginBottom: 8 }}>Tokens per day</h3><LineChart series={[{ name: 'Demand', color: 'var(--amber)', data: h.map((d) => d.tokens) }, { name: 'Served', color: 'var(--blue)', data: h.map((d) => d.served) }]} /></div>
        <div className="panel"><h3 style={{ marginBottom: 8 }}>Churn per day</h3><LineChart series={[{ name: 'Churned users', color: 'var(--red)', data: h.map((d) => d.churned) }]} /></div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>Plans</h2><button className="btn sm" onClick={() => act((x) => S.addPlan(x, id))}><Plus size={13} /> Add plan</button></div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, p.plans.length)}, 1fr)`, gap: 12 }}>
        {p.plans.map((pl) => (
          <div key={pl.id} className="panel col" style={{ gap: 8, outline: pl.price === 0 ? undefined : '1px solid var(--line-2)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><input type="text" value={pl.name} onChange={(e) => act((x) => S.updatePlan(x, id, pl.id, { name: e.target.value }), undefined, { system: 'sales' })} style={{ fontWeight: 700, fontSize: 16, background: 'transparent', padding: 4 }} />
              <button className="btn sm danger" aria-label="Remove plan" onClick={() => act((x) => S.removePlan(x, id, pl.id), 'Plan removed', { undoable: true, system: 'sales' })}><Trash2 size={12} /></button></div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em' }}>{pl.price === 0 ? 'Free' : `$${pl.price}`}<span className="dim" style={{ fontSize: 13, fontWeight: 500 }}>{pl.price ? (C.seatBased ? '/seat/mo' : '/mo') : ''}</span></div>
            <Field label="Price $/mo"><Num value={pl.price} step={1} onChange={(v) => act((x) => S.updatePlan(x, id, pl.id, { price: v }), undefined, { system: 'sales' })} /></Field>
            <Field label={`Token limit/day ${num(pl.tokPerDay)}`}><input type="range" min={Math.log10(500)} max={Math.log10(5e7)} step={0.01} value={Math.log10(pl.tokPerDay)} onChange={(e) => act((x) => S.updatePlan(x, id, pl.id, { tokPerDay: Math.round(10 ** +e.target.value) }), undefined, { system: 'sales' })} /></Field>
            {C.seatBased && <Field label="Minimum seats"><Num value={pl.seatsMin} min={1} onChange={(v) => act((x) => S.updatePlan(x, id, pl.id, { seatsMin: v }), undefined, { system: 'sales' })} /></Field>}
            <label className="row" style={{ fontSize: 13 }}><input type="checkbox" checked={pl.ads} onChange={(e) => act((x) => S.updatePlan(x, id, pl.id, { ads: e.target.checked }), undefined, { system: 'sales' })} /> Show ads</label>
            <label className="row" style={{ fontSize: 13 }}><input type="checkbox" checked={pl.priority} onChange={(e) => act((x) => S.updatePlan(x, id, pl.id, { priority: e.target.checked }), undefined, { system: 'sales' })} /> Priority access</label>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, fontSize: 13 }}><b>{num(pl.price === 0 ? p.freeUsers : pl.subs)}</b> <span className="dim">{pl.price === 0 ? 'users' : 'subscribers'} · {money(pl.subs * pl.price)}/mo</span></div>
          </div>))}
      </div>
    </div>
  )
}

function ApiConsole({ id }: { id: string }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const p = w.products.find((x) => x.id === id)!
  const api = p.api!
  const m = w.models.find((x) => x.id === p.modelId)
  const h = p.history.slice(-90)
  const setTier = (i: number, patch: Partial<S.ApiTier>): void => { act(() => { Object.assign(api.tiers[i], patch); return { ok: true, value: undefined } }) }
  return (
    <div className="col" style={{ gap: 14 }}>
      <div><div className="eyebrow">🔑 Developer platform · {m?.name} at ${m?.priceMtok.toFixed(2)}/Mtok</div><h1 style={{ fontSize: 38 }}>{p.name}</h1></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <Kpi k="Developers" v={num(api.devs)} /><Kpi k="API revenue (lifetime)" v={money(m?.revenue ?? 0)} /><Kpi k="Market share" v={`${((m?.share ?? 0) * 100).toFixed(2)}%`} /><Kpi k="Tokens/day" v={num(m?.demandTokPerDay ?? 0)} sub={`capacity ${num(m?.capacityTokPerDay ?? 0)}`} bad={(m?.demandTokPerDay ?? 0) > (m?.capacityTokPerDay ?? 0)} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="panel"><h3 style={{ marginBottom: 8 }}>Developers</h3><LineChart series={[{ name: 'Developers', color: 'var(--blue)', data: h.map((d) => d.users) }]} /></div>
        <div className="panel col" style={{ gap: 10 }}><h3>Signup credit</h3><p className="dim" style={{ fontSize: 13 }}>Free credit for new keys. More credit, more developers, more burn.</p>
          <div className="row" style={{ gap: 6 }}>{[0, 5, 18, 100].map((c) => <button key={c} className={'btn sm ' + (api.signupCredit === c ? 'pri' : '')} onClick={() => act(() => { api.signupCredit = c; return { ok: true, value: undefined } })}>${c}</button>)}</div></div>
      </div>
      <div className="panel"><h3 style={{ marginBottom: 8 }}>Usage tiers & rate limits</h3>
        <table><thead><tr><th>Tier</th><th className="r">Unlocks at spend</th><th className="r">Requests / min</th><th className="r">Tokens / min</th></tr></thead><tbody>
          {api.tiers.map((t, i) => <tr key={t.name}><td><b>{t.name}</b></td>
            <td className="r"><Num value={t.minSpend} onChange={(v) => setTier(i, { minSpend: v })} /></td>
            <td className="r"><Num value={t.rpm} onChange={(v) => setTier(i, { rpm: v })} /></td>
            <td className="r"><Num value={t.tpm} step={1000} onChange={(v) => setTier(i, { tpm: v })} /></td></tr>)}
        </tbody></table></div>
      <div className="panel"><h3 style={{ marginBottom: 8 }}><KeyRound size={15} /> Top API keys</h3>
        {api.keys.length === 0 ? <p className="dim">No notable keys yet. Developers trickle in as your model climbs the leaderboard.</p> :
          <table><thead><tr><th>Key</th><th>Owner</th><th>Tier</th><th className="r">Tokens/day</th><th className="r">Lifetime spend</th></tr></thead><tbody>
            {[...api.keys].sort((a, b) => b.spend - a.spend).map((k) => <tr key={k.id}><td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{k.id.slice(0, 6)}…{k.id.slice(-4)}</td><td>{k.owner}</td><td><span className="tag b">{api.tiers[k.tier]?.name}</span></td><td className="r">{num(k.tokPerDay)}</td><td className="r"><b>{money(k.spend)}</b></td></tr>)}
          </tbody></table>}
      </div>
    </div>
  )
}

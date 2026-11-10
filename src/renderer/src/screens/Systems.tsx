/** Screens for the three connected systems: Data Foundry (Lab), organisation deals (Deals) and the society loop (Ranks). */
import { useState } from 'react'
import { MODALITIES } from '@sim/foundry'
import * as DF from '@sim/datafoundry'
import * as OG from '@sim/orgs'
import { LAWS, drivers, type Society } from '@sim/society'
import type { Domain } from '@sim/models'
import * as PV from '@sim/preview'
import { dateOf, money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Bar, Field, Num } from '../ui'

const DOMAINS: Domain[] = ['web', 'code', 'math', 'books', 'science', 'multilingual', 'dialogue', 'synthetic']
const days = (d: number): string => !Number.isFinite(d) ? 'never at this rate' : d < 1 ? 'under a day' : `${Math.ceil(d)} days`

export function DataFoundry() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const st = w.data ?? { projects: [], own: [] }
  const [name, setName] = useState('House corpus 1')
  const [domain, setDomain] = useState<Domain>('code')
  const [source, setSource] = useState<DF.Source>('scrape')
  const [targetT, setTarget] = useState(1)
  const [budgetK, setBudget] = useState(50)
  const spec = DF.SOURCES[source]
  const rate = DF.projectRate(w, { source, budgetPerDay: budgetK * 1000 })
  const total = targetT * spec.usdPerT
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="panel col" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h3>Make a dataset</h3><span className="dim" style={{ fontSize: 12.5 }}>Pick where the data comes from. Cost, quality and risk follow from that.</span></div>
        <div className="modality-grid">{(Object.keys(DF.SOURCES) as DF.Source[]).map((k) => { const s = DF.SOURCES[k], ok = !s.tech || w.research.done.includes(s.tech); return (
          <button key={k} className={'modality' + (source === k ? ' on' : '') + (ok ? '' : ' locked')} onClick={() => ok ? setSource(k) : useGame.getState().go('research')}>
            <b>{s.name}</b><span>{ok ? s.blurb : 'Locked · research in R&D → Data'}</span><em>{money(s.usdPerT)}/T · quality ×{DF.sourceQuality(w, k)}{s.risk > 0.3 ? ' · legal risk' : ''}</em></button>) })}</div>
        <div className="row wrap" style={{ gap: 14, alignItems: 'end' }}>
          <Field label="Name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Subject"><select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>{DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
          <Field label="Size (trillion tokens)"><Num value={targetT} min={0.01} step={0.1} onChange={setTarget} /></Field>
          <Field label="Budget ($k per day)"><Num value={budgetK} min={1} step={10} onChange={setBudget} /></Field>
          <div className="dim" style={{ fontSize: 12.5 }}>Ready in <b style={{ color: 'var(--tx)' }}>{days(targetT / rate)}</b><br />about {money(total)} in total</div>
          <button className="btn pri" onClick={() => void useGame.getState().confirmAct(`Start gathering ${name}?`, PV.previewSpend(w, total), 'Start', (x) => DF.startProject(x, { name, domain, source, targetT, budgetPerDay: budgetK * 1000 }), { okMsg: 'Data project started' })}>Start project</button>
        </div>
      </div>
      {st.projects.length > 0 && <div className="panel col" style={{ gap: 12 }}><h3>Gathering now</h3>
        {st.projects.map((p) => { const r = DF.projectRate(w, p); return (
          <div key={p.id} className="row" style={{ gap: 14 }}>
            <div style={{ flex: 1, display: 'grid', gap: 6 }}><div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><b>{p.name}</b><span className="dim">{DF.SOURCES[p.source].name} · {p.domain} · {p.doneT.toFixed(2)} of {p.targetT}T · {days((p.targetT - p.doneT) / r)} left</span></div><Bar v={p.doneT} max={p.targetT} warnAt={2} badAt={2} /></div>
            <button className="btn sm" title="Stop now and keep what has been gathered" onClick={() => act((x) => DF.cancelProject(x, p.id), 'Project stopped; you keep what was gathered')}>Stop & keep</button>
          </div>) })}
      </div>}
      <div className="panel col" style={{ gap: 10 }}><h3>Datasets you made</h3>
        {st.own.length === 0 ? <p className="dim">Nothing yet. Finished projects land here; you can train on them, license them to rivals for daily income, or sell them outright.</p> :
          st.own.map((d) => { const v = DF.licenceValue(w, d); return (
            <div key={d.id} className="row wrap" style={{ gap: 12, justifyContent: 'space-between' }}>
              <span><b>{d.name}</b> <span className="dim">· {num(d.tokensT, 2)}T {d.domain} · quality ×{d.quality}{d.earned > 0 ? ` · earned ${money(d.earned)}` : ''}</span></span>
              <span className="row" style={{ gap: 8 }}>
                <button className={'btn sm ' + (d.licensed ? 'pri' : '')} title="Rivals pay daily to train on it. It makes them slightly better." onClick={() => act((x) => DF.setLicensed(x, d.id, !d.licensed), d.licensed ? 'Licence withdrawn' : 'Now licensed to rivals', { undoable: true })}>{d.licensed ? `Licensed · ${money(v)}/day` : `License out · ${money(v)}/day`}</button>
                <button className="btn sm danger" onClick={() => void useGame.getState().confirmAct(`Sell ${d.name} outright?`, { tier: 'severe', lines: [`You receive ${money(v * 400)} once`, 'You can no longer train on it, and a rival can'] }, 'Sell', (x) => DF.sellDataset(x, d.id), { okMsg: 'Dataset sold' })}>Sell · {money(v * 400)}</button>
              </span>
            </div>) })}
      </div>
    </div>
  )
}

export function OrgDeals() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const all = w.orgDeals ?? []
  const offers = all.filter((d) => d.status === 'offer'), active = all.filter((d) => d.status === 'active')
  const [pickModel, setPick] = useState<Record<string, string>>({})
  return (
    <div className="col" style={{ gap: 14, marginBottom: 28 }}>
      <h2>Organisations</h2>
      <p className="dim" style={{ fontSize: 13, marginTop: -8 }}>Companies buy seats on one of your models. They hold you to an uptime promise, and renew bigger if you keep it. Offers arrive once you have launched a model.</p>
      {active.length > 0 && <div className="panel col" style={{ gap: 12 }}>
        {active.map((d) => (
          <div key={d.id} className="row wrap" style={{ gap: 16, justifyContent: 'space-between' }}>
            <div style={{ minWidth: 220 }}><b>{d.org}</b> <span className="tag">{d.sector}</span>{d.renewals > 0 && <span className="tag g">renewed ×{d.renewals}</span>}<div className="dim" style={{ fontSize: 12 }}>{num(d.seats)} seats · {money(d.seats * d.pricePerSeat)}/mo · until {dateOf(d.endTick ?? 0)}</div></div>
            <div style={{ flex: 1, minWidth: 180, display: 'grid', gap: 4 }}><Bar v={1 - d.satisfaction} max={1} warnAt={0.45} badAt={0.7} /><div className="dim" style={{ fontSize: 12 }}>satisfaction {(d.satisfaction * 100).toFixed(0)}% · answered {(d.servedFrac * 100).toFixed(0)}% of requests (promised {(d.sla * 100).toFixed(0)}%)</div></div>
            <div className="seg"><button className={d.care === 'standard' ? 'on' : ''} onClick={() => act((x) => OG.setCare(x, d.id, 'standard'), 'Standard support')}>Standard</button><button className={d.care === 'premium' ? 'on' : ''} title="A dedicated team: happier customer, 8% less margin" onClick={() => act((x) => OG.setCare(x, d.id, 'premium'), 'White-glove support')}>White-glove</button></div>
          </div>))}
      </div>}
      {offers.length === 0 ? (active.length === 0 && <p className="dim">No offers on the table right now.</p>) :
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {offers.map((d) => { const models = OG.eligibleModels(w, d); const mid = pickModel[d.id] ?? models[0]?.id ?? ''; return (
            <div key={d.id} className="panel lift col" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}><h3>{d.org}</h3><span className="tag b">{MODALITIES[d.modality].name}</span></div>
              <div style={{ fontSize: 13 }}><b>{num(d.seats)}</b> seats × <b>${d.pricePerSeat}</b> = <b>{money(d.seats * d.pricePerSeat)}</b>/month for {d.months} months</div>
              <div className="dim" style={{ fontSize: 12.5 }}>Needs {d.minElo}+ Elo · {(d.sla * 100).toFixed(0)}% of requests answered · offer ends {dateOf(d.expiresTick)}</div>
              {models.length === 0 ? <div className="neg" style={{ fontSize: 12.5 }}>None of your {MODALITIES[d.modality].name.toLowerCase()} models is good enough yet.</div> : <>
                <select value={mid} onChange={(e) => setPick({ ...pickModel, [d.id]: e.target.value })}>{models.map((m) => <option key={m.id} value={m.id}>{m.name} · {Math.round(m.elo)} Elo</option>)}</select>
                <div className="row wrap" style={{ gap: 6 }}>
                  <button className="btn sm pri" onClick={() => act((x) => OG.acceptDeal(x, d.id, mid), `${d.org} signed`)}>Sign</button>
                  {[0.1, 0.25].map((p) => <button key={p} className="btn sm" title="If they refuse, the offer is withdrawn" onClick={() => act((x) => OG.counterDeal(x, d.id, p), 'Counter-offer sent')}>Ask +{p * 100}% · {(OG.counterOdds(w, d, p) * 100).toFixed(0)}% chance</button>)}
                </div></>}
            </div>) })}
        </div>}
    </div>
  )
}

function Gauge({ label, v, max, bad, text, why }: { label: string; v: number; max: number; bad: boolean; text: string; why: string }) {
  return <div className="panel col" style={{ gap: 8 }}><div className="row" style={{ justifyContent: 'space-between' }}><b>{label}</b><span style={{ fontWeight: 650 }}>{text}</span></div>
    <Bar v={v} max={max} warnAt={bad ? 0.5 : 2} badAt={bad ? 0.75 : 2} /><p className="dim" style={{ fontSize: 12.5, margin: 0 }}>{why}</p></div>
}
export function SocietyPanel() {
  const w = useWorld(); const s: Society = w.society ?? { trust: 55, regulation: 5, slop: 0.03, safetyDebt: 0, laws: [] }, d = drivers(w)
  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="dim" style={{ fontSize: 13 }}>The world reacts to what you do. None of this is scripted: each number moves because of your choices, and each one pushes back on the rest of your company.</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <Gauge label="Public trust" v={s.trust} max={100} bad={false} text={`${s.trust.toFixed(0)} / 100`} why={`Your reputation follows this. Pulled down by risky data (${d.legalRisk.toFixed(1)}), logging users (${d.telemetry.toFixed(1)}) and safety debt; lifted by Safety research.`} />
        <Gauge label="Regulation pressure" v={s.regulation} max={100} bad text={`${s.regulation.toFixed(0)} / 100`} why={`Grows with your text market share (${(d.share * 100).toFixed(0)}%) and low trust. Laws pass at 35, 60 and 85.`} />
        <Gauge label="AI slop on the internet" v={s.slop} max={1} bad text={`${(s.slop * 100).toFixed(1)}%`} why="Every model's output ends up back on the web. Crawled data gets worse; human-made data you own gets more valuable." />
        <Gauge label="Safety debt" v={s.safetyDebt} max={8} bad text={s.safetyDebt.toFixed(1)} why="How far your best model has outrun your safety research. Above 0.5, agents start misbehaving in your products." />
      </div>
      <div className="panel col" style={{ gap: 8 }}><b>Laws</b>
        {Object.entries(LAWS).map(([id, l]) => <div key={id} className="row" style={{ justifyContent: 'space-between', opacity: s.laws.includes(id) ? 1 : 0.55 }}><span><b style={{ fontWeight: 600 }}>{l.name}</b> <span className="dim">· {l.blurb}</span></span><span className={'tag ' + (s.laws.includes(id) ? 'r' : '')}>{s.laws.includes(id) ? 'in force' : `at ${l.at}`}</span></div>)}
      </div>
      <div className="panel col" style={{ gap: 6, fontSize: 13 }}><b>Rivals right now</b>
        <span>{s.chasing ? 'You lead the leaderboard, so the other labs are pooling effort and closing the gap faster.' : `The best rival is ${Math.max(0, Math.round(d.rivalBest - d.bestElo))} Elo ahead of your best model.`}</span>
        <span>{s.priceWar ? 'Price war: your low prices are forcing everyone to cut theirs.' : 'Prices are stable.'}</span>
        {d.licensed > 0 && <span>Your licensed datasets are making rival models a little better every day.</span>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Plus, MapPin, Thermometer, Zap, Gauge } from 'lucide-react'
import * as A from '@sim/actions'
import { COOLING, FABRICS, GENERATORS, REGIONS, region, type CoolingType, type FabricType, type GenKind } from '@sim/data/hardware'
import { HALL_SIZES, type HallSize } from '@sim/data/equipment'
import { coolingUnlocked, fabricUnlocked, hasTech } from '@sim/util'
import { dateOf, money } from '../format'
import { HallEditor } from '../three/HallEditor'
import { useGame, useWorld } from '../store'
import { Advanced, EmptyState, Field, Num, Summary, Tabs, Term } from '../ui'
import { EmptyHallArt, EmptyLand } from '../art/Illustrations'
import { PowerFlow } from '../art/PowerFlow'
import { WorldMap } from '../art/WorldMap'
import { LineChart } from './Store'
import * as PV from '@sim/preview'

export function Sites() {
  const w = useWorld()
  const { siteId, selectSite } = useGame()
  const [picking, setPicking] = useState(false)
  const site = w.sites.find((s) => s.id === siteId) ?? w.sites[0]
  if (!site || picking) return <RegionPicker first={!site} onCancel={() => setPicking(false)} onDone={(id) => { selectSite(id); setPicking(false) }} />
  return <SiteView key={site.id} siteId={site.id} onNew={() => setPicking(true)} />
}

function RegionPicker({ first, onCancel, onDone }: { first: boolean; onCancel: () => void; onDone: (id: string) => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  return (
    <>
      {first ? (
        <EmptyState art={<EmptyLand />} eyebrow="Step 1 of 4 · Land" title="Every empire starts with dirt." body="Pick a region. Power price, climate, grid headroom and permit speed set your cost curve for the next decade. Cold air is free cooling. Cheap power comes with strings." />
      ) : (
        <div className="page-head"><div><h1>New site</h1><p className="sub">Expand into another region.</p></div><button className="btn ghost" onClick={onCancel}>Cancel</button></div>
      )}
      <div className="panel gap-l" style={{ padding: 0, overflow: 'hidden' }}><WorldMap w={w} height={330} onPick={(id) => document.getElementById('region-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} /></div>
      <div className="grid gap-l" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {REGIONS.map((r) => (
          <div key={r.id} id={'region-' + r.id} className="panel lift col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><h3>{r.name.split(',')[0]}</h3><span className="tag">{r.country}</span></div>
            <div className="dim" style={{ fontSize: 13, minHeight: 38 }}>{r.blurb}</div>
            <div className="row" style={{ gap: 16, fontSize: 13 }}>
              <span title="Power price"><Zap size={13} /> ${r.basePriceMwh}</span>
              <span title="Mean temperature"><Thermometer size={13} /> {r.meanC}°C</span>
              <span title="Grid headroom"><Gauge size={13} /> {r.gridCapMw} MW</span>
              <span title="Permit days" className="dim">{r.permitDays}d permits</span>
            </div>
            <Meter label="Carbon" v={r.carbon / 0.45} bad />
            <Meter label="Customer proximity" v={(r.demandMult - 0.6) / 0.7} />
            <button className="btn pri" disabled={w.cash < r.siteCostUsd} onClick={() => { void useGame.getState().confirmAct(`Buy land in ${r.name}?`, PV.previewSpend(w, r.siteCostUsd), 'Buy land', (x) => A.buildSite(x, r.id), { okMsg: 'Site acquired' }).then((res) => { if (res?.ok) onDone(res.value.id) }) }}><MapPin size={14} /> Acquire · {money(r.siteCostUsd)}</button>
          </div>
        ))}
      </div>
    </>
  )
}
function Meter({ label, v, bad }: { label: string; v: number; bad?: boolean }) {
  const f = Math.max(0.04, Math.min(1, v))
  return <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 10, fontSize: 12.5 }}><span className="dim">{label}</span><div className="bar"><i style={{ width: `${f * 100}%`, background: bad ? (f > .6 ? 'var(--red)' : 'var(--amber)') : 'var(--accent)' }} /></div></div>
}

function SiteView({ siteId, onNew }: { siteId: string; onNew: () => void }) {
  const w = useWorld(); const { selectSite } = useGame()
  const site = w.sites.find((s) => s.id === siteId)!
  const [hallId, setHallId] = useState<string | null>(site.halls[0]?.id ?? null)
  const [tab, setTab] = useState<'floor' | 'power'>('floor')
  const hall = site.halls.find((h) => h.id === hallId) ?? site.halls[0]
  const r = region(site.regionId)
  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">{r.name}</div><h1>{site.name}</h1>
          {(!site.gridUp || site.powerFactor < 1) && <div className="row" style={{ marginTop: 10, gap: 8 }}>
            {!site.gridUp && <span className="tag r">Grid down</span>}
            {site.powerFactor < 1 && <span className="tag r">Brownout {(site.powerFactor * 100).toFixed(0)}%</span>}
          </div>}</div>
        <div className="row">
          {w.sites.length > 1 && <select value={site.id} onChange={(e) => selectSite(e.target.value)} style={{ width: 'auto' }}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
          <button className="btn ghost" onClick={onNew}><Plus size={14} /> Site</button>
        </div>
      </div>
      <Summary items={[
        { label: 'Power used', value: `${site.demandMw.toFixed(1)} / ${site.utilityMw} MW`, tone: site.demandMw > site.utilityMw * 0.9 ? 'warn' : undefined, hint: 'from the grid feed' },
        { label: 'Electricity', value: `$${site.priceMwh.toFixed(0)}/MWh`, hint: `${site.ambientC.toFixed(0)}°C outside` },
        { label: 'Racks', value: site.halls.reduce((a, h) => a + h.racks.length, 0), hint: `${site.halls.length} hall${site.halls.length === 1 ? '' : 's'}` },
        { label: 'Servers', value: site.halls.reduce((a, h) => a + h.racks.reduce((b, x) => b + x.servers, 0), 0), hint: `${Object.values(site.stock).reduce((a, n) => a + n, 0)} spare on the dock` }
      ]} />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <Tabs tabs={['floor', 'power'] as const} value={tab} onChange={setTab} />
        {tab === 'floor' && site.halls.length > 0 && <div className="row" style={{ gap: 6 }}>
          {site.halls.map((h) => <button key={h.id} className={'btn sm ' + (h.id === hall?.id ? 'pri' : '')} onClick={() => setHallId(h.id)}>{h.name}{w.tick < h.readyTick ? ' · building' : ''}</button>)}
          <button className="btn sm ghost" onClick={() => setHallId('new')}><Plus size={13} /> Hall</button>
        </div>}
      </div>
      {tab === 'power' && <PowerTab siteId={site.id} />}
      {tab === 'floor' && (!hall || hallId === 'new'
        ? <NewHall siteId={site.id} first={site.halls.length === 0} onDone={(id) => setHallId(id)} />
        : <>
            {w.tick < hall.readyTick && <div className="panel row" style={{ marginBottom: 12, background: 'var(--amber-soft)', boxShadow: 'none' }}>🏗 <span>Under construction until <b>{dateOf(hall.readyTick)}</b>. You can lay out the floor now — servers can be installed once it opens.</span></div>}
            <HallEditor site={site} hall={hall} />
          </>)}
    </>
  )
}

function NewHall({ siteId, first, onDone }: { siteId: string; first: boolean; onDone: (id: string) => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [size, setSize] = useState<HallSize>('S')
  const [cooling, setCooling] = useState<CoolingType>('air')
  const [fabric, setFabric] = useState<FabricType>('eth100')
  const cost = A.hallCost({ size, cooling, fabric })
  const body = (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {(Object.keys(HALL_SIZES) as HallSize[]).map((k) => <button key={k} className={'adv' + (size === k ? ' on' : '')} style={{ gridTemplateColumns: '1fr' }} onClick={() => setSize(k)}><b>{HALL_SIZES[k].name.split(' (')[0]}</b><span>{HALL_SIZES[k].w}×{HALL_SIZES[k].d} tiles</span><em>{money(A.hallCost({ size: k, cooling, fabric }))}</em></button>)}
      </div>
      <div className="row">
        <Field label="Cooling"><select value={cooling} onChange={(e) => setCooling(e.target.value as CoolingType)}>{(Object.keys(COOLING) as CoolingType[]).map((c) => <option key={c} value={c} disabled={!coolingUnlocked(w, c)}>{COOLING[c].name} · {COOLING[c].maxRackKw} kW/rack{coolingUnlocked(w, c) ? '' : ' (research)'}</option>)}</select></Field>
        <Field label="Network fabric"><select value={fabric} onChange={(e) => setFabric(e.target.value as FabricType)}>{(Object.keys(FABRICS) as FabricType[]).map((f) => <option key={f} value={f} disabled={!fabricUnlocked(w, f)}>{FABRICS[f].name}{fabricUnlocked(w, f) ? '' : ' (research)'}</option>)}</select></Field>
      </div>
      <div><button className="btn pri" onClick={() => { void useGame.getState().confirmAct('Break ground on a new hall?', PV.previewSpend(w, cost), 'Build', (x) => A.buildHall(x, siteId, { size, cooling, fabric }), { okMsg: 'Groundbreaking!' }).then((r) => { if (r?.ok) onDone(r.value.id) }) }}>Break ground · {money(cost)}</button></div>
    </div>
  )
  return first
    ? <EmptyState art={<EmptyHallArt />} eyebrow="Step 2 of 4 · Building" title="An empty field needs a hall." body="The hall is a shell: a floor, walls and a roof. Inside you place PDUs (power), CRAHs or CDUs (cooling) and racks on a grid. Every rack must be in reach of both. Start small; a pod is plenty for your first GPUs.">{body}</EmptyState>
    : <div className="panel">{body}</div>
}

function PowerTab({ siteId }: { siteId: string }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const site = w.sites.find((s) => s.id === siteId)!
  const [mw, setMw] = useState(10)
  const [kind, setKind] = useState<GenKind>('solar')
  const [gmw, setGmw] = useState(10)
  const [gmwh, setGmwh] = useState(40)
  const rg = region(site.regionId)
  const [ppaMw, setPpaMw] = useState(Math.max(1, Math.round(site.utilityMw / 2)))
  const prov = A.siteProvisionedKw(site) / 1000, cap = A.siteSupplyCapKw(site) / 1000
  const strat = site.strategy ?? 'cost'
  const h = site.history ?? []
  return (
    <div className="col" style={{ gap: 16 }}>
    <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
      <div className="panel"><h2>Live power flow</h2><PowerFlow site={site} /></div>
      <div className="panel col" style={{ gap: 12 }}>
        <h2>Dispatch strategy</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([['cost', 'Lowest cost', 'Cheapest source first. Gas when it beats the grid.'], ['green', 'Green', 'Renewables + batteries first, buys certificates, gas only in emergencies.'], ['resilient', 'Resilient', 'Keeps batteries 80% charged for outages.'], ['arbitrage', 'Arbitrage', 'Cycles batteries aggressively on price swings.']] as const).map(([k, n, b]) =>
            <button key={k} className={'adv' + (strat === k ? ' on' : '')} style={{ gridTemplateColumns: '1fr' }} onClick={() => act((x) => A.setPowerStrategy(x, siteId, k), undefined, { system: 'facilities' })}><b>{n}</b><span>{b}</span></button>)}
        </div>
        <Field label={`Demand response (DR): shed ${((site.drPct ?? 0) * 100).toFixed(0)}% of load during price spikes (paid 80% of spot)`}><input type="range" min={0} max={0.5} step={0.05} value={site.drPct ?? 0} onChange={(e) => act((x) => A.setDemandResponse(x, siteId, +e.target.value), undefined, { system: 'facilities' })} /></Field>
        {site.flow && site.flow.drCredit > 0 && <span className="tag g">earning {money(site.flow.drCredit)}/h from the grid right now</span>}
      </div>
    </div>
      <div className="panel col">
        <h2>Utility connection</h2>
        <div style={{ fontSize: 28, fontWeight: 650, letterSpacing: '-.03em' }}>{site.utilityMw} MW <span className="dim" style={{ fontSize: 14, fontWeight: 500 }}>of {rg.gridCapMw} MW regional headroom</span></div>
        <div className="bar"><i style={{ width: `${Math.min(100, (prov / Math.max(cap, 0.01)) * 100)}%` }} /></div>
        <div className="dim" style={{ fontSize: 12.5 }}>{prov.toFixed(1)} MW of PDUs provisioned against {cap.toFixed(1)} MW supply</div>
        {site.pendingUtility.map((p, i) => <div key={i} className="tag a">+{p.mw} MW energises {dateOf(p.readyTick)}</div>)}
        <div className="row"><Field label="Request MW ($1.3M/MW)"><Num value={mw} min={1} onChange={setMw} /></Field><button className="btn pri" style={{ alignSelf: 'end' }} onClick={() => void useGame.getState().confirmAct(`Upgrade the grid feed by ${mw} MW?`, PV.previewSpend(w, mw * 1_300_000), 'Order', (x) => A.buyUtility(x, siteId, mw), { okMsg: 'Substation upgrade ordered', system: 'facilities' })}>Order {money(mw * 1_300_000)}</button></div>
      </div>
    <Advanced title="Price history, contracts & on-site generation">
    <div className="col" style={{ gap: 16 }}>
    <div className="panel"><h2>Last 48 hours</h2><LineChart fmt={(v) => v.toFixed(1)} series={[{ name: 'Spot $/MWh', color: 'var(--amber)', data: h.map((x) => x.price) }, { name: 'Draw MW \u00d710', color: 'var(--blue)', data: h.map((x) => x.mw * 10) }, { name: 'Grid MW \u00d710', color: 'var(--tx-3)', data: h.map((x) => x.grid * 10), dash: true }]} /></div>
    <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
      <div className="panel col" style={{ flex: 1 }}>
        <h2><Term k="ppa">Power purchase agreement</Term></h2>
        {site.ppa && site.ppa.untilTick > w.tick ? <div>Hedged <b>{site.ppa.mw} MW</b> at <b>${site.ppa.price}/MWh</b> until {dateOf(site.ppa.untilTick)}</div> : <div className="dim" style={{ fontSize: 13 }}>Lock grid energy at <b>${A.ppaQuote(w, siteId)}/MWh</b> for 10 years. Protects you from spikes, costs you on cheap days.</div>}
        <div className="row"><Field label="MW to hedge"><Num value={ppaMw} min={1} max={site.utilityMw} onChange={setPpaMw} /></Field><button className="btn" style={{ alignSelf: 'end' }} disabled={!hasTech(w, 'ppa')} onClick={() => void useGame.getState().confirmAct('Sign a 10-year power deal?', PV.previewPpa(w, siteId, ppaMw), 'Sign', (x) => A.signPpa(x, siteId, ppaMw), { system: 'finance' })}>{hasTech(w, 'ppa') ? 'Sign PPA' : 'Research PPAs'}</button></div>
      </div>
      <div className="panel col" style={{ flex: 1.3 }}>
        <h2>On-site generation & storage</h2>
        {site.gens.length === 0 && <p className="dim">Nothing yet. Batteries arbitrage price spikes, gas turbines keep you alive through outages, solar and wind cut your bill.</p>}
        <table><tbody>{site.gens.map((g) => <tr key={g.id}><td>{GENERATORS[g.kind].name}</td><td className="r">{g.mw} MW{g.kind === 'battery' ? ` · ${((g.soc / Math.max(1, g.mwh)) * 100).toFixed(0)}% of ${g.mwh} MWh` : ''}</td><td className="r">{w.tick >= g.readyTick ? <span className="tag g">online</span> : <span className="tag a">{dateOf(g.readyTick)}</span>}</td></tr>)}</tbody></table>
        <div className="row">
          <Field label="Type"><select value={kind} onChange={(e) => setKind(e.target.value as GenKind)}>{(Object.keys(GENERATORS) as GenKind[]).map((k) => { const g = GENERATORS[k]; const locked = (g.needsTech && !hasTech(w, g.needsTech)) || (k === 'geothermal' && !rg.geothermal); return <option key={k} value={k} disabled={!!locked}>{g.name}{locked ? ' (locked)' : ''}</option> })}</select></Field>
          <Field label="MW"><Num value={gmw} min={1} onChange={setGmw} /></Field>
          {kind === 'battery' && <Field label="MWh"><Num value={gmwh} min={1} onChange={setGmwh} /></Field>}
        </div>
        <div><button className="btn pri" onClick={() => void useGame.getState().confirmAct(`Build ${GENERATORS[kind].name}?`, PV.previewSpend(w, gmw * GENERATORS[kind].usdPerMw + (kind === 'battery' ? gmwh * 280_000 : 0)), 'Build', (x) => A.buildGenerator(x, siteId, kind, gmw, gmwh), { okMsg: 'Construction started', system: 'facilities' })}>Build · {money(gmw * GENERATORS[kind].usdPerMw + (kind === 'battery' ? gmwh * 280_000 : 0))}</button></div>
      </div>
    </div>
    </div>
    </Advanced>
    </div>
  )
}

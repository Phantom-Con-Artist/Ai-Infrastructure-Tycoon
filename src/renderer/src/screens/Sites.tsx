import { useState } from 'react'
import * as A from '@sim/actions'
import { COOLING, FABRICS, GENERATORS, REGIONS, gpuCatalog, region, type CoolingType, type FabricType, type GenKind } from '@sim/data/hardware'
import { coolingUnlocked, fabricUnlocked, gpu, hallServers, hasTech, yearOf } from '@sim/util'
import { coolCapacityKw } from '@sim/facility'
import { dateOf, money, num } from '../format'
import { SiteScene } from '../SiteScene'
import { useGame, useWorld } from '../store'
import { Bar, Field, Head, Num, Tabs } from '../ui'

const TABS = ['halls', 'build hall', 'power', 'hardware'] as const

export function Sites() {
  const w = useWorld()
  const { siteId, selectSite, act } = useGame()
  const [tab, setTab] = useState<(typeof TABS)[number]>('halls')
  const [newRegion, setNewRegion] = useState<string | null>(null)
  const site = w.sites.find((s) => s.id === siteId) ?? w.sites[0]

  if (!site || newRegion !== null) {
    return (
      <>
        <Head title="Choose a region" sub="Land, power price, climate and grid capacity decide your cost curve for the next decade. Cold climates cool for free. Cheap power has strings." right={w.sites.length > 0 ? <button className="btn" onClick={() => setNewRegion(null)}>Cancel</button> : undefined} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {REGIONS.map((r) => (
            <div key={r.id} className="panel flat col">
              <h3>{r.name}</h3>
              <div className="dim" style={{ fontSize: 12 }}>{r.blurb}</div>
              <table><tbody>
                <tr><td className="dim">Power</td><td className="r mono">${r.basePriceMwh}/MWh</td></tr>
                <tr><td className="dim">Climate</td><td className="r mono">{r.meanC}°C ±{r.ampC}</td></tr>
                <tr><td className="dim">Carbon</td><td className="r mono">{(r.carbon * 1000).toFixed(0)} g/kWh</td></tr>
                <tr><td className="dim">Grid limit</td><td className="r mono">{r.gridCapMw} MW</td></tr>
                <tr><td className="dim">Permits</td><td className="r mono">{r.permitDays} d</td></tr>
                <tr><td className="dim">Customer proximity</td><td className="r mono">×{r.demandMult}</td></tr>
              </tbody></table>
              <button className="btn pri" onClick={() => { const res = act((x) => A.buildSite(x, r.id), 'Site acquired'); if (res.ok) { selectSite(res.value.id); setNewRegion(null) } }}>Acquire · {money(r.siteCostUsd)}</button>
            </div>
          ))}
        </div>
      </>
    )
  }

  const r = region(site.regionId)
  const it = site.halls.reduce((a, h) => a + h.itKw, 0) / 1000
  const provisioned = A.siteProvisionedKw(site) / 1000
  const pendingMw = site.pendingUtility.reduce((a, p) => a + p.mw, 0)
  return (
    <>
      <Head title={site.name} sub={`${r.name} · ${site.ambientC.toFixed(0)}°C outside · power $${site.priceMwh.toFixed(0)}/MWh${site.gridUp ? '' : ' · GRID DOWN'}`}
        right={<div className="row">
          <select value={site.id} onChange={(e) => selectSite(e.target.value)} style={{ width: 'auto' }}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button className="btn" onClick={() => setNewRegion('')}>+ New site</button>
        </div>} />
      <SiteScene site={site} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 26 }}>
        {[['Utility feed', `${site.utilityMw.toFixed(0)} MW`, pendingMw ? `+${pendingMw} MW pending` : `limit ${r.gridCapMw} MW`],
          ['IT load', `${it.toFixed(2)} MW`, `${provisioned.toFixed(1)} MW provisioned`],
          ['Facility draw', `${site.demandMw.toFixed(2)} MW`, `grid ${site.gridMw.toFixed(2)} MW`],
          ['Power factor', `${(site.powerFactor * 100).toFixed(0)}%`, site.powerFactor < 1 ? 'BROWNOUT' : 'nominal'],
          ['Energy bill', `${money(site.costPerHour * 24)}/day`, `${(site.carbonKgPerHour / 1000).toFixed(1)} tCO₂/h`]].map(([k, v, s]) => (
          <div key={k} className="panel flat"><div className="dim mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase' }}>{k}</div><div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{v}</div><div className="dim" style={{ fontSize: 11 }}>{s}</div></div>
        ))}
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'halls' && <HallsTab siteId={site.id} />}
      {tab === 'build hall' && <BuildHall siteId={site.id} onDone={() => setTab('halls')} />}
      {tab === 'power' && <PowerTab siteId={site.id} />}
      {tab === 'hardware' && <HardwareTab siteId={site.id} />}
    </>
  )
}

function HallsTab({ siteId }: { siteId: string }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const site = w.sites.find((s) => s.id === siteId)!
  if (!site.halls.length) return <p className="dim">No halls yet. Use “build hall”.</p>
  return (
    <div className="col" style={{ gap: 18 }}>
      {site.halls.map((h) => {
        const built = w.tick >= h.readyTick
        const cap = coolCapacityKw(h, site.ambientC)
        const gpus = h.racks.reduce((a, r) => a + r.servers, 0) * 8
        const failed = h.racks.reduce((a, r) => a + r.failed, 0)
        return (
          <div key={h.id} className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><h3>{h.name} <span className={'tag ' + (!built ? 'a' : h.online ? 'g' : 'r')}>{!built ? `ready ${dateOf(h.readyTick)}` : h.online ? 'online' : 'offline'}</span></h3>
                <div className="dim" style={{ fontSize: 12 }}>{COOLING[h.cooling].name} · {FABRICS[h.fabric].name} · {h.racks.length}/{h.slots} racks · {num(gpus)} GPUs{failed ? ` · ${failed} servers down` : ''}</div></div>
              <div className="row wrap">
                <button className="btn sm" onClick={() => act((x) => A.upgradeHallPower(x, h.id, 250), '+250 kW power')}>+250 kW power</button>
                <button className="btn sm" onClick={() => act((x) => A.upgradeHallCooling(x, h.id, 250), '+250 kW cooling')}>+250 kW cooling</button>
                {(['rdhx', 'dlc', 'immersion'] as CoolingType[]).filter((c) => coolingUnlocked(w, c) && c !== h.cooling).map((c) => <button key={c} className="btn sm" onClick={() => act((x) => A.retrofitCooling(x, h.id, c), 'Retrofit started')}>→ {c}</button>)}
                {(['ib400', 'ib800', 'ib1600'] as FabricType[]).filter((f) => fabricUnlocked(w, f) && f !== h.fabric && Object.keys(FABRICS).indexOf(f) > Object.keys(FABRICS).indexOf(h.fabric)).map((f) => <button key={f} className="btn sm" onClick={() => act((x) => A.upgradeFabric(x, h.id, f), 'Fabric upgraded')}>→ {f}</button>)}
              </div>
            </div>
            {built && <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginTop: 14 }}>
              <Gauge k="Temperature" v={`${h.tempC.toFixed(1)} °C`} bar={<Bar v={h.tempC - 20} max={25} warnAt={0.5} badAt={0.8} />} />
              <Gauge k="IT vs breaker" v={`${h.itKw.toFixed(0)} / ${h.powerKw} kW`} bar={<Bar v={h.itKw} max={h.powerKw} />} />
              <Gauge k="Heat vs cooling" v={`${h.itKw.toFixed(0)} / ${cap.toFixed(0)} kW`} bar={<Bar v={h.itKw} max={cap} />} />
              <Gauge k="PUE" v={h.pue ? h.pue.toFixed(2) : '—'} bar={<Bar v={Math.max(0, h.pue - 1)} max={1} warnAt={0.5} badAt={0.8} />} />
              <Gauge k="Throttle" v={`${(h.throttle * 100).toFixed(0)}%`} bar={<Bar v={1 - h.throttle} max={1} warnAt={0.1} badAt={0.4} />} />
            </div>}
          </div>
        )
      })}
    </div>
  )
}
const Gauge = ({ k, v, bar }: { k: string; v: string; bar: React.ReactNode }) => (
  <div className="panel flat col" style={{ gap: 6 }}><div className="dim mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>{k}</div><div className="mono" style={{ fontWeight: 600 }}>{v}</div>{bar}</div>
)

function BuildHall({ siteId, onDone }: { siteId: string; onDone: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const site = w.sites.find((s) => s.id === siteId)!
  const [slots, setSlots] = useState(24)
  const [cooling, setCooling] = useState<CoolingType>('air')
  const [powerKw, setPower] = useState(1000)
  const [coolKw, setCool] = useState(1100)
  const [fabric, setFabric] = useState<FabricType>('eth100')
  const spec = { slots, cooling, powerKw, coolKw, fabric }
  const cost = A.hallCost(spec)
  const free = (site.utilityMw + A.siteGenMw(site)) * 1000 - A.siteProvisionedKw(site)
  return (
    <div className="panel col" style={{ maxWidth: 760 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', background: 'none', border: 0, gap: 16 }}>
        <Field label="Rack slots"><Num value={slots} min={4} max={400} step={4} onChange={setSlots} /></Field>
        <Field label="Power provisioned (kW)"><Num value={powerKw} min={100} step={250} onChange={setPower} /></Field>
        <Field label="Cooling capacity (kW)"><Num value={coolKw} min={100} step={250} onChange={setCool} /></Field>
        <Field label="Cooling type"><select value={cooling} onChange={(e) => setCooling(e.target.value as CoolingType)}>{(Object.keys(COOLING) as CoolingType[]).map((c) => <option key={c} value={c} disabled={!coolingUnlocked(w, c)}>{COOLING[c].name}{coolingUnlocked(w, c) ? '' : ' 🔒'} · {COOLING[c].maxRackKw} kW/rack</option>)}</select></Field>
        <Field label="Network fabric"><select value={fabric} onChange={(e) => setFabric(e.target.value as FabricType)}>{(Object.keys(FABRICS) as FabricType[]).map((f) => <option key={f} value={f} disabled={!fabricUnlocked(w, f)}>{FABRICS[f].name}{fabricUnlocked(w, f) ? '' : ' 🔒'}</option>)}</select></Field>
      </div>
      <p className="dim" style={{ fontSize: 12 }}>Unallocated site power: <b className="mono">{(free / 1000).toFixed(2)} MW</b>. Rule of thumb: provision cooling ≥ IT load, and breaker ≥ IT peak. A 1 MW hall at {COOLING[cooling].maxRackKw} kW/rack holds about {Math.floor(1000 / COOLING[cooling].maxRackKw)} full racks.</p>
      <div className="row"><button className="btn pri" onClick={() => { const r = act((x) => A.buildHall(x, siteId, spec), 'Construction started'); if (r.ok) onDone() }}>Build · {money(cost)}</button></div>
    </div>
  )
}

function PowerTab({ siteId }: { siteId: string }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const site = w.sites.find((s) => s.id === siteId)!
  const [mw, setMw] = useState(10)
  const [kind, setKind] = useState<GenKind>('solar')
  const [gmw, setGmw] = useState(10)
  const [gmwh, setGmwh] = useState(40)
  const rg = region(site.regionId)
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
      <div className="panel col" style={{ flex: 1 }}>
        <h2>Utility connection</h2>
        <div className="mono">{site.utilityMw} MW live · regional cap {rg.gridCapMw} MW</div>
        {site.pendingUtility.map((p, i) => <div key={i} className="dim">+{p.mw} MW arrives {dateOf(p.readyTick)}</div>)}
        <Field label="Request additional MW ($1.3M/MW, long lead time)"><Num value={mw} min={1} onChange={setMw} /></Field>
        <button className="btn pri" onClick={() => act((x) => A.buyUtility(x, siteId, mw), 'Substation upgrade ordered')}>Order · {money(mw * 1_300_000)}</button>
      </div>
      <div className="panel col" style={{ flex: 1.3 }}>
        <h2>On-site generation & storage</h2>
        <table><tbody>{site.gens.map((g) => <tr key={g.id}><td>{GENERATORS[g.kind].name}</td><td className="r mono">{g.mw} MW{g.kind === 'battery' ? ` / ${g.mwh} MWh · ${((g.soc / Math.max(1, g.mwh)) * 100).toFixed(0)}%` : ''}</td><td className="r dim">{w.tick >= g.readyTick ? 'online' : `ready ${dateOf(g.readyTick)}`}</td></tr>)}</tbody></table>
        <div className="row">
          <Field label="Type"><select value={kind} onChange={(e) => setKind(e.target.value as GenKind)}>{(Object.keys(GENERATORS) as GenKind[]).map((k) => { const g = GENERATORS[k]; const locked = (g.needsTech && !hasTech(w, g.needsTech)) || (k === 'geothermal' && !rg.geothermal); return <option key={k} value={k} disabled={!!locked}>{g.name}{locked ? ' 🔒' : ''}</option> })}</select></Field>
          <Field label="MW"><Num value={gmw} min={1} onChange={setGmw} /></Field>
          {kind === 'battery' && <Field label="MWh"><Num value={gmwh} min={1} onChange={setGmwh} /></Field>}
        </div>
        <button className="btn pri" onClick={() => act((x) => A.buildGenerator(x, siteId, kind, gmw, gmwh), 'Construction started')}>Build · {money(gmw * GENERATORS[kind].usdPerMw + (kind === 'battery' ? gmwh * 280_000 : 0))}</button>
        <p className="dim" style={{ fontSize: 12 }}>Solar/wind: free energy, intermittent. Gas: dispatchable (~$48/MWh fuel) and counts toward hall capacity. Nuclear: baseload, needs licensing. Batteries arbitrage prices and ride through outages.</p>
      </div>
    </div>
  )
}

function HardwareTab({ siteId }: { siteId: string }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const site = w.sites.find((s) => s.id === siteId)!
  const [hallId, setHallId] = useState(site.halls[0]?.id ?? '')
  const stock = Object.entries(site.stock).filter(([, n]) => n > 0)
  const gpuIds = [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId)))]
  void yearOf; void gpuCatalog
  return (
    <div className="col" style={{ gap: 22 }}>
      <div className="panel">
        <h2>Inbound orders</h2>
        {site.orders.length === 0 ? <span className="dim">None. Buy servers in the Fleet tab.</span> : <table><tbody>{site.orders.map((o) => <tr key={o.id}><td>{o.servers} × {gpu(w, o.gpuId).name}</td><td className="r mono">arrives {dateOf(o.arriveTick)}</td></tr>)}</tbody></table>}
      </div>
      <div className="panel col">
        <h2>On the loading dock</h2>
        {stock.length === 0 ? <span className="dim">Nothing in stock.</span> : (
          <>
            <Field label="Install into hall"><select value={hallId} onChange={(e) => setHallId(e.target.value)}>{site.halls.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.cooling}, {h.racks.length}/{h.slots} racks)</option>)}</select></Field>
            <table><tbody>{stock.map(([id, n]) => (
              <tr key={id}><td>{gpu(w, id).name}</td><td className="r mono">{n} servers ({n * 8} GPUs)</td>
                <td className="r"><div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn sm pri" onClick={() => { const r = act((x) => A.installServers(x, siteId, hallId, id, n)); if (r.ok) useGame.getState().flash(`Installed ${r.value} servers`) }}>Install all</button>
                  <button className="btn sm danger" onClick={() => act((x) => A.sellServers(x, siteId, id, n), 'Sold')}>Sell</button>
                </div></td></tr>))}</tbody></table>
          </>
        )}
      </div>
      <div className="panel">
        <h2>Installed fleet</h2>
        <table><thead><tr><th>GPU</th><th className="r">Servers</th><th className="r">GPUs</th><th className="r">Per rack</th><th></th></tr></thead><tbody>
          {gpuIds.map((id) => <tr key={id}><td>{gpu(w, id).name}</td><td className="r mono">{site.halls.reduce((a, h) => a + hallServers(h, id), 0)}</td><td className="r mono">{site.halls.reduce((a, h) => a + hallServers(h, id), 0) * 8}</td>
            <td className="r mono">{site.halls.map((h) => A.maxServersPerRack(w, h, id)).join(' / ')}</td>
            <td className="r">{site.halls.filter((h) => hallServers(h, id) > 0).map((h) => <button key={h.id} className="btn sm" onClick={() => act((x) => A.uninstallServers(x, siteId, h.id, id, 1000), 'Uninstalled to dock')}>pull from {h.name}</button>)}</td></tr>)}
        </tbody></table>
      </div>
    </div>
  )
}

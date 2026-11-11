import { Select } from '../Select'
import { useDraft } from '../draft'
import { Server } from 'lucide-react'
import * as A from '@sim/actions'
import { gpuCatalog, serverPeakKw, GPUS_PER_SERVER, type GpuSpec } from '@sim/data/hardware'
import { RENTAL_KIND, rentalPrice, rentalUtilisation, serverMarketPrice, leadDays } from '@sim/market'
import { vendorDiscount } from '@sim/corporate'
import { gpu, hallServers, committed, yearOf } from '@sim/util'
import type { RentalKind } from '@sim/types'
import { money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Advanced, EmptyState, Field, Num, Summary, Tabs, Term } from '../ui'
import { CorpWordmark, CpuArt, GpuArt } from '../art/Brand'
import { CORPS, RIVAL_HUBS, corp } from '@sim/data/lore'
import { EmptyFleetArt } from '../art/Illustrations'
import * as PV from '@sim/preview'
import * as Sum from '../summaries'
import { ManagerCard } from '../ManagerCard'
import { NodeDesigner } from '../NodeDesigner'
import { orderableNodes } from '@sim/nodes'
import { InProgress } from '../InProgress'
import { WordMark, type LogoGlyph } from '../art/Logos'

export function Fleet() {
  const w = useWorld(); const go = useGame((s) => s.go)
  const [tab, setTab] = useDraft<'buy' | 'cloud'>('fleet.tab.25', 'buy')
  if (!w.sites.length) return <EmptyState art={<EmptyFleetArt />} eyebrow="Fleet · no sites" title="Servers need somewhere to live." body="Buy land and build a hall first. Then come back to order accelerators for AI and CPU servers for VM clouds."><button className="btn pri" onClick={() => go('sites')}>Open Sites</button></EmptyState>
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">GPU market is {w.market.boom > 1.2 ? 'hot' : w.market.boom < 0.85 ? 'cooling' : 'steady'} · new orders arrive in {leadDays(w)} days</div><h1>Fleet & Cloud</h1></div><Tabs tabs={['buy', 'cloud'] as const} value={tab} onChange={setTab} labels={{ buy: 'Buy servers', cloud: 'Rent out & cloud' }} /></div>
      <Summary items={Sum.fleetSummary(w)} />
      <InProgress title="On order" kinds={['delivery']} />
      {tab === 'cloud' && <div style={{ marginBottom: 14 }}><ManagerCard system="sales" /></div>}
      {tab === 'buy' ? <Buy /> : <div className="col" style={{ gap: 14 }}><CloudPools /><RivalClouds /></div>}
    </>
  )
}

function Buy() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [siteId, setSite] = useDraft('fleet.siteId.40', w.sites[0]?.id ?? '')
  const [qty, setQty] = useDraft<Record<string, number>>('fleet.qty.41', {})
  const cat = [...orderableNodes(w), ...gpuCatalog(yearOf(w.tick)).sort((a, b) => b.year - a.year || b.tflops - a.tflops)]
  const card = (g: GpuSpec) => {
    const price = serverMarketPrice(w, g) * (1 - vendorDiscount(w, g.vendor))
    const n = qty[g.id] ?? 8
    return (
      <div key={g.id} className="panel lift col hw-card" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>{g.node ? <span className="row" style={{ gap: 6 }}><WordMark glyph={w.logo.glyph as LogoGlyph} color={w.logo.color} name={w.company.split(' ')[0]} size={14} /><span className="tag b">your design</span></span> : <CorpWordmark id={g.vendor} size={15} />}<span className="row" style={{ gap: 6 }}>{vendorDiscount(w, g.vendor) > 0 && <span className="tag g">subsidiary −45%</span>}<span className="dim" style={{ fontSize: 12 }}>{g.year}</span></span></div>
        <div className="hw-stage" style={{ ['--vc' as string]: corp(g.vendor).color }}>{g.vcpus ? <CpuArt g={g} width={160} /> : <GpuArt g={g} width={160} />}</div>
        <h3>{g.name}</h3>
        <div className="row wrap" style={{ gap: 6, fontSize: 12 }}>
          {g.vcpus ? <><span className="tag">{g.vcpus * 8} vCPU / server</span><span className="tag">{g.memGB * 8} GB RAM</span></> : <><span className="tag">{num(g.tflops)} TFLOPS</span><span className="tag">{g.memGB} GB HBM</span></>}
          <span className="tag">{serverPeakKw(g).toFixed(1)} kW</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="dim">Server</span><b>{money(price)}</b></div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="dim">Rents for</span><b>${(rentalPrice(w, g) * (g.vcpus ? 8 : 1)).toFixed(2)}/{g.vcpus ? 'server' : 'GPU'}·h</b></div>
        <div className="row" style={{ gap: 6 }}><div style={{ width: 80 }}><Num value={n} min={1} onChange={(v) => setQty({ ...qty, [g.id]: v })} /></div>
          <button className="btn sm pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => void useGame.getState().confirmAct(`Buy ${n} ${g.name} server${n === 1 ? '' : 's'}?`, PV.previewSpend(w, price * n), 'Buy', (x) => A.orderServers(x, siteId, g.id, n), { okMsg: 'Order placed' })}>Buy · {money(price * n)}</button></div>
      </div>
    )
  }
  return (
    <div className="col" style={{ gap: 18 }}>
      <Field label="Deliver to"><Select value={siteId} onChange={(e) => setSite(e.target.value)} style={{ maxWidth: 360 }}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <h2><Server size={16} /> Accelerators · 8 per server</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>{cat.filter((g) => !g.vcpus).map(card)}</div>
      <Advanced title="Design your own server node"><NodeDesigner /></Advanced>
      <Advanced title="CPU servers for virtual-machine clouds">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>{cat.filter((g) => g.vcpus).map(card)}</div>
      </Advanced>
    </div>
  )
}

function RivalClouds() {
  const clouds = CORPS.filter((c) => c.kind === 'cloud' || c.focus === 'cloud' || c.focus === 'neocloud')
  return (
    <div className="panel col" style={{ gap: 10 }}>
      <b>Who you're competing with</b>
      <div className="rival-clouds">{clouds.map((c) => <div key={c.id} className="rc"><CorpWordmark id={c.id} size={14} /><span className="dim">{RIVAL_HUBS.filter((h) => h.corp === c.id).length || 'no'} campus{RIVAL_HUBS.filter((h) => h.corp === c.id).length === 1 ? '' : 'es'} · {c.hq}</span><i>“{c.quip}”</i></div>)}</div>
    </div>
  )
}

function CloudPools() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const pools = w.sites.flatMap((s) => [...new Set(s.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))].map((id) => ({ s, id })))
  const spares = w.sites.flatMap((s) => Object.entries(s.stock).filter(([, n]) => n > 0).map(([id, n]) => ({ s, id, n })))
  const sparesPanel = spares.length > 0 && (
    <div className="panel col" style={{ gap: 8 }}>
      <b>Spare servers on the loading dock</b>
      <p className="dim" style={{ fontSize: 12.5 }}>Spares swap in automatically when servers fail. Sell them if you need cash.</p>
      {spares.map(({ s, id, n }) => (
        <div key={s.id + id} className="row" style={{ justifyContent: 'space-between' }}>
          <span>{n} × {gpu(w, id).name} <span className="dim">· {s.name}</span></span>
          <button className="btn sm danger" onClick={() => void useGame.getState().confirmAct(`Sell ${n} spare servers?`, PV.previewSellServers(w, s.id, id, n), 'Sell', (x) => A.sellServers(x, s.id, id, n), { okMsg: 'Servers sold' })}>Sell for {money(A.sellRefund(w, id, n))}</button>
        </div>
      ))}
    </div>
  )
  if (!pools.length) return <div className="col" style={{ gap: 12 }}>{sparesPanel}<p className="dim">Install some servers first (Sites → hall → loading dock).</p></div>
  return (
    <div className="col" style={{ gap: 12 }}>
      {sparesPanel}
      <p className="dim">Rent your servers to the world. <Term k="ondemand">On-demand</Term> follows the market. <Term k="reserved">Reserved</Term> locks a year of steady income at a discount. <Term k="spot">Spot</Term> is always full but cheap.</p>
      {pools.map(({ s, id }) => {
        const g = gpu(w, id)
        const total = s.halls.reduce((a, h) => a + hallServers(h, id), 0)
        const r = w.rentals.find((x) => x.siteId === s.id && x.gpuId === id)
        const free = total - committed(w, s.id, id, r?.id)
        const kind: RentalKind = r?.kind ?? 'ondemand'
        const K = RENTAL_KIND[kind]
        const mult = r?.priceMult ?? 1
        const unitPrice = rentalPrice(w, g) * (kind === 'ondemand' ? mult : K.price)
        const util = K.util ?? rentalUtilisation(w, g, mult)
        const rev = (r?.servers ?? 0) * GPUS_PER_SERVER * unitPrice * util * 24
        return (
          <div key={s.id + id} className="panel" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 180px', gap: 22, alignItems: 'center' }}>
            <div><b>{g.name}</b><div className="dim" style={{ fontSize: 12.5 }}>{s.name} · {total} servers · {free} free{g.vcpus ? ` · ${num(total * 8 * g.vcpus)} vCPU` : ''}</div></div>
            <div className="col" style={{ gap: 8 }}>
              <div className="tabs" style={{ marginBottom: 0 }}>{(Object.keys(RENTAL_KIND) as RentalKind[]).map((k) => <button key={k} className={kind === k ? 'on' : ''} title={RENTAL_KIND[k].blurb} onClick={() => k === 'reserved' && kind !== 'reserved' ? void useGame.getState().confirmAct('Lock in a reserved contract?', { tier: 'severe', lines: ['Customers rent these servers for a full year at a discount', 'You cannot pull them back early', 'Steady income, no price changes'] }, 'Reserve', (x) => A.setRental(x, s.id, id, r?.servers ?? 0, mult, k), { system: 'sales' }) : act((x) => A.setRental(x, s.id, id, r?.servers ?? 0, mult, k), undefined, { system: 'sales' })}>{RENTAL_KIND[k].name}</button>)}</div>
              <div className="row" style={{ gap: 16 }}>
                <Field label={`Servers rented ${r?.servers ?? 0} / ${free}`}><input type="range" min={0} max={free} value={r?.servers ?? 0} onChange={(e) => act((x) => A.setRental(x, s.id, id, +e.target.value, mult, kind), undefined, { system: 'sales' })} /></Field>
                {kind === 'ondemand' && <Field label={`Price ×${mult.toFixed(2)}`}><input type="range" min={0.5} max={1.8} step={0.05} value={mult} onChange={(e) => act((x) => A.setRental(x, s.id, id, r?.servers ?? 0, +e.target.value, kind), undefined, { system: 'sales' })} /></Field>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="dim" style={{ fontSize: 12.5 }}>{g.vcpus ? `$${(unitPrice / g.vcpus).toFixed(3)}/vCPU·h` : `$${unitPrice.toFixed(2)}/GPU·h`} · {(util * 100).toFixed(0)}% busy</div>
              <div style={{ fontSize: 22, fontWeight: 650 }}>{money(rev)}<span className="dim" style={{ fontSize: 13, fontWeight: 500 }}>/day</span></div>
              {r?.reservedUntil && r.reservedUntil > w.tick && <span className="tag b">locked {Math.ceil((r.reservedUntil - w.tick) / 24)}d</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

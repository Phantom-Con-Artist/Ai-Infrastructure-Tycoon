import { useState } from 'react'
import { Cpu, Server } from 'lucide-react'
import * as A from '@sim/actions'
import { gpuCatalog, serverPeakKw, GPUS_PER_SERVER, type GpuSpec } from '@sim/data/hardware'
import { RENTAL_KIND, rentalPrice, rentalUtilisation, serverMarketPrice, leadDays } from '@sim/market'
import { vendorDiscount } from '@sim/corporate'
import { gpu, hallServers, committed, yearOf } from '@sim/util'
import type { RentalKind } from '@sim/types'
import { money, num } from '../format'
import { useGame, useWorld } from '../store'
import { EmptyState, Field, Num, Tabs } from '../ui'
import { GpuArt } from '../art/GpuArt'
import { CorpLogo } from '../art/Logos'
import { EmptyFleetArt } from '../art/Illustrations'

export function Fleet() {
  const w = useWorld(); const go = useGame((s) => s.go)
  const [tab, setTab] = useState<'buy' | 'cloud'>('buy')
  if (!w.sites.length) return <EmptyState art={<EmptyFleetArt />} eyebrow="Fleet · no sites" title="Servers need somewhere to live." body="Buy land and build a hall first. Then come back to order accelerators for AI and CPU servers for VM clouds."><button className="btn pri" onClick={() => go('sites')}>Open Sites</button></EmptyState>
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">Lead time {leadDays(w)} days · supply tightness {w.market.supplyTight.toFixed(2)} · AI boom {w.market.boom.toFixed(2)}</div><h1>Fleet & Cloud</h1></div><Tabs tabs={['buy', 'cloud'] as const} value={tab} onChange={setTab} /></div>
      {tab === 'buy' ? <Buy /> : <CloudPools />}
    </>
  )
}

function Buy() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [siteId, setSite] = useState(w.sites[0]?.id ?? '')
  const [qty, setQty] = useState<Record<string, number>>({})
  const cat = gpuCatalog(yearOf(w.tick)).sort((a, b) => b.year - a.year || b.tflops - a.tflops)
  const card = (g: GpuSpec) => {
    const price = serverMarketPrice(w, g) * (1 - vendorDiscount(w, g.vendor))
    const n = qty[g.id] ?? 8
    return (
      <div key={g.id} className="panel lift col" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="row" style={{ gap: 8 }}><CorpLogo id={g.vendor} size={24} /><span className="dim" style={{ fontSize: 12 }}>{g.year}</span></span>{vendorDiscount(w, g.vendor) > 0 && <span className="tag g">subsidiary −45%</span>}</div>
        {g.vcpus ? <div style={{ height: 88, display: 'grid', placeItems: 'center' }}><Cpu size={56} strokeWidth={1.2} /></div> : <GpuArt g={g} width={150} />}
        <h3>{g.name}</h3>
        <div className="row wrap" style={{ gap: 6, fontSize: 12 }}>
          {g.vcpus ? <><span className="tag">{g.vcpus * 8} vCPU / server</span><span className="tag">{g.memGB * 8} GB RAM</span></> : <><span className="tag">{num(g.tflops)} TFLOPS</span><span className="tag">{g.memGB} GB HBM</span></>}
          <span className="tag">{serverPeakKw(g).toFixed(1)} kW</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="dim">Server</span><b>{money(price)}</b></div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="dim">Rents for</span><b>${(rentalPrice(w, g) * (g.vcpus ? 8 : 1)).toFixed(2)}/{g.vcpus ? 'server' : 'GPU'}·h</b></div>
        <div className="row" style={{ gap: 6 }}><div style={{ width: 80 }}><Num value={n} min={1} onChange={(v) => setQty({ ...qty, [g.id]: v })} /></div>
          <button className="btn sm pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => act((x) => A.orderServers(x, siteId, g.id, n), 'Order placed')}>Buy · {money(price * n)}</button></div>
      </div>
    )
  }
  return (
    <div className="col" style={{ gap: 18 }}>
      <Field label="Deliver to"><select value={siteId} onChange={(e) => setSite(e.target.value)} style={{ maxWidth: 360 }}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <h2><Server size={16} /> Accelerators · 8 per server</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>{cat.filter((g) => !g.vcpus).map(card)}</div>
      <h2><Cpu size={16} /> CPU servers · for VM clouds</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>{cat.filter((g) => g.vcpus).map(card)}</div>
    </div>
  )
}

function CloudPools() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const pools = w.sites.flatMap((s) => [...new Set(s.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))].map((id) => ({ s, id })))
  if (!pools.length) return <p className="dim">Install some servers first (Sites → hall → loading dock).</p>
  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="dim">Rent your servers to the world. On-demand follows the market. Reserved locks a year of steady income at a discount. Spot is always full but cheap.</p>
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
              <div className="tabs" style={{ marginBottom: 0 }}>{(Object.keys(RENTAL_KIND) as RentalKind[]).map((k) => <button key={k} className={kind === k ? 'on' : ''} title={RENTAL_KIND[k].blurb} onClick={() => act((x) => A.setRental(x, s.id, id, r?.servers ?? 0, mult, k))}>{RENTAL_KIND[k].name}</button>)}</div>
              <div className="row" style={{ gap: 16 }}>
                <Field label={`Servers rented ${r?.servers ?? 0} / ${free}`}><input type="range" min={0} max={free} value={r?.servers ?? 0} onChange={(e) => act((x) => A.setRental(x, s.id, id, +e.target.value, mult, kind))} /></Field>
                {kind === 'ondemand' && <Field label={`Price ×${mult.toFixed(2)}`}><input type="range" min={0.5} max={1.8} step={0.05} value={mult} onChange={(e) => act((x) => A.setRental(x, s.id, id, r?.servers ?? 0, +e.target.value, kind))} /></Field>}
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

import { useState } from 'react'
import * as A from '@sim/actions'
import { gpuCatalog, serverPeakKw, GPUS_PER_SERVER } from '@sim/data/hardware'
import { rentalPrice, rentalUtilisation, serverMarketPrice, leadDays } from '@sim/market'
import { gpu, hallServers, committed, yearOf } from '@sim/util'
import { VENDOR_COLOR } from '../vendors'
import { money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Field, Head, Num } from '../ui'
import { corp } from '@sim/data/lore'

export function Fleet() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [siteId, setSite] = useState(w.sites[0]?.id ?? '')
  const [qty, setQty] = useState<Record<string, number>>({})
  const cat = gpuCatalog(yearOf(w.tick)).sort((a, b) => b.year - a.year || b.tflops - a.tflops)
  const site = w.sites.find((s) => s.id === siteId)
  return (
    <>
      <Head title="Fleet & Cloud" sub={`Order servers (8 GPUs each), then rent them out on the open market. Lead time right now: ${leadDays(w)} days. Supply tightness ${w.market.supplyTight.toFixed(2)}, AI boom index ${w.market.boom.toFixed(2)}.`}
        right={<Field label="Deliver to"><select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>} />
      <h2>Silicon catalogue</h2>
      <div className="panel" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Accelerator</th><th>Vendor</th><th className="r">BF16 TFLOPS</th><th className="r">HBM</th><th className="r">TDP</th><th className="r">Server kW</th><th className="r">Server price</th><th className="r">Cloud $/GPU·h</th><th className="r">Order servers</th></tr></thead>
          <tbody>
            {cat.map((g) => (
              <tr key={g.id}>
                <td><b>{g.name}</b> <span className="dim mono" style={{ fontSize: 11 }}>{g.year}</span></td>
                <td style={{ color: VENDOR_COLOR[g.vendor] ?? 'inherit' }}>{corp(g.vendor).name}</td>
                <td className="r mono">{num(g.tflops)}</td><td className="r mono">{g.memGB} GB</td><td className="r mono">{g.tdpW} W</td>
                <td className="r mono">{serverPeakKw(g).toFixed(1)}</td>
                <td className="r mono">{money(serverMarketPrice(w, g))}</td>
                <td className="r mono">${rentalPrice(w, g).toFixed(2)}</td>
                <td className="r"><div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                  <div style={{ width: 76 }}><Num value={qty[g.id] ?? 8} min={1} onChange={(n) => setQty({ ...qty, [g.id]: n })} /></div>
                  <button className="btn sm pri" disabled={!site} onClick={() => act((x) => A.orderServers(x, siteId, g.id, qty[g.id] ?? 8), 'Order placed')}>Buy · {money(serverMarketPrice(w, g) * (qty[g.id] ?? 8))}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="gap-l">Cloud rental pools</h2>
      <p className="dim" style={{ marginBottom: 12 }}>Servers you allocate here are rented on the spot market. Higher price multiplier = more $/hour but lower utilisation.</p>
      <div className="col">
        {w.sites.map((s) => {
          const ids = [...new Set(s.halls.flatMap((h) => h.racks.map((r) => r.gpuId)))]
          return ids.map((id) => {
            const g = gpu(w, id)
            const total = s.halls.reduce((a, h) => a + hallServers(h, id), 0)
            const r = w.rentals.find((x) => x.siteId === s.id && x.gpuId === id)
            const other = committed(w, s.id, id, r?.id)
            const free = total - other
            const mult = r?.priceMult ?? 1
            const util = rentalUtilisation(w, g, mult)
            const rev = (r?.servers ?? 0) * GPUS_PER_SERVER * rentalPrice(w, g) * mult * util * 24
            return (
              <div key={s.id + id} className="panel row" style={{ gap: 24 }}>
                <div style={{ width: 240 }}><b>{g.name}</b><div className="dim" style={{ fontSize: 12 }}>{s.name} · {total} servers · {free} free</div></div>
                <Field label={`Servers rented: ${r?.servers ?? 0}`}><input type="range" min={0} max={free} value={r?.servers ?? 0} onChange={(e) => act((x) => A.setRental(x, s.id, id, +e.target.value, mult))} /></Field>
                <Field label={`Price ×${mult.toFixed(2)}`}><input type="range" min={0.5} max={1.8} step={0.05} value={mult} onChange={(e) => act((x) => A.setRental(x, s.id, id, r?.servers ?? 0, +e.target.value))} /></Field>
                <div className="mono" style={{ textAlign: 'right', minWidth: 160 }}>${(rentalPrice(w, g) * mult).toFixed(2)}/GPU·h<br /><span className={util > 0.6 ? 'pos' : 'warn'}>{(util * 100).toFixed(0)}% utilised</span><br /><b>{money(rev)}/day</b></div>
              </div>
            )
          })
        })}
        {w.sites.every((s) => s.halls.every((h) => h.racks.length === 0)) && <p className="dim">Install some servers first (Sites → hardware).</p>}
      </div>
    </>
  )
}
